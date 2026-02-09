from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from pydantic import BaseModel
from typing import List, Optional, Union
import os
import json
import uuid
import vertexai
from google.cloud import bigquery, storage
from vertexai.generative_models import GenerativeModel, Part
from pypdf import PdfReader
from io import BytesIO, StringIO
import csv
import openpyxl
import datetime

# Fix import path for Docker environment
try:
    from backend.api.utils.auth import get_current_user
    from backend.api.utils.rbac import UserProfile, Role
    from backend.api.services.lineage_service import LineageService
except ImportError:
    from utils.auth import get_current_user
    from utils.rbac import UserProfile, Role
    from services.lineage_service import LineageService

router = APIRouter()
lineage_service = LineageService()

class ExtractedCandidate(BaseModel):
    kpi_id: Optional[str] = "Unknown"
    name: Optional[str] = "Unknown Data Point"
    value: Union[str, int, float, None] = None
    unit: Optional[str] = None
    date: Optional[str] = None
    confidence: Optional[float] = 0.0
    page_number: Optional[int] = 1
    snippet: Optional[str] = None

class ExtractionResponse(BaseModel):
    candidates: List[ExtractedCandidate]
    upload_id: str
    error: Optional[str] = None

@router.get("/data/smart-extract-test")
def test_endpoint():
    return {"status": "ok", "message": "Smart extraction router is reachable"}

