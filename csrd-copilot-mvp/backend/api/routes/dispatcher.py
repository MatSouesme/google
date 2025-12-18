from fastapi import APIRouter, HTTPException, Depends
from google.cloud import bigquery
import os
try:
    from backend.api.utils.auth import verify_token
except ImportError:
    from utils.auth import verify_token

router = APIRouter()

@router.post("/data/dispatch")
def dispatch_data(user=Depends(verify_token)):
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "csrd-copilot")
    client = bigquery.Client(project=project_id)
    
    # 1. Clear existing manual entries in target tables
    # e1_raw
    # We use upload_id = 'manual' to identify rows that came from manual entry
    query_clear_e1 = f"DELETE FROM `{project_id}.csrd_mvp.e1_raw` WHERE upload_id = 'manual'"
    try:
        client.query(query_clear_e1).result()
    except Exception as e:
        print(f"Error clearing e1_raw: {e}")
        # Table might not exist, ignore for now

    # 2. Fetch manual entries
    query_fetch = f"SELECT * FROM `{project_id}.csrd_mvp.manual_entries`"
    try:
        query_job = client.query(query_fetch)
        manual_entries = [dict(row) for row in query_job]
    except Exception as e:
        print(f"Error fetching manual entries: {e}")
        return {"message": "Error fetching manual entries", "error": str(e)}

    # 3. Process and Insert
    try:
        # Group by year for e1_raw
        e1_data = {} # year -> {scope1: 0, scope2: 0, scope3: 0}

        for entry in manual_entries:
            kpi_id = entry['kpi_id']
            # Handle value conversion safely
            try:
                value = float(entry['value'])
            except (ValueError, TypeError):
                value = 0.0
                
            # Handle date safely (could be str or datetime.date)
            raw_date = entry['date']
            if hasattr(raw_date, 'isoformat'):
                date_str = raw_date.isoformat()
            else:
                date_str = str(raw_date)
                
            year = date_str.split('-')[0] if date_str else None
            
            if not year: continue

            # Mapping Logic
            if kpi_id == 'E1-6-1': # Scope 1
                if year not in e1_data: e1_data[year] = {'s1': 0, 's2': 0, 's3': 0}
                e1_data[year]['s1'] = value
            elif kpi_id == 'E1-6-3': # Scope 2 (Location based)
                if year not in e1_data: e1_data[year] = {'s1': 0, 's2': 0, 's3': 0}
                e1_data[year]['s2'] = value
            elif kpi_id == 'E1-6-5': # Scope 3
                if year not in e1_data: e1_data[year] = {'s1': 0, 's2': 0, 's3': 0}
                e1_data[year]['s3'] = value

        # Insert into e1_raw
        if e1_data:
            rows_to_insert = []
            for year, scopes in e1_data.items():
                # Convert to string because e1_raw likely uses strings for these columns (based on get_data.py)
                rows_to_insert.append({
                    "year": int(year),
                    "scope1_emissions_tCO2": str(scopes['s1']),
                    "scope2_emissions_tCO2": str(scopes['s2']),
                    "scope3_emissions_tCO2": str(scopes['s3']),
                    "upload_id": "manual",
                    "row_number": 1
                })
            
            table_id = f"{project_id}.csrd_mvp.e1_raw"
            errors = client.insert_rows_json(table_id, rows_to_insert)
            if errors:
                print(f"Errors inserting into e1_raw: {errors}")
                raise Exception(f"BigQuery Insert Errors: {errors}")

    except Exception as e:
        print(f"Error in dispatch logic: {e}")
        raise HTTPException(status_code=500, detail=f"Dispatch failed: {str(e)}")

    # 4. Calculate Stats
    # Return the list of completed KPIs (present in manual_entries)
    unique_kpis = list(set(entry['kpi_id'] for entry in manual_entries))
    
    return {
        "message": "Data dispatched successfully",
        "stats": {
            "completed_count": len(unique_kpis),
            "completed_kpis": unique_kpis
        }
    }

@router.get("/data/status")
def get_data_status(user=Depends(verify_token)):
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "csrd-copilot")
    client = bigquery.Client(project=project_id)
    
    query = f"SELECT DISTINCT kpi_id FROM `{project_id}.csrd_mvp.manual_entries`"
    try:
        query_job = client.query(query)
        completed_kpis = [row['kpi_id'] for row in query_job]
        return {
            "completed_count": len(completed_kpis),
            "completed_kpis": completed_kpis
        }
    except Exception as e:
        print(f"Error fetching status: {e}")
        return {"completed_count": 0, "completed_kpis": []}
