from fastapi import APIRouter, HTTPException, Depends
from google.cloud import bigquery
import os
try:
    from backend.api.utils.auth import verify_token
except ImportError:
    from utils.auth import verify_token

router = APIRouter()

@router.get("/data/dashboard")
def get_dashboard_data(user=Depends(verify_token)):
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "csrd-copilot")
    client = bigquery.Client(project=project_id)
    
    # Query 1: Emissions by Year
    query_years = f"""
        SELECT 
            year,
            SUM(CAST(IFNULL(scope1_emissions_tCO2, '0') AS FLOAT64)) as scope1,
            SUM(CAST(IFNULL(scope2_emissions_tCO2, '0') AS FLOAT64)) as scope2,
            SUM(CAST(IFNULL(scope3_emissions_tCO2, '0') AS FLOAT64)) as scope3
        FROM `{project_id}.csrd_mvp.e1_raw`
        WHERE year IS NOT NULL
        GROUP BY year
        ORDER BY year
    """
    
    # Query 2: Emissions by Facility (Top 5)
    query_facilities = f"""
        SELECT 
            extra.facility_name as facility,
            SUM(CAST(IFNULL(raw.scope1_emissions_tCO2, '0') AS FLOAT64) + CAST(IFNULL(raw.scope2_emissions_tCO2, '0') AS FLOAT64) + CAST(IFNULL(raw.scope3_emissions_tCO2, '0') AS FLOAT64)) as total_emissions
        FROM `{project_id}.csrd_mvp.e1_raw` raw
        JOIN `{project_id}.csrd_mvp.salesforce_extra` extra
        ON raw.upload_id = extra.upload_id AND raw.row_number = extra.row_number
        WHERE extra.facility_name IS NOT NULL
        GROUP BY extra.facility_name
        ORDER BY total_emissions DESC
        LIMIT 5
    """

    try:
        years_job = client.query(query_years)
        facilities_job = client.query(query_facilities)
        
        years_data = [dict(row) for row in years_job]
        facilities_data = [dict(row) for row in facilities_job]
        
        return {
            "emissions_by_year": years_data,
            "top_facilities": facilities_data
        }
    except Exception as e:
        print(f"Error fetching dashboard data: {e}")
        return {
            "emissions_by_year": [],
            "top_facilities": [],
            "debug_error": str(e)
        }
