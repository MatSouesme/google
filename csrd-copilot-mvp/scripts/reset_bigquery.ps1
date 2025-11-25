$ErrorActionPreference = "Stop"

$PROJECT_ID = gcloud config get-value project
$DATASET = "csrd_mvp"

Write-Host "Resetting BigQuery tables for project $PROJECT_ID..." -ForegroundColor Cyan

# Delete existing tables if they exist
Write-Host "Deleting old tables..."
try {
    bq rm -f -t "${PROJECT_ID}:${DATASET}.e1_raw"
    Write-Host "Table e1_raw deleted." -ForegroundColor Yellow
} catch {
    Write-Host "Table e1_raw did not exist."
}

try {
    bq rm -f -t "${PROJECT_ID}:${DATASET}.g1_raw"
    Write-Host "Table g1_raw deleted." -ForegroundColor Yellow
} catch {
    Write-Host "Table g1_raw did not exist."
}

# Re-run setup to create them with correct schema
# Use Invoke-Expression or call directly, ensuring path is correct
if (Test-Path ".\scripts\setup_bigquery.ps1") {
    .\scripts\setup_bigquery.ps1
} elseif (Test-Path "setup_bigquery.ps1") {
    .\setup_bigquery.ps1
} else {
    Write-Error "Could not find setup_bigquery.ps1 to recreate tables!"
}
