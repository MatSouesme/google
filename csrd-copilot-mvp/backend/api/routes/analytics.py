from fastapi import APIRouter, HTTPException, Depends
from google.cloud import bigquery
import os
import json
from typing import List, Dict, Any

try:
    from backend.api.utils.auth import verify_token
except ImportError:
    from utils.auth import verify_token

router = APIRouter()

def load_schema(standard: str):
    """Loads the schema for a given standard."""
    try:
        # Adjust path based on where the code is running
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        json_path = os.path.join(base_dir, "models", f"{standard}_schema.json")
        
        if not os.path.exists(json_path):
            # Fallback for Docker structure if needed
            json_path = os.path.join("/app", "models", f"{standard}_schema.json")
            
        with open(json_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading schema for {standard}: {e}")
        return None

@router.get("/analytics/gap-analysis")
def get_gap_analysis(standard: str = "e1", user=Depends(verify_token)):
    """
    Calculates the completeness of the data against the standard schema.
    """
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "csrd-copilot")
    client = bigquery.Client(project=project_id)
    
    schema = load_schema(standard)
    if not schema:
        raise HTTPException(status_code=404, detail=f"Schema for {standard} not found")
    
    # 1. Get available columns in BigQuery table
    # Assuming table name is {standard}_raw
    table_id = f"{project_id}.csrd_mvp.{standard}_raw"
    manual_table_id = f"{project_id}.csrd_mvp.manual_entries"
    
    # Get manually entered KPIs
    manual_kpis = set()
    try:
        manual_query = f"SELECT DISTINCT kpi_id FROM `{manual_table_id}`"
        manual_job = client.query(manual_query)
        manual_results = manual_job.result()
        for row in manual_results:
            manual_kpis.add(row.kpi_id)
    except Exception as e:
        print(f"Warning: Could not query manual entries: {e}")

    try:
        # Check if table exists and get columns
        table = client.get_table(table_id)
        bq_columns = [schema_field.name for schema_field in table.schema]
        
        # Check for non-null values in these columns
        # We construct a query to count non-nulls for each relevant column
        # For simplicity in MVP, we just check if the column exists in the table schema
        # A better approach is to check if COUNT(col) > 0
        
        # Let's do a quick check for data presence
        # We map schema fields to potential BQ columns
        # This mapping might need to be smarter or defined in the schema
        
        # For this MVP, we'll assume a simple mapping or just check if *any* data exists for the KPI ID if stored in a generic way
        # OR if we have specific columns like 'scope1_emissions'
        
        # Let's try to query the actual data to see what's filled
        # We'll select 1 row to see structure or just use the schema
        
        # Better strategy for MVP:
        # The schema defines "fields". We check if those fields exist in BQ columns AND have data.
        
        mandatory_kpis = [k for k in schema["kpis"] if k.get("mandatory")]
        total_mandatory = len(mandatory_kpis)
        covered_ids = set()
        
        # 1. Check Manual Entries first
        for kpi in mandatory_kpis:
            if kpi['id'] in manual_kpis:
                covered_ids.add(kpi['id'])

        select_clauses = []
        
        # 2. Check BigQuery Columns for extracting data
        for kpi in mandatory_kpis:
            # Skip if already found in manual entries (we assume manual overrides or complements)
            if kpi['id'] in covered_ids:
                continue

            if "fields" in kpi:
                # Quantitative
                valid_fields = [f for f in kpi["fields"] if f in bq_columns]
                if valid_fields:
                    # If we have at least one matching column, we check if it has data
                    checks = [f"COUNT({f})" for f in valid_fields]
                    select_clauses.append(f"({' + '.join(checks)}) as `{kpi['id']}`")
            # Narrative fields are ignored for MVP unless in manual entries
        
        if select_clauses:
            query = f"SELECT {', '.join(select_clauses)} FROM `{table_id}`"
            job = client.query(query)
            result = job.result()
            
            for row in result:
                for kpi_id, count in row.items():
                    if count > 0:
                        covered_ids.add(kpi_id)
        
        covered_count = len(covered_ids)
        missing_kpis = [k for k in mandatory_kpis if k['id'] not in covered_ids]
        
        score = int((covered_count / total_mandatory) * 100) if total_mandatory > 0 else 0
        
        return {
            "standard": standard,
            "completeness_score": score,
            "total_mandatory": total_mandatory,
            "covered_count": covered_count,
            "missing_kpis": missing_kpis
        }

    except Exception as e:
        if "Not found" in str(e) or "404" in str(e):
             # Table does not exist yet (no data uploaded for this standard)
            return {
                "standard": standard,
                "completeness_score": 0,
                "total_mandatory": len(load_schema(standard)["kpis"]) if load_schema(standard) else 0,
                "covered_count": 0,
                "missing_kpis": [k for k in load_schema(standard)["kpis"] if k.get("mandatory")] if load_schema(standard) else [],
                "status": "no_data"
            }
        
        print(f"Gap Analysis Error: {e}")
        # Return a dummy response for UI dev if DB fails
        return {
            "standard": standard,
            "completeness_score": 0,
            "error": str(e),
            "missing_kpis": []
        }
