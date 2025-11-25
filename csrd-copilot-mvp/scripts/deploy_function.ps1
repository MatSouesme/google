$ErrorActionPreference = "Stop"

$PROJECT_ID = gcloud config get-value project
$REGION = "europe-west1"
$BUCKET_NAME = "${PROJECT_ID}-csrd-raw-data"
$FUNCTION_NAME = "ingest-csv"

Write-Host "Deploying Cloud Function $FUNCTION_NAME..." -ForegroundColor Cyan

# Check if bucket exists (it should, but good to verify or warn)
# We assume setup_gcs.sh was run or API created it (API doesn't create it, it just uses it).

# Deploy Function
# Note: We need to be in the root or point to the source correctly.
# The source is backend/cloud_functions/ingest_csv

if (Test-Path "backend\cloud_functions\ingest_csv") {
    $SOURCE = "backend\cloud_functions\ingest_csv"
} elseif (Test-Path "..\backend\cloud_functions\ingest_csv") {
    $SOURCE = "..\backend\cloud_functions\ingest_csv"
} else {
    Write-Error "Cannot find function source directory."
    exit 1
}

gcloud functions deploy $FUNCTION_NAME `
    --gen2 `
    --runtime=python311 `
    --region=$REGION `
    --source=$SOURCE `
    --entry-point=ingest_csv `
    --trigger-bucket=$BUCKET_NAME `
    --set-env-vars GCP_PROJECT=$PROJECT_ID

Write-Host "Cloud Function deployed successfully." -ForegroundColor Green