@router.post("/data/smart-extract", response_model=ExtractionResponse)
async def smart_extract(file: UploadFile = File(...), user: UserProfile = Depends(get_current_user)):
    """
    Analyzes an uploaded file (PDF/Excel/Images) using Gemini (Vertex AI) to extract likely CSRD data points.
    Supports multimodal inputs (images, scanned PDFs) via native Vertex AI capabilities.
    """
    if user.role not in [Role.ADMIN, Role.EDITOR]:
         raise HTTPException(status_code=403, detail="Insufficient permissions. Only Editors and Admins can perform smart extraction.")

    print(f"Received smart-extract request: {file.filename}")
    
    # 1. Read File Content
    content_text = ""
    file_part = None
    is_multimodal = False
    
    filename = file.filename.lower()
    content_type = file.content_type
    upload_id = str(uuid.uuid4())
    
    # Read raw bytes once
    contents = await file.read()
    
    # 2. Upload to GCS (Native Document Storage)
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "csrd-copilot")
    try:
        storage_client = storage.Client(project=project_id)
        bucket_name = f"{project_id}-csrd-raw-data"
        # Ensure bucket exists (optional, or assume created by setup script)
        # We wrap this in try-catch to avoid crashing if permissions are missing
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(f"smart_imports/{upload_id}/{filename}")
        
        # Determine content type safely
        safe_content_type = content_type if content_type else "application/octet-stream"
        
        # Run synchronous upload in a way that doesn't block too much (fast for small files)
        blob.upload_from_string(contents, content_type=safe_content_type)
        print(f"Uploaded {filename} to GCS: gs://{bucket_name}/smart_imports/{upload_id}/{filename}")
    except Exception as e:
        print(f"GCS Upload Warning (Non-fatal): {e}")

    try:
        # --- MULTIMODAL HANDLING (Images & PDFs) ---
        if filename.endswith('.pdf') or content_type == 'application/pdf' or \
           filename.endswith(('.png', '.jpg', '.jpeg', '.webp')) or \
           content_type.startswith('image/'):
            
            is_multimodal = True
            mime_type = "application/pdf" if filename.endswith('.pdf') else content_type or "image/jpeg"
            
            # Create a Part object for Gemini
            file_part = Part.from_data(data=contents, mime_type=mime_type)
            content_text = f"[Multimodal File Uploaded: {filename}]" 
            
            # For RAG purely based on text, we might still want traditional extraction as backup
            # But for "Smart Extraction", we rely on Vision.
            
        # --- TEXT/DATA HANDLING (Excel, CSV, txt) ---
        elif filename.endswith('.xlsx') or filename.endswith('.csv') or filename.endswith('.txt'):
            
            if filename.endswith('.xlsx'):
                # Use openpyxl for Excel
                wb = openpyxl.load_workbook(BytesIO(contents), data_only=True)
                
                # Convert to CSV string (Iterate over ALL visible sheets)
                output = StringIO()
                writer = csv.writer(output)
                
                for sheet in wb.worksheets:
                    # Skip hidden sheets
                    if sheet.sheet_state != 'visible':
                        continue
                        
                    writer.writerow([f"--- Sheet: {sheet.title} ---"]) # Context for AI
                    
                    for row in sheet.iter_rows(values_only=True):
                        # Skip completely empty rows to save context window
                        if any(cell is not None for cell in row):
                            # Replace None with empty string
                            clean_row = [str(cell) if cell is not None else "" for cell in row]
                            writer.writerow(clean_row)
                            
                content_text = output.getvalue()
                
            elif filename.endswith('.txt'):
                 content_text = contents.decode('utf-8', errors='replace')
                 # Ensure content is not empty
                 if not content_text.strip():
                     content_text = "[Empty Text File]"

            else:
                # Use csv module for CSV
                # Try to decode with utf-8, fallback to latin-1 (common in Europe)
                try:
                    text_content = contents.decode('utf-8')
                except UnicodeDecodeError:
                    text_content = contents.decode('latin-1', errors='replace')
                
                # Try to normalize CSV to standard comma-separated format to help the AI
                try:
                    # Use StringIO to treat string as file
                    f = StringIO(text_content)
                    # Sniff the dialect (delimiter) - read a sample
                    sample = f.read(2048)
                    f.seek(0)
                    
                    if len(sample) > 0:
                        dialect = csv.Sniffer().sniff(sample)
                        reader = csv.reader(f, dialect)
                        output = StringIO()
                        writer = csv.writer(output)
                        for row in reader:
                            writer.writerow(row)
                        content_text = output.getvalue()
                    else:
                        content_text = text_content
                except Exception as csv_e:
                    print(f"CSV Parsing Warning: {csv_e}. Using raw content.")
                    # Fallback to raw content if sniffing fails
                    content_text = text_content
            
            if len(content_text) > 50000:
                content_text = content_text[:50000] # Truncate

        else:
            # Return error instead of raising HTTPException to avoid CORS masking
            return {"candidates": [], "upload_id": upload_id, "error": "Unsupported file format. Please upload PDF, XLSX, CSV, PNG, JPG, or TXT."}

    except Exception as e:
        print(f"Error reading file: {str(e)}")
        # Return error in response instead of 500 to avoid CORS issues
        return {"candidates": [], "upload_id": upload_id, "error": f"Error reading file: {str(e)}"}

    # 2. Call Gemini via Vertex AI
    try:
        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "csrd-copilot")
        print(f"Initializing Vertex AI with project={project_id}, location=us-central1")
        
        try:
            # Initialize Vertex AI (us-central1 often has better model availability for Gemini)
            vertexai.init(project=project_id, location="us-central1")
            model = GenerativeModel("gemini-2.0-flash-lite-001")
        except Exception as e:
            print(f"Vertex AI Init Error: {e}")
            return {"candidates": [], "upload_id": upload_id, "error": f"AI Initialization Failed: {str(e)}"}

        # Load KPI definitions for better mapping
        kpi_reference = ""
        try:
            # Path relative to this file: ../data/kpis.json
            json_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'kpis.json')
            with open(json_path, 'r', encoding='utf-8') as f:
                kpis_data = json.load(f)
                # Create a compact list: "ID: Name (Unit)"
                kpi_lines = [f"- {k['id']}: {k['name']} (Unit: {k.get('unit', 'N/A')})" for k in kpis_data]
                kpi_reference = "\n".join(kpi_lines)
        except Exception as e:
            print(f"Warning: Could not load KPI definitions: {e}")
            kpi_reference = "- E1: Climate Change\n- S1: Own Workforce\n- G1: Business Conduct"

        # Use concatenation instead of f-string for content_text to avoid issues with curly braces in the document
        base_prompt = """
        You are an expert ESG Data Analyst. Analyze the following document snippet and extract potential CSRD quantitative data points.
        
        Your goal is to map the extracted data to the official ESRS (European Sustainability Reporting Standards) KPI IDs.
        
        Here is the OFFICIAL LIST of ESRS KPIs you must match against. 
        Use the 'ID' from this list exactly.
        If the data point matches a description in this list, use that ID.
        
        OFFICIAL KPI LIST:
        """ + kpi_reference + """

        Instructions:
        1. Identify quantitative data points (values, units, dates).
        2. SEARCH the "OFFICIAL KPI LIST" above for the best semantic match based on the data point's description.
           - Example: If text says "Carbon pricing scheme", match it to "E1-8-1: Carbon pricing scheme by type".
           - Example: If text says "Water usage", match it to "E3-4-1".
        3. If you find a match, use the EXACT ID from the list.
        4. If no exact match is found, infer the most likely category (e.g., "E1", "G1") and use a generic ID like "E1-Other".
        5. Assign a confidence score (0.0 to 1.0). High confidence (0.9+) if you matched a specific ID from the list.

        Return a JSON array of objects with the following keys:
        - kpi_id: The likely ESRS KPI ID.
        - name: A short descriptive name of the data point.
        - value: The numerical value extracted.
        - unit: The unit of measurement (e.g., tCO2e, %, EUR).
        - date: The date or year associated with the data point.
        - confidence: A float between 0.0 and 1.0 indicating confidence.
        - page_number: The page number where found (integer). Default to 1 if unknown.
        - snippet: A short text excerpt (max 100 chars) surrounding the value to serve as proof.

        Only return Valid JSON. No markdown formatting.
        
        Document Snippet:
        """
        
        if is_multimodal and file_part:
             # Multimodal Request (Text + Image/PDF)
             print(f"Sending Multimodal Request for {filename}...")
             prompt_parts = [base_prompt, file_part]
             response = model.generate_content(prompt_parts)
        else:
             # Text Only Request
             # Ensure content_text is treated safely
             safe_content = content_text[:10000] if content_text else "[No Content]"
             prompt = base_prompt + "\nDocument Content:\n" + safe_content
             # Limit prompt context for speed/cost in MVP
             response = model.generate_content(prompt)
        
        # Clean response (remove markdown code blocks if any)
        text_response = response.text.replace('```json', '').replace('```', '').strip()
        try:
            candidates_json = json.loads(text_response)
            if isinstance(candidates_json, dict):
                candidates_json = [candidates_json]
            elif not isinstance(candidates_json, list):
                candidates_json = []
            
            # --- TYPE NORMALIZATION STEP ---
            # Ensure all fields match expected types (Gemini sometimes returns int instead of str)
            for candidate in candidates_json:
                # Convert date to string if it's an int (e.g., 2024 -> "2024")
                if 'date' in candidate and candidate['date'] is not None:
                    candidate['date'] = str(candidate['date'])
                # Convert page_number to int if it's a string
                if 'page_number' in candidate and candidate['page_number'] is not None:
                    try:
                        candidate['page_number'] = int(candidate['page_number'])
                    except (ValueError, TypeError):
                        candidate['page_number'] = 1
                # Ensure confidence is a float
                if 'confidence' in candidate and candidate['confidence'] is not None:
                    try:
                        candidate['confidence'] = float(candidate['confidence'])
                    except (ValueError, TypeError):
                        candidate['confidence'] = 0.0
                # Ensure value is properly typed (can be str, int, or float)
                # Leave as is since Union type accepts multiple types
                
            # --- VALIDATION & CLEANING STEP ---
            # Ensure extracted IDs match our official list
            if 'kpis_data' in locals() and kpis_data:
                valid_ids = {k['id'] for k in kpis_data}
                
                for candidate in candidates_json:
                    raw_id = str(candidate.get('kpi_id', '')).strip()
                    
                    # 1. Exact match
                    if raw_id in valid_ids:
                        candidate['kpi_id'] = raw_id
                        continue
                        
                    # 2. Try to clean common AI formatting (e.g. "E1-1-1: OpEx" or "E1- 1 - 1")
                    # Remove spaces inside the ID if it looks like a standard ID
                    cleaned_id = raw_id.replace(" ", "")
                    if cleaned_id in valid_ids:
                        candidate['kpi_id'] = cleaned_id
                        continue
                        
                    # 3. Try to split by colon or space (e.g. "E1-1-1: Description")
                    potential_id = raw_id.split(':')[0].strip()
                    if potential_id in valid_ids:
                        candidate['kpi_id'] = potential_id
                        continue
                        
                    # 4. If still invalid, try to find by Name if possible, or leave as is
                    # (We leave it as is, but user will see it's not mapped in UI)
                    print(f"Warning: AI extracted ID '{raw_id}' not found in official list.")
                    
        except json.JSONDecodeError:
            candidates_json = []
        
        # 3. Record Lineage for each extracted candidate
        gcs_url = f"gs://{bucket_name}/smart_imports/{upload_id}/{filename}"
        for candidate in candidates_json:
            lineage_id = str(uuid.uuid4())
            lineage_service.record_lineage(
                lineage_id=lineage_id,
                kpi_id=candidate.get('kpi_id', 'UNKNOWN'),
                value=str(candidate.get('value', '')),
                source_type='pdf' if filename.endswith('.pdf') else 'excel' if filename.endswith(('.xlsx', '.xls')) else 'other',
                user_email=user.email,
                unit=candidate.get('unit'),
                date=candidate.get('date'),
                source_filename=filename,
                source_url=gcs_url,
                page_number=candidate.get('page_number'),
                snippet=candidate.get('snippet'),
                confidence=candidate.get('confidence'),
                upload_id=upload_id,
            )
        
        # 4. Save Document Content for RAG (Chat with Documents)
        try:
            bq_client = bigquery.Client(project=project_id)
            table_id = f"{project_id}.csrd_mvp.documents_content"

            # Check if table exists, if not create it (Auto-Schema)
            try:
                bq_client.get_table(table_id)
            except Exception:
                print(f"Table {table_id} not found. Creating it...")
                schema = [
                    bigquery.SchemaField("document_id", "STRING"),
                    bigquery.SchemaField("upload_id", "STRING"),
                    bigquery.SchemaField("filename", "STRING"),
                    bigquery.SchemaField("content_text", "STRING"),
                    bigquery.SchemaField("ingestion_timestamp", "TIMESTAMP"),
                ]
                table = bigquery.Table(table_id, schema=schema)
                bq_client.create_table(table)
                print(f"Created table {table_id}")

            rows_to_insert = [{
                "document_id": str(uuid.uuid4()),
                "upload_id": upload_id,
                "filename": file.filename,
                "content_text": content_text[:50000], # Limit for BQ cell size/cost
                "ingestion_timestamp": datetime.datetime.now().isoformat()
            }]
            
            errors = bq_client.insert_rows_json(table_id, rows_to_insert)
            if errors:
                print(f"BQ Insert Errors: {errors}")
                
        except Exception as e:
            print(f"Failed to save document content: {e}")

        return {"candidates": candidates_json, "upload_id": upload_id}

    except Exception as e:
        print(f"Smart Extract Error: {e}")
        # Return empty list instead of 500 to avoid CORS issues on frontend if AI fails
        return {"candidates": [], "upload_id": upload_id, "error": str(e)}
