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
                sheet = wb.active
                
                # Convert to CSV string
                output = StringIO()
                writer = csv.writer(output)
                for row in sheet.iter_rows(values_only=True):
                    writer.writerow(row)
                content_text = output.getvalue()
                
            else:
                # Use csv module for CSV
                # Decode bytes to string
                text_content = contents.decode('utf-8', errors='replace')
                content_text = text_content
            
            if len(content_text) > 50000:
                content_text = content_text[:50000] # Truncate

        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF, XLSX, or CSV.")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")

    # 2. Call Gemini via Vertex AI
    try:
        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "csrd-copilot")
        print(f"Initializing Vertex AI with project={project_id}, location=us-central1")
        # Initialize Vertex AI (us-central1 often has better model availability for Gemini)
        vertexai.init(project=project_id, location="us-central1")
        
        model = GenerativeModel("gemini-2.0-flash-lite-001")

        prompt = f"""
        You are an expert ESG Data Analyst. Analyze the following document snippet and extract potential CSRD quantitative data points.
        
        Your goal is to map the extracted data to the official ESRS (European Sustainability Reporting Standards) KPI IDs.
        
        Reference for Mapping:
        - E1: Climate Change (e.g., E1-1 Transition plan, E1-6 Gross Scopes 1, 2, 3 GHG emissions)
        - E2: Pollution
        - E3: Water and marine resources
        - E4: Biodiversity and ecosystems
        - E5: Resource use and circular economy
        - S1: Own workforce (e.g., S1-1 Policies, S1-14 Health & Safety)
        - S2: Workers in the value chain
        - S3: Affected communities
        - S4: Consumers and end-users
        - G1: Business conduct (e.g., G1-1 Corporate culture, G1-3 Prevention of corruption/bribery, G1-4 Confirmed incidents of corruption)

        Instructions:
        1. Identify quantitative data points (values, units, dates).
        2. Look for explicit KPI IDs (e.g., "G1-3-1") in the text/table. If found, use them.
        3. If no ID is found, infer the most likely ESRS KPI ID based on the "Metric Name" or description.
           - Example: "Anti-corruption training coverage" -> "G1-3" or "G1-3-1".
           - Example: "Scope 1 Emissions" -> "E1-6".
        4. If you are unsure, use the top-level category (e.g., "E1", "G1").
        5. Assign a confidence score (0.0 to 1.0). If you inferred the ID without explicit mention, lower the confidence slightly (e.g., 0.8).

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
        {content_text[:10000]} 
        """
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
