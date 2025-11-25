import csv
import uuid
import logging
import os
from google.cloud import bigquery
from google.cloud import storage
import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def ingest_csv(event, context):
    """
    Cloud Function triggered by GCS upload.
    - Detect which standard (E1/G1)
    - Insert rows into BigQuery raw table
    - Add audit trail (source_file, row_number, upload_id)
    """
    try:
        bucket_name = event["bucket"]
        file_name = event["name"]
        
        logger.info(f"Processing file: {file_name} from bucket: {bucket_name}")

        # Get Project ID from environment
        project_id = os.environ.get("GCP_PROJECT") or os.environ.get("GOOGLE_CLOUD_PROJECT")
        if not project_id:
             # Fallback or error if needed, but Cloud Functions usually have this.
             # For local testing, it might be missing.
             logger.warning("GCP_PROJECT env var not found, assuming default client project.")
        
        dataset_id = "csrd_mvp"

        # Detect standard based on file name
        if "e1" in file_name.lower():
            table_id = f"{project_id}.{dataset_id}.e1_raw" if project_id else f"{dataset_id}.e1_raw"
        elif "g1" in file_name.lower():
            table_id = f"{project_id}.{dataset_id}.g1_raw" if project_id else f"{dataset_id}.g1_raw"
        else:
            logger.warning(f"File {file_name} does not match E1/G1 naming convention. Skipping.")
            return

        upload_id = str(uuid.uuid4())
        bq_client = bigquery.Client()
        storage_client = storage.Client()

        # Download file contents
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(file_name)
        content = blob.download_as_text()
        
        # Parse CSV
        # Using splitlines() to handle universal newlines
        reader = csv.DictReader(content.splitlines())
        rows_to_insert = []
        
        current_time = datetime.datetime.utcnow().isoformat()

        for idx, row in enumerate(reader):
            # Add audit columns
            row["source_file"] = file_name
            row["row_number"] = idx + 1
            row["upload_id"] = upload_id
            row["ingestion_timestamp"] = current_time
            
            # Basic cleaning: remove empty keys if any
            if None in row:
                del row[None]
                
            rows_to_insert.append(row)

        if not rows_to_insert:
            logger.warning(f"No rows found in file {file_name}.")
            return

        # Insert into BigQuery
        # ignore_unknown_values=True allows the upload to succeed even if the CSV has extra columns
        # that are not in the BigQuery schema.
        errors = bq_client.insert_rows_json(table_id, rows_to_insert, ignore_unknown_values=True)

        if errors:
            logger.error(f"BigQuery insertion errors: {errors}")
            # In a production scenario, we might want to write these to a DLQ
            raise RuntimeError(f"Failed to insert rows into {table_id}: {errors}")
        else:
            logger.info(f"Successfully inserted {len(rows_to_insert)} rows into {table_id} for upload_id={upload_id}")

    except Exception as e:
        logger.exception(f"Error processing file {file_name}: {e}")
        raise
