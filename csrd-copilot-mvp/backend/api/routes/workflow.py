from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from google.cloud import bigquery
import uuid
import datetime
import os

# Fix import path for Docker environment
try:
    from backend.api.utils.auth import verify_token
except ImportError:
    from utils.auth import verify_token

router = APIRouter()

class SaveDraftRequest(BaseModel):
    topic: str
    standard: str
    content: str
    audit_report: str
    source_data: str

class ApproveDraftRequest(BaseModel):
    draft_id: str

@router.post("/save-draft")
def save_draft(request: SaveDraftRequest, user=Depends(verify_token)):
    """Saves a generated draft to BigQuery history."""
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "csrd-copilot")
    client = bigquery.Client(project=project_id)
    table_id = f"{project_id}.csrd_mvp.draft_history"

    draft_id = str(uuid.uuid4())
    created_at = datetime.datetime.utcnow().isoformat()

    rows_to_insert = [{
        "draft_id": draft_id,
        "user_id": user['uid'],
        "topic": request.topic,
        "standard": request.standard,
        "content": request.content,
        "audit_report": request.audit_report,
        "source_data": request.source_data,
        "status": "DRAFT",
        "created_at": created_at,
        "updated_at": created_at
    }]

    errors = client.insert_rows_json(table_id, rows_to_insert)
    if errors:
        raise HTTPException(status_code=500, detail=f"BigQuery Insert Error: {errors}")

    return {"message": "Draft saved successfully", "draft_id": draft_id}

@router.get("/history")
def get_history(user=Depends(verify_token)):
    """Retrieves the user's draft history."""
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "csrd-copilot")
    client = bigquery.Client(project=project_id)
    table_id = f"{project_id}.csrd_mvp.draft_history"

    query = f"""
        SELECT draft_id, topic, standard, status, created_at 
        FROM `{table_id}`
        WHERE user_id = @user_id
        ORDER BY created_at DESC
        LIMIT 50
    """
    
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("user_id", "STRING", user['uid'])
        ]
    )

    try:
        query_job = client.query(query, job_config=job_config)
        results = [dict(row) for row in query_job]
        # Convert datetime objects to string
        for row in results:
            if row['created_at']:
                row['created_at'] = row['created_at'].isoformat()
        return results
    except Exception as e:
        # If table doesn't exist yet, return empty list
        return []

@router.post("/approve-draft")
def approve_draft(request: ApproveDraftRequest, user=Depends(verify_token)):
    """Promotes a draft to APPROVED status (Official Report)."""
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "csrd-copilot")
    client = bigquery.Client(project=project_id)
    table_id = f"{project_id}.csrd_mvp.draft_history"

    # Note: BigQuery UPDATEs have a slight latency and cost, but acceptable for MVP
    query = f"""
        UPDATE `{table_id}`
        SET status = 'APPROVED', updated_at = CURRENT_TIMESTAMP()
        WHERE draft_id = @draft_id AND user_id = @user_id
    """

    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("draft_id", "STRING", request.draft_id),
            bigquery.ScalarQueryParameter("user_id", "STRING", user['uid'])
        ]
    )

    query_job = client.query(query, job_config=job_config)
    query_job.result() # Wait for completion

    return {"message": "Draft approved and added to Official Report"}
