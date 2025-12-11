from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from pydantic import BaseModel
from typing import List, Optional
import os
import json
import google.generativeai as genai
from pypdf import PdfReader
from io import BytesIO
import pandas as pd

# Fix import path for Docker environment
try:
    from backend.api.utils.auth import verify_token
except ImportError:
    from utils.auth import verify_token

router = APIRouter()

class ExtractedCandidate(BaseModel):
    kpi_id: str
    name: str
    value: str
    unit: str
    date: str
    confidence: float

class ExtractionResponse(BaseModel):
    candidates: List[ExtractedCandidate]

@router.post("/data/smart-extract", response_model=ExtractionResponse)
async def smart_extract(file: UploadFile = File(...), user=Depends(verify_token)):
    """
    Analyzes an uploaded file (PDF/Excel) using Gemini to extract likely CSRD data points.
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
                df = pd.read_excel(BytesIO(contents))
            else:
                df = pd.read_csv(BytesIO(contents))
            
            content_text = df.to_csv(index=False)
            if len(content_text) > 50000:
                content_text = content_text[:50000] # Truncate

        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF, XLSX, or CSV.")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")

    # 2. Call Gemini
    try:
        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
             # Fallback mock for demo if no API key
             print("Warning: GOOGLE_API_KEY not set. Returning mock data.")
             return {
                 "candidates": [
                     {"kpi_id": "E1-1", "name": "Scope 1 GHG Emissions", "value": "12540", "unit": "tCO2e", "date": "2023-12-31", "confidence": 0.95},
                     {"kpi_id": "S1-1", "name": "Total Employees", "value": "450", "unit": "FTE", "date": "2023-12-31", "confidence": 0.88},
                     {"kpi_id": "G1-1", "name": "Board Diversity", "value": "40", "unit": "%", "date": "2023-12-31", "confidence": 0.72}
                 ]
             }

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-pro')

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
        
        candidates = json.loads(text_response)
        
        # Ensure format match
        valid_candidates = []
        for c in candidates:
            try:
                valid_candidates.append(ExtractedCandidate(**c))
            except Exception:
                continue
                
        return {"candidates": valid_candidates}

    except Exception as e:
        print(f"Gemini Error: {e}")
        # Return empty or mock on error for resilience
        raise HTTPException(status_code=500, detail=f" AI Analysis failed: {str(e)}")
