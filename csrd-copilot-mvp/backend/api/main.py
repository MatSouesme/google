import os
import datetime
import uuid
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import storage
from google.cloud import bigquery
from pydantic import BaseModel

# Fix import path for Docker environment
try:
    from backend.api.routes import generate_draft, workflow
except ImportError:
    from routes import generate_draft, workflow

app = FastAPI(title="CSRD Copilot API")

# Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (for development)
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.on_event("startup")
async def startup_event():
    print(">>> API STARTUP: VERSION 2.2 - WITH WORKFLOW <<<")

# Include the new routers
app.include_router(generate_draft.router)
app.include_router(workflow.router)

# Configuration
PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "csrd-copilot") # Default for local dev
BUCKET_NAME = f"{PROJECT_ID}-csrd-raw-data"
REGION = "europe-west1"

# Initialize Clients
try:
    storage_client = storage.Client()
    bq_client = bigquery.Client()
except Exception as e:
    print(f"Warning: Could not initialize GCP clients: {e}")
    storage_client = None
    bq_client = None

class UploadResponse(BaseModel):
    upload_id: str
    filename: str
    message: str

@app.get("/")
def read_root():
    return {"message": "CSRD Copilot API is running"}

@app.post("/upload-data", response_model=UploadResponse)
async def upload_data(file: UploadFile = File(...)):
    """
    Uploads a file to GCS.
    """
    if not storage_client:
        raise HTTPException(status_code=500, detail="Storage client not initialized")

    filename = file.filename
    if not filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    # Basic validation for E1/G1
    if "e1" not in filename.lower() and "g1" not in filename.lower():
         raise HTTPException(status_code=400, detail="Filename must contain 'e1' or 'g1'")

    upload_id = str(uuid.uuid4())
    # Prefix filename with upload_id to avoid collisions (optional, but good practice)
    # For this MVP, we keep original name to match Cloud Function logic or append ID
    # The Cloud Function expects "e1" or "g1" in the name.
    
    blob_name = filename # keeping simple for now
    
    try:
        bucket = storage_client.bucket(BUCKET_NAME)
        blob = bucket.blob(blob_name)
        blob.upload_from_file(file.file)
        
        return UploadResponse(
            upload_id=upload_id,
            filename=filename,
            message=f"File {filename} uploaded successfully to {BUCKET_NAME}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.get("/download-template/{standard}")
def download_template(standard: str):
    """
    Downloads the CSV template for the given standard.
    """
    standard = standard.lower()
    if standard not in ["e1", "g1"]:
        raise HTTPException(status_code=400, detail="Standard must be 'e1' or 'g1'")
    
    file_path = f"templates/{standard}_template.csv"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Template not found")
        
    return FileResponse(file_path, media_type='text/csv', filename=f"{standard}_template.csv")

@app.get("/get-validated-data/{standard}")
def get_validated_data(standard: str):
    """
    Retrieves validated data from BigQuery.
    standard: 'e1' or 'g1'
    """
    if not bq_client:
        raise HTTPException(status_code=500, detail="BigQuery client not initialized")

    standard = standard.lower()
    if standard not in ["e1", "g1"]:
        raise HTTPException(status_code=400, detail="Standard must be 'e1' or 'g1'")

    # Table name convention from Dataform
    table_id = f"{PROJECT_ID}.csrd_mvp.{standard}_validated"
    
    query = f"SELECT * FROM `{table_id}` LIMIT 100"
    
    try:
        query_job = bq_client.query(query)
        rows = [dict(row) for row in query_job]
        # Convert datetime objects to string for JSON serialization
        for row in rows:
            for k, v in row.items():
                if isinstance(v, (datetime.date, datetime.datetime)):
                    row[k] = v.isoformat()
        return {"data": rows}
    except Exception as e:
        # If table doesn't exist yet (Dataform not run), handle gracefully
        if "Not found" in str(e):
             raise HTTPException(status_code=404, detail=f"Validated data for {standard} not found (Table {table_id} missing)")
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")

# Removed old generate_draft endpoint to avoid conflict
# class DraftRequest(BaseModel):
#     topic: str
#     standard: str

# @app.post("/generate-draft")
# def generate_draft(request: DraftRequest):
# ...
    """
    Generates a draft using Dual-Core RAG.
    """
    try:
        # Lazy import to avoid circular deps or init issues if AI module has issues
        from backend.ai.rag_engine import DualCoreRAG
        
        rag = DualCoreRAG()
        result = rag.generate_draft(request.topic, request.standard)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Draft generation failed: {str(e)}")
