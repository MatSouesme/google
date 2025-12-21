from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Union
import os
import datetime
from google.cloud import bigquery

# Fix import path for Docker environment
try:
    from backend.api.utils.auth import verify_token
except ImportError:
    from utils.auth import verify_token

router = APIRouter()

class ManualEntryRequest(BaseModel):
    kpi_id: str
    value: Union[str, int, float]
    date: Optional[str] = None
    comment: Optional[str] = None
    unit: Optional[str] = None

@router.post("/data/manual-entry")
def submit_manual_entry(request: ManualEntryRequest, user=Depends(verify_token)):
    """
    Submits manually entered data for a KPI to BigQuery.
    """
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "csrd-copilot")
    client = bigquery.Client(project=project_id)
    table_id = f"{project_id}.csrd_mvp.manual_entries"

    # Prepare row data
    # Default date to today if not provided
    entry_date = request.date if request.date else datetime.date.today().isoformat()

    row = {
        "kpi_id": request.kpi_id,
        "value": str(request.value), # Ensure value is string for BigQuery
        "date": entry_date,
        "comment": request.comment,
        "unit": request.unit,
        "user_email": user.get('email') if user else 'anonymous',
        "submission_timestamp": datetime.datetime.now().isoformat()
    }

    try:
        # Check if table exists, if not let's try to create it or rely on autodetect in load job
        # For simple streaming insert, table usually needs to exist or we use a load job.
        # insert_rows_json requires table to exist.
        
        try:
            client.get_table(table_id)
        except Exception:
            # Table doesn't exist, create it
            schema = [
                bigquery.SchemaField("kpi_id", "STRING"),
                bigquery.SchemaField("value", "STRING"),
                bigquery.SchemaField("date", "DATE"),
                bigquery.SchemaField("comment", "STRING"),
                bigquery.SchemaField("unit", "STRING"),
                bigquery.SchemaField("user_email", "STRING"),
                bigquery.SchemaField("submission_timestamp", "TIMESTAMP"),
            ]
            table = bigquery.Table(table_id, schema=schema)
            client.create_table(table)
            print(f"Created table {table_id}")

        errors = client.insert_rows_json(table_id, [row])
        
        if errors:
            raise HTTPException(status_code=500, detail=f"BigQuery Insert Error: {errors}")
            
        return {"message": "Data submitted successfully", "data": row}

    except Exception as e:
        print(f"Error submitting manual entry: {e}")
        raise HTTPException(status_code=500, detail=f"Submission failed: {str(e)}")
