#!/bin/bash
set -e

# Configuration
PROJECT_ID=$(gcloud config get-value project)
REGION="europe-west1" # Adjust as needed
BUCKET_NAME="${PROJECT_ID}-csrd-raw-data"

echo "Setting up GCS bucket: ${BUCKET_NAME} in ${REGION}..."

# Check if bucket exists
if gsutil ls -b gs://${BUCKET_NAME} > /dev/null 2>&1; then
    echo "Bucket ${BUCKET_NAME} already exists."
else
    # Create bucket
    gcloud storage buckets create gs://${BUCKET_NAME} --location=${REGION} --uniform-bucket-level-access
    echo "Bucket ${BUCKET_NAME} created."
fi

echo "GCS setup complete."
