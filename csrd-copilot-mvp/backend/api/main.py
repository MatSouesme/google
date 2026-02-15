import os
import datetime
import uuid
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import storage
from google.cloud import bigquery
from pydantic import BaseModel
import sys
import traceback

# Add current directory to sys.path to fix imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Fix import path for Docker environment
try:
    from api.routes import generate_draft, workflow, connectors, get_data, chat, export, manual_entry, smart_extraction, dispatcher, analytics, ecovadis, admin, auth_routes, lineage, comments, duplicate_check
except ImportError:
    try:
        from backend.api.routes import generate_draft, workflow, connectors, get_data, chat, export, manual_entry, smart_extraction, dispatcher, analytics, ecovadis, admin, auth_routes, lineage, comments, duplicate_check
    except ImportError:
        from routes import generate_draft, workflow, connectors, get_data, chat, export, manual_entry, smart_extraction, dispatcher, analytics, ecovadis, admin, auth_routes, lineage, comments, duplicate_check

app = FastAPI(title="CSRD Copilot API")

# Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to specific domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_msg = str(exc)
    trace = traceback.format_exc()
    print(f"Global Exception: {error_msg}\n{trace}")
    return JSONResponse(
        status_code=500,
        content={"message": "Internal Server Error", "detail": error_msg},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*"
        }
    )

@app.get("/")
def health_check():
    return {"status": "ok", "service": "csrd-api", "version": "2.5"}

@app.on_event("startup")
async def startup_event():
    print(">>> API STARTUP: VERSION 2.5 - WITH CHAT <<<")

# Include the new routers
app.include_router(generate_draft.router)
app.include_router(workflow.router)
app.include_router(connectors.router)
app.include_router(get_data.router)
app.include_router(chat.router)
app.include_router(export.router)
app.include_router(manual_entry.router)
app.include_router(smart_extraction.router)
app.include_router(dispatcher.router)
app.include_router(analytics.router)
app.include_router(ecovadis.router)
app.include_router(admin.router)
app.include_router(auth_routes.router)
app.include_router(lineage.router)
app.include_router(comments.router)
app.include_router(duplicate_check.router)

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

    # Basic validation for CSRD standards
    valid_standards = ["e1", "e2", "e3", "e4", "e5", "s1", "s2", "s3", "s4", "g1"]
    if not any(std in filename.lower() for std in valid_standards):
         raise HTTPException(status_code=400, detail="Filename must contain a valid standard (e.g., 'e1', 's1', 'g1')")

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

@app.get("/export-xbrl/{report_id}")
def export_xbrl(report_id: str):
    """
    Generates a dummy ESEF/XBRL package (ZIP) for the given report ID.
    Contains a dummy HTML report and a taxonomy JSON.
    """
    import zipfile
    import io

    # Create a dummy HTML report
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>ESEF Report - {report_id}</title>
    </head>
    <body>
        <h1>Sustainability Report (ESEF/XBRL Tagged)</h1>
        <p>Report ID: {report_id}</p>
        <p>Generated: {datetime.datetime.now().isoformat()}</p>
        <div style="border: 1px solid green; padding: 10px;">
            <p><strong>ESRS E1-1</strong>: <span xbrl:tag="ClimateChange">Compliant</span></p>
        </div>
    </body>
    </html>
    """

    # Create a dummy taxonomy
    taxonomy_content = '{"taxonomy": "ESRS-2024", "tags": ["ClimateChange", "Pollution", "Workforce"]}'

    # Create ZIP in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
        zip_file.writestr(f"report_{report_id}.html", html_content)
        zip_file.writestr("taxonomy.json", taxonomy_content)
    
    zip_buffer.seek(0)
    
    filename = f"ESEF_Package_{datetime.date.today().isoformat()}.zip"
    
    # Return as a streaming response (or FileResponse if saved to disk, but memory is cleaner for dummy)
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        zip_buffer, 
        media_type="application/zip", 
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

app.include_router(admin.router)
app.include_router(auth_routes.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
