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

    # Use QUALIFY to get only the latest version of each draft_id
    # This handles the case where we insert a new row for APPROVED status
    query = f"""
        SELECT * EXCEPT(rn)
        FROM (
            SELECT *, ROW_NUMBER() OVER (PARTITION BY draft_id ORDER BY updated_at DESC) as rn
            FROM `{table_id}`
            WHERE user_id = @user_id
        )
        WHERE rn = 1
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
            if row.get('created_at') and hasattr(row['created_at'], 'isoformat'):
                row['created_at'] = row['created_at'].isoformat()
            if row.get('updated_at') and hasattr(row['updated_at'], 'isoformat'):
                row['updated_at'] = row['updated_at'].isoformat()
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

    # WORKAROUND: BigQuery Streaming Buffer limitation.
    # We cannot UPDATE rows that were recently inserted via streaming.
    # Solution: We fetch the existing draft and INSERT a new row with status='APPROVED'.
    # The get_history endpoint filters duplicates.

    # 1. Fetch the existing draft
    query_fetch = f"""
        SELECT *
        FROM `{table_id}`
        WHERE draft_id = @draft_id AND user_id = @user_id
        LIMIT 1
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("draft_id", "STRING", request.draft_id),
            bigquery.ScalarQueryParameter("user_id", "STRING", user['uid'])
        ]
    )
    
    try:
        query_job = client.query(query_fetch, job_config=job_config)
        rows = list(query_job)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch draft: {str(e)}")
    
    if not rows:
        raise HTTPException(status_code=404, detail="Draft not found")
        
    draft_row = dict(rows[0])
    
    # 2. Prepare new row
    new_row = draft_row.copy()
    new_row['status'] = 'APPROVED'
    new_row['updated_at'] = datetime.datetime.utcnow().isoformat()
    
    # Serialize datetimes for JSON insert
    for key, value in new_row.items():
        if hasattr(value, 'isoformat'):
            new_row[key] = value.isoformat()

    # 3. Insert new row
    errors = client.insert_rows_json(table_id, [new_row])
    if errors:
        raise HTTPException(status_code=500, detail=f"BigQuery Insert Error: {errors}")

    # 4. Insert into redac_final (Consolidated Report)
    # We use a separate table for the final report to track progress
    final_table_id = f"{project_id}.csrd_mvp.redac_final"
    
    # Prepare row for redac_final
    final_row = {
        "user_id": user['uid'],
        "standard": draft_row['standard'],
        "topic": draft_row['topic'],
        "content": draft_row['content'],
        "updated_at": datetime.datetime.utcnow().isoformat()
    }
    
    # We use insert_rows_json. Since we want to "upsert" (replace if exists), 
    # and BigQuery streaming doesn't support update easily, we will just insert.
    # The reading logic will have to pick the latest one (like we did for history).
    # Alternatively, we could use a MERGE statement if we weren't using streaming inserts,
    # but for consistency let's stick to append-only + read-latest pattern.
    
    errors_final = client.insert_rows_json(final_table_id, [final_row])
    if errors_final:
        print(f"Warning: Failed to insert into redac_final: {errors_final}")
        # We don't fail the request if this fails, as the main approval worked.

    return {"message": "Draft approved and added to Official Report"}

@router.get("/final-report")
def get_final_report(user=Depends(verify_token)):
    """Retrieves the consolidated final report and progress."""
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "csrd-copilot")
    client = bigquery.Client(project=project_id)
    table_id = f"{project_id}.csrd_mvp.redac_final"

    # Get latest version of each (standard, topic) pair
    query = f"""
        SELECT * EXCEPT(rn)
        FROM (
            SELECT *, ROW_NUMBER() OVER (PARTITION BY standard, topic ORDER BY updated_at DESC) as rn
            FROM `{table_id}`
            WHERE user_id = @user_id
        )
        WHERE rn = 1
        ORDER BY standard, topic
    """
    
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("user_id", "STRING", user['uid'])
        ]
    )

    try:
        query_job = client.query(query, job_config=job_config)
        results = [dict(row) for row in query_job]
        return results
    except Exception as e:
        # Table might not exist yet
        return []
