#!/bin/bash
set -e

PROJECT_ID=$(gcloud config get-value project)
REGION="europe-west1"
SERVICE_NAME="csrd-api"

echo "Deploying API to Cloud Run..."

# Build and deploy
gcloud run deploy ${SERVICE_NAME} \
    --source backend/api \
    --platform managed \
    --region ${REGION} \
    --no-allow-unauthenticated \
    --set-env-vars GOOGLE_CLOUD_PROJECT=${PROJECT_ID}

echo "API deployed successfully."
