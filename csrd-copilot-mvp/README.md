# CSRD Copilot MVP

This project is an MVP for a CSRD (Corporate Sustainability Reporting Directive) Copilot. It helps companies manage their sustainability data (ESRS E1, G1, etc.) and provides AI-powered insights using RAG (Retrieval-Augmented Generation).

## Architecture

The project consists of three main pillars:

1.  **Frontend (P1)**: User interface for data upload and interaction (to be integrated).
2.  **Backend/Data (P2)**:
    *   **Google Cloud Storage (GCS)**: Stores raw CSV uploads.
    *   **Cloud Functions**: Triggers on upload to parse and ingest data.
    *   **BigQuery**: Data warehouse for structured sustainability data.
    *   **Dataform**: Manages BigQuery schemas and data quality assertions.
3.  **AI/ML (P3)**:
    *   **Vertex AI Search**: RAG engine for querying legal texts (ESRS) and example reports.
    *   **Data Curation**: Scripts to download and manage knowledge base documents.

## Project Structure

```
.
├── backend/
│   ├── cloud_functions/    # Python Cloud Functions (e.g., ingest_csv)
│   └── dataform/           # SQLX definitions for BigQuery schemas
├── data/                   # Local data for testing and curation
├── scripts/                # Utility scripts for setup and maintenance
└── docs/                   # Documentation
```

## Setup & Deployment

### Prerequisites
- Google Cloud Platform (GCP) project.
- `gcloud` CLI installed and authenticated.
- Python 3.11+.

### 1. Infrastructure Setup
Initialize the GCS buckets and enable necessary services:
```bash
./scripts/setup_gcs.sh
```

### 2. Backend Deployment
Deploy the Cloud Function for CSV ingestion:
```bash
gcloud functions deploy ingest_csv \
  --gen2 \
  --runtime=python311 \
  --region=europe-west1 \
  --source=backend/cloud_functions/ingest_csv \
  --entry-point=ingest_csv \
  --trigger-event-filters="type=google.cloud.storage.object.v1.finalized" \
  --trigger-event-filters="bucket=YOUR_PROJECT_ID-csrd-raw-data"
```
*(Note: The setup script uses `csrd-copilot-csrd-raw-data` by default, adjust as needed)*

Deploy Dataform (or manually create tables if Dataform is not set up remotely):
The schemas are defined in `backend/dataform/definitions/`.

### 3. AI/ML Setup
Set up Vertex AI Search data stores:
```bash
export GOOGLE_CLOUD_PROJECT=your-project-id
python3 scripts/setup_vertex_search.py
```

## Usage

### Ingesting Data
Upload a CSV file to the raw data bucket. The filename must contain "e1" or "g1" to be routed correctly.

```bash
gsutil cp data/test_e1.csv gs://YOUR_BUCKET_NAME/
```

Check BigQuery to see the ingested data:
```sql
SELECT * FROM `csrd_mvp.e1_raw` LIMIT 10;
```

### Data Curation
Download relevant legal texts and reports:
```bash
python3 scripts/download_data.py
```
