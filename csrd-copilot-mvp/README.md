# Ecoply (CSRD Copilot MVP)

Ecoply is an AI-powered CSRD (Corporate Sustainability Reporting Directive) Copilot. It helps companies manage their sustainability data (ESRS E1, G1, etc.), validates it against legal standards, and provides AI-driven drafting assistance using a "Dual-Core RAG" approach.

## Architecture

The project consists of three main pillars:

1.  **Frontend (P4)**:
    *   **React/Vite App**: A modern, dark-themed UI ("Ecoply" branding).
    *   **Upload Wizard**: Guided interface for downloading templates and uploading CSV data.
2.  **Backend/Data (P2)**:
    *   **FastAPI (Cloud Run)**: Central API for data upload and AI generation.
    *   **Google Cloud Storage (GCS)**: Stores raw CSV uploads.
    *   **Cloud Functions**: Triggers on upload to parse and ingest data.
    *   **BigQuery**: Data warehouse for structured sustainability data.
    *   **Dataform**: Manages BigQuery schemas and data quality assertions.
3.  **AI/ML (P3)**:
    *   **Dual-Core RAG**: Orchestrates queries to:
        *   *Core 1 (Compliance)*: Vertex AI Search (Legal Texts).
        *   *Core 2 (Strategist)*: Vertex AI Search (Best-in-class Reports).
        *   *User Data*: BigQuery (Validated Company Data).
    *   **Gemini**: Synthesizes inputs into professional drafts.

## Project Structure

```
.
├── backend/
│   ├── api/                # FastAPI application (main.py)
│   ├── ai/                 # RAG Engine logic (rag_engine.py)
│   ├── cloud_functions/    # Python Cloud Functions (ingest_csv)
│   └── dataform/           # SQLX definitions for BigQuery schemas
├── frontend/               # React + Vite application
├── data/                   # Local data for testing and curation
├── scripts/                # Utility scripts for setup and maintenance
└── docs/                   # Documentation
```

## Setup & Deployment

### Prerequisites
- Google Cloud Platform (GCP) project.
- `gcloud` CLI installed and authenticated.
- Python 3.11+.
- Node.js & npm.

### 1. Infrastructure Setup
Initialize GCS buckets:
```bash
./scripts/setup_gcs.sh
```

### 2. Backend Deployment
Deploy the API to Cloud Run (or run locally):
```bash
# Local Run
python3 -m uvicorn backend.api.main:app --host 0.0.0.0 --port 8080

# Cloud Deployment
./scripts/deploy_api.sh
```

### 3. Frontend Setup
Install dependencies and run the development server:
```bash
cd frontend
npm install
npm run dev
```

## Usage

### 1. Upload Data
- Open the Frontend (http://localhost:5173).
- Use the **Upload Wizard** to download an E1 or G1 template.
- Fill it out and upload it via the UI.
- The file is sent to the API -> GCS -> Cloud Function -> BigQuery.

### 2. Generate Drafts (AI)
- The API exposes `POST /generate-draft`.
- It queries the "Dual-Core" RAG engine to produce compliant and strategic text based on your uploaded data.

### 3. Validation
- Dataform runs automatically (or on schedule) to validate raw data in BigQuery.
- Validated data is available via `GET /get-validated-data/{standard}`.
