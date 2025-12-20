from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from pydantic import BaseModel
from typing import List, Optional, Union
import os
import json
import vertexai
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
    kpi_id: str
    name: str
    value: Union[str, int, float]
    unit: str
    date: str
    confidence: float

class ExtractionResponse(BaseModel):
    candidates: List[ExtractedCandidate]

@router.post("/data/smart-extract", response_model=ExtractionResponse)
async def smart_extract(file: UploadFile = File(...), user=Depends(verify_token)):
    """
    Analyzes an uploaded file (PDF/Excel) using Gemini (Vertex AI) to extract likely CSRD data points.
    """
    
    # 1. Read File Content
    content_text = ""
    filename = file.filename.lower()
    
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
        Return a JSON array of objects with the following keys:
        - kpi_id: The likely ESRS KPI ID (e.g., E1-1, S1-1). Guess if not explicit.
        - name: A short descriptive name of the data point.
        - value: The numerical value extracted.
        - unit: The unit of measurement (e.g., tCO2e, %, EUR).
        - date: The date associated with the data point (YYYY-MM-DD). If not found, use context or today.
        - confidence: A float between 0.0 and 1.0 indicating your confidence.

        Only return Valid JSON. No markdown formatting.
        
        Document Snippet:
        {content_text[:10000]} 
        """
        # Limit prompt context for speed/cost in MVP

        response = model.generate_content(prompt)
        
        # Clean response (remove markdown code blocks if any)
        text_response = response.text.replace('```json', '').replace('```', '').strip()
        print(f"DEBUG: Raw Gemini response: {text_response}")
        
        try:
            candidates = json.loads(text_response)
        except json.JSONDecodeError:
            print("DEBUG: JSON Decode Error")
            candidates = []
        
        # Ensure format match
        valid_candidates = []
        for c in candidates:
            try:
                valid_candidates.append(ExtractedCandidate(**c))
            except Exception as e:
                print(f"DEBUG: Candidate validation failed: {e} for {c}")
                continue
        
        print(f"DEBUG: Returning {len(valid_candidates)} candidates")
        return {"candidates": valid_candidates}

    except Exception as e:
        print(f"Gemini Error: {e}")
        raise HTTPException(status_code=500, detail=f" AI Analysis failed: {str(e)}")
