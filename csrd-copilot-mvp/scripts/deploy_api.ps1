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
    $AI_SOURCE = "ai"
} elseif (Test-Path "..\backend\api") {
    # Exécuté depuis le dossier scripts/
    $SOURCE = "..\backend\api"
    $AI_SOURCE = "..\ai"
} else {
    Write-Error "Impossible de trouver le dossier 'backend/api'. Veuillez exécuter ce script depuis la racine du projet ou le dossier scripts."
    exit 1
}

# COPIE DU DOSSIER AI POUR LE BUILD
Write-Host "Copying AI prompts to build context..." -ForegroundColor Cyan
$AI_DEST = Join-Path $SOURCE "ai"
if (Test-Path $AI_DEST) {
    Remove-Item -Path $AI_DEST -Recurse -Force
}
Copy-Item -Path $AI_SOURCE -Destination $AI_DEST -Recurse

# Déploiement
gcloud run deploy $SERVICE_NAME `
    --source $SOURCE `
    --platform managed `
    --region $REGION `
    --allow-unauthenticated `
    --clear-base-image `
    --set-env-vars GOOGLE_CLOUD_PROJECT=$PROJECT_ID

Write-Host "API deployed successfully." -ForegroundColor Green
