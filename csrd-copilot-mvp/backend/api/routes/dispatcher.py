from fastapi import APIRouter, HTTPException, Depends
from google.cloud import bigquery
import os
import json
from vertexai.generative_models import GenerativeModel
import vertexai

try:
    from backend.api.utils.auth import verify_token
except ImportError:
    from utils.auth import verify_token

router = APIRouter()

def load_kpis():
    """Loads the reference KPIs from the JSON file."""
    try:
        # Adjust path based on where the code is running
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        json_path = os.path.join(base_dir, "data", "kpis.json")
        
        if not os.path.exists(json_path):
            # Fallback for Docker structure if needed
            json_path = os.path.join("/app", "data", "kpis.json")
            
        with open(json_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading KPIs: {e}")
        return []

def match_kpis_with_ai(unmapped_entries, all_kpis):
    """
    Uses Gemini to match unmapped entries to valid KPI IDs.
    """
    try:
        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "csrd-copilot")
        vertexai.init(project=project_id, location="us-central1")
        model = GenerativeModel("gemini-2.0-flash-lite-001")
        
        # Prepare Context (Simplify KPIs to save tokens)
        kpi_context = []
        for k in all_kpis:
            kpi_context.append(f"ID: {k['id']} | Name: {k['name']} | Desc: {k.get('description', '')}")
        
        kpi_text = "\n".join(kpi_context)
        
        # Prepare Input
        input_items = []
        for entry in unmapped_entries:
            input_items.append(f"TempID: {entry['kpi_id']} | Value: {entry['value']} | Comment: {entry['comment']}")
        
        input_text = "\n".join(input_items)
        
        prompt = f"""
        You are a CSRD Data Mapping Expert.
        Your task is to map input data points to the correct Standard KPI ID.
        
        --- REFERENCE KPIS (ID | Name | Description) ---
        {kpi_text}
        
        --- INPUT DATA (TempID | Value | Comment) ---
        {input_text}
        
        --- INSTRUCTIONS ---
        For each input item, find the best matching KPI ID from the Reference list.
        - Use the 'TempID' (which might be a description) and 'Comment' to understand the data.
        - If the 'TempID' is already a valid ID (or close to it), map it to the correct ID.
        - If it's a description (e.g. "Expected GHG emission reductions"), find the KPI with the closest meaning.
        - If you are not sure, return null for that item.
        
        Return a JSON object with a list of mappings:
        {{
            "mappings": [
                {{ "temp_id": "original_temp_id", "matched_id": "VALID_KPI_ID_OR_NULL" }}
            ]
        }}
        """
        
        response = model.generate_content(prompt)
        # Clean up response
        text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
        
    except Exception as e:
        print(f"AI Matching failed: {e}")
        return {"mappings": []}


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

    # --- AI MAPPING STEP ---
    all_kpis = load_kpis()
    valid_ids = set(k['id'] for k in all_kpis)
    
    unmapped_entries = []
    for entry in manual_entries:
        # Normalize ID first
        normalized_id = entry['kpi_id'].strip()
        if normalized_id not in valid_ids:
            unmapped_entries.append(entry)
            
    if unmapped_entries and all_kpis:
        print(f"Found {len(unmapped_entries)} unmapped entries. Calling AI...")
        mapping_result = match_kpis_with_ai(unmapped_entries, all_kpis)
        
        if mapping_result and 'mappings' in mapping_result:
            for mapping in mapping_result['mappings']:
                temp_id = mapping.get('temp_id')
                matched_id = mapping.get('matched_id')
                
                if matched_id and matched_id in valid_ids:
                    print(f"Mapping '{temp_id}' -> '{matched_id}'")
                    
                    # Update BigQuery
                    # Note: This updates ALL rows with this temp_id. 
                    # In a real app, we might want to update specific rows by a unique ID (if we had one).
                    # But here, kpi_id IS the identifier we have.
                    query_update = f"""
                        UPDATE `{project_id}.csrd_mvp.manual_entries`
                        SET kpi_id = '{matched_id}'
                        WHERE kpi_id = '{temp_id}'
                    """
                    try:
                        client.query(query_update).result()
                        
                        # Update local list for immediate processing
                        for entry in manual_entries:
                            if entry['kpi_id'] == temp_id:
                                entry['kpi_id'] = matched_id
                                
                    except Exception as e:
                        print(f"Error updating BigQuery mapping: {e}")

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
    # Also normalize IDs (e.g. remove spaces) to match frontend
    unique_kpis = []
    for entry in manual_entries:
        raw_id = entry['kpi_id']
        # Normalize: remove spaces, handle potential variations
        normalized_id = raw_id.strip()
        unique_kpis.append(normalized_id)
        
        # Also add the raw ID just in case
        if raw_id != normalized_id:
            unique_kpis.append(raw_id)
            
    unique_kpis = list(set(unique_kpis))
    
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
    
    # Get latest value for each KPI
    query = f"""
        SELECT kpi_id, value, unit 
        FROM `{project_id}.csrd_mvp.manual_entries`
        QUALIFY ROW_NUMBER() OVER (PARTITION BY kpi_id ORDER BY submission_timestamp DESC) = 1
    """
    try:
        query_job = client.query(query)
        completed_kpis = []
        kpi_values = {} # Map kpi_id -> {value, unit}

        for row in query_job:
            raw_id = row['kpi_id']
            clean_id = raw_id.strip()
            
            completed_kpis.append(raw_id)
            completed_kpis.append(clean_id)
            
            kpi_values[raw_id] = {"value": row['value'], "unit": row['unit']}
            kpi_values[clean_id] = {"value": row['value'], "unit": row['unit']}
            
        return {
            "completed_count": len(set(completed_kpis)),
            "completed_kpis": list(set(completed_kpis)),
            "kpi_values": kpi_values
        }
    except Exception as e:
        print(f"Error fetching status: {e}")
        return {"completed_count": 0, "completed_kpis": [], "kpi_values": {}}
