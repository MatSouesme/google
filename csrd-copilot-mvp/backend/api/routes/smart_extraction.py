from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from pydantic import BaseModel
from typing import List, Optional, Union
import os
import json
import uuid
import vertexai
from google.cloud import bigquery
from vertexai.generative_models import GenerativeModel
from pypdf import PdfReader
from io import BytesIO, StringIO
import csv
import openpyxl

# Fix import path for Docker environment
try:
    from backend.api.utils.auth import verify_token
except ImportError:
    from utils.auth import verify_token

router = APIRouter()

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

@router.post("/data/smart-extract", response_model=ExtractionResponse)
async def smart_extract(file: UploadFile = File(...), user=Depends(verify_token)):
    """
    Analyzes an uploaded file (PDF/Excel) using Gemini (Vertex AI) to extract likely CSRD data points.
    Also saves the document content for RAG search.
    """
    
    # 1. Read File Content
    content_text = ""
    filename = file.filename.lower()
    upload_id = str(uuid.uuid4())
    
    try:
        if filename.endswith('.pdf'):
            # Extract text from PDF
            contents = await file.read()
            pdf_file = BytesIO(contents)
            reader = PdfReader(pdf_file)
            for page in reader.pages:
                content_text += page.extract_text() + "\n"
                # Limit to first 20 pages for MVP to avoid token limits/latency
                if len(content_text) > 50000: 
                    break
                    
        elif filename.endswith('.xlsx') or filename.endswith('.csv'):
            # Extract text from Excel/CSV (Turn into CSV string)
            contents = await file.read()
            
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
            return {"candidates": [], "upload_id": upload_id, "error": "Unsupported file format. Please upload PDF, XLSX, or CSV."}

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
        
        prompt = base_prompt + content_text[:10000]
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
        
        # 3. Save Document Content for RAG (Chat with Documents)
        try:
            bq_client = bigquery.Client(project=project_id)
            # Ensure table exists (simple check for MVP)
            # In prod, use a migration script. Here we just try insert.
            
            rows_to_insert = [{
                "document_id": str(uuid.uuid4()),
                "upload_id": upload_id,
                "filename": file.filename,
                "content_text": content_text[:50000] # Limit for BQ cell size/cost
            }]
            
            # We assume the table csrd_mvp.documents_content exists (created via SQL script)
            # If not, we might want to create it on the fly or fail silently for MVP
            errors = bq_client.insert_rows_json(f"{project_id}.csrd_mvp.documents_content", rows_to_insert)
            if errors:
                print(f"BQ Insert Errors: {errors}")
                
        except Exception as e:
            print(f"Failed to save document content: {e}")

        return {"candidates": candidates_json, "upload_id": upload_id}

    except Exception as e:
        print(f"Smart Extract Error: {e}")
        # Return empty list instead of 500 to avoid CORS issues on frontend if AI fails
        return {"candidates": [], "upload_id": upload_id, "error": str(e)}
