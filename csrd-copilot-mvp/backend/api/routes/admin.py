from fastapi import APIRouter, Depends, HTTPException, Body
from backend.api.utils.auth import verify_token
from backend.api.services.audit_trail import AuditTrailService
from google.cloud import bigquery, storage
import os
import datetime

router = APIRouter()
audit_service = AuditTrailService()

@router.post("/purge-data")
async def purge_data(
    payload: dict = Body(...), 
    user=Depends(verify_token)
):
    """
    Purges company evidence and metadata based on scope.
    Payload: {"confirmation": "DELETE", "scope": "global" | "e1" | "g1" | "documents" | "manual"}
    """
    confirmation = payload.get("confirmation")
    scope = payload.get("scope", "global").lower() # Default to global if not specified, but UI should send it

    if confirmation != "DELETE":
         raise HTTPException(status_code=400, detail="Invalid confirmation code. Please type 'DELETE'.")

    user_id = user.get("uid")
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "csrd-copilot")
    bq_client = bigquery.Client(project=project_id)
    storage_client = storage.Client(project=project_id)

    # 1. Log START
    audit_service.log_event(user_id, f"PURGE_INITIATED_{scope.upper()}", f"User initiated purge for scope: {scope}")

    try:
        dataset_ref = f"{project_id}.csrd_mvp"
        tables_to_purge = []
        purge_storage = False

        # Define Scope Logic
        if scope == "global":
            tables_to_purge = ["e1_raw", "g1_raw", "e1_validated", "e2_validated", "e3_validated", "e4_validated", "e5_validated", "s1_validated", "s2_validated", "s3_validated", "s4_validated", "g1_validated", "documents_content", "manual_entries"]
            purge_storage = True
        elif scope == "documents":
            tables_to_purge = ["documents_content"]
            purge_storage = True
        elif scope == "e1":
            tables_to_purge = ["e1_raw", "e1_validated"]
        elif scope == "g1":
            tables_to_purge = ["g1_raw", "g1_validated"]
        elif scope == "manual":
            tables_to_purge = ["manual_entries"]
        else:
            raise HTTPException(status_code=400, detail=f"Invalid scope: {scope}")

        # 2. Delete BigQuery Data
        for table_name in tables_to_purge:
            table_id = f"{dataset_ref}.{table_name}"
            try:
                # Check if table exists first prevents 404 errors
                bq_client.get_table(table_id)
                
                # Delete all rows
                query = f"DELETE FROM `{table_id}` WHERE true"
                query_job = bq_client.query(query)
                query_job.result() # Wait for job to complete
                print(f"Purged table: {table_name}")
            except Exception as e:
                # If table doesn't exist, just ignore
                print(f"Skipping purge for {table_name} (might not exist or error): {e}")

        # 3. Delete Storage Files (Only for global or documents scope)
        if purge_storage:
            bucket_name = f"{project_id}-csrd-raw-data"
            try:
                bucket = storage_client.bucket(bucket_name)
                blobs = list(bucket.list_blobs())
                if blobs:
                    bucket.delete_blobs(blobs)
                    print(f"Deleted {len(blobs)} files from bucket {bucket_name}")
                else:
                    print(f"Bucket {bucket_name} is already empty.")
            except Exception as e:
                 print(f"Error purging bucket {bucket_name}: {e}")

        # 4. Log SUCCESS
        audit_service.log_event(user_id, f"PURGE_COMPLETED_{scope.upper()}", f"Purge successful for scope: {scope}")
        
        return {
            "status": "success", 
            "message": f"Data purged successfully for scope: {scope.upper()}.",
            "timestamp": datetime.datetime.now().isoformat()
        }

    except Exception as e:
        error_msg = str(e)
        audit_service.log_event(user_id, "PURGE_FAILED", error_msg)
        raise HTTPException(status_code=500, detail=f"Purge failed: {error_msg}")
