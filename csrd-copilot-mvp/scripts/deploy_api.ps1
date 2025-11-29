$ErrorActionPreference = "Stop"

# Récupérer l'ID du projet
$PROJECT_ID = gcloud config get-value project
$REGION = "europe-west1"
$SERVICE_NAME = "csrd-api"

Write-Host "Deploying API to Cloud Run..." -ForegroundColor Cyan

# Déterminer le chemin correct vers le code source
if (Test-Path "backend\api") {
    # Exécuté depuis la racine
    $SOURCE = "backend\api"
} elseif (Test-Path "..\backend\api") {
    # Exécuté depuis le dossier scripts/
    $SOURCE = "..\backend\api"
} else {
    Write-Error "Impossible de trouver le dossier 'backend/api'. Veuillez exécuter ce script depuis la racine du projet ou le dossier scripts."
    exit 1
}

# Déploiement
gcloud run deploy $SERVICE_NAME `
    --source $SOURCE `
    --platform managed `
    --region $REGION `
    --un-allow-unauthenticated `
    --set-env-vars GOOGLE_CLOUD_PROJECT=$PROJECT_ID

Write-Host "API deployed successfully." -ForegroundColor Green
