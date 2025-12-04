$ErrorActionPreference = "Stop"

$PROJECT_ID = gcloud config get-value project
$DATASET = "csrd_mvp"
$REGION = "europe-west1"

Write-Host "Setting up BigQuery for project $PROJECT_ID..." -ForegroundColor Cyan

# Create Dataset
Write-Host "Creating dataset $DATASET..."
try {
    bq --location=$REGION mk --dataset "${PROJECT_ID}:${DATASET}"
    Write-Host "Dataset created." -ForegroundColor Green
} catch {
    Write-Host "Dataset might already exist or error occurred: $_" -ForegroundColor Yellow
}

# Create E1 Raw Table
$E1_SCHEMA = "year:STRING,entity_name:STRING,scope1_emissions_tCO2:STRING,scope2_emissions_tCO2:STRING,scope3_emissions_tCO2:STRING,energy_consumption_MWh:STRING,renewable_share_pct:STRING,source_file:STRING,row_number:INTEGER,upload_id:STRING,ingestion_timestamp:TIMESTAMP"
Write-Host "Creating table e1_raw..."
try {
    bq mk --table "${PROJECT_ID}:${DATASET}.e1_raw" $E1_SCHEMA
    Write-Host "Table e1_raw created." -ForegroundColor Green
} catch {
    Write-Host "Table e1_raw might already exist." -ForegroundColor Yellow
}

# Create G1 Raw Table
$G1_SCHEMA = "policy_name:STRING,last_update:STRING,responsible_department:STRING,status:STRING,internal_owner:STRING,source_file:STRING,row_number:INTEGER,upload_id:STRING,ingestion_timestamp:TIMESTAMP"
Write-Host "Creating table g1_raw..."
try {
    bq mk --table "${PROJECT_ID}:${DATASET}.g1_raw" $G1_SCHEMA
    Write-Host "Table g1_raw created." -ForegroundColor Green
} catch {
    Write-Host "Table g1_raw might already exist." -ForegroundColor Yellow
}

Write-Host "BigQuery setup complete." -ForegroundColor Green
