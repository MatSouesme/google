from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any
import os
from google.cloud import bigquery

# Fix import path for Docker environment
try:
    from backend.api.utils.auth import verify_token
    from backend.api.connectors.salesforce import SalesforceConnector
except ImportError:
    from utils.auth import verify_token
    from connectors.salesforce import SalesforceConnector

router = APIRouter()

class SyncRequest(BaseModel):
    connector_type: str # e.g., 'salesforce', 'aws', 'sap'
    credentials: Dict[str, str] # For MVP, pass creds in body. In prod, use Secret Manager.

@router.post("/connectors/sync")
def sync_connector(request: SyncRequest, user=Depends(verify_token)):
    """
    Triggers a data sync from an external connector.
    """
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "csrd-copilot")
    
    # 1. Select Connector
    connector = None
    if request.connector_type.lower() == 'salesforce':
        connector = SalesforceConnector(project_id, request.credentials)
    else:
        raise HTTPException(status_code=400, detail=f"Connector '{request.connector_type}' not supported yet.")

    try:
        # 2. Authenticate
        if not connector.authenticate():
            raise HTTPException(status_code=401, detail="Authentication failed with external service.")

        # 3. Fetch
        raw_data = connector.fetch_data()
        
        # 4. Transform
        standard_data, extra_data = connector.transform_data(raw_data)
        
        if not standard_data and not extra_data:
            return {"message": "Sync completed. No data found to insert."}

        client = bigquery.Client(project=project_id)
        
        # 5a. Load Standard Data to 'e1_raw'
        if standard_data:
            table_id = f"{project_id}.csrd_mvp.e1_raw"
            errors = client.insert_rows_json(table_id, standard_data, ignore_unknown_values=True)
            if errors:
                raise HTTPException(status_code=500, detail=f"BigQuery Insert Error (Standard): {errors}")

        # 5b. Load Extra Data to 'salesforce_extra'
        # We use load_table_from_json with autodetect to handle new columns dynamically
        if extra_data:
            extra_table_id = f"{project_id}.csrd_mvp.salesforce_extra"
            job_config = bigquery.LoadJobConfig(
                autodetect=True,
                write_disposition="WRITE_APPEND",
                create_disposition="CREATE_IF_NEEDED"
            )
            try:
                job = client.load_table_from_json(extra_data, extra_table_id, job_config=job_config)
                job.result() # Wait for job to complete
            except Exception as e:
                print(f"Warning: Could not insert extra data: {e}")
                # We don't block the main success if extra data fails, or we could raise.
                # For MVP, let's log and proceed or raise if critical.
                # Let's raise to be safe.
                raise HTTPException(status_code=500, detail=f"BigQuery Insert Error (Extra): {e}")

        return {
            "message": "Sync successful", 
            "rows_inserted_standard": len(standard_data),
            "rows_inserted_extra": len(extra_data),
            "source": f"CONNECTOR:{request.connector_type.upper()}"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")
