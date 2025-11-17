import csv
import uuid
from google.cloud import bigquery

def ingest_csv(event, context):
    """
    Cloud Function triggered by GCS upload.
    - Detect which standard (E1/G1)
    - Insert rows into BigQuery raw table
    - Add audit trail (source_file, row_number, upload_id)
    """

    bucket = event["bucket"]
    file_name = event["name"]

    # Detect standard based on file name
    if "e1" in file_name.lower():
        table = "csrd-copilot.csrd_mvp.e1_raw"
    elif "g1" in file_name.lower():
        table = "csrd-copilot.csrd_mvp.g1_raw"
    else:
        print(f"File {file_name} does not match E1/G1 naming.")
        return

    upload_id = str(uuid.uuid4())
    client = bigquery.Client()

    # Download file contents
    from google.cloud import storage
    storage_client = storage.Client()
    bucket_obj = storage_client.bucket(bucket)
    blob = bucket_obj.blob(file_name)
    content = blob.download_as_text().splitlines()

    reader = csv.DictReader(content)
    rows_to_insert = []

    for idx, row in enumerate(reader):
        row["source_file"] = file_name
        row["row_number"] = idx + 1
        row["upload_id"] = upload_id
        rows_to_insert.append(row)

    errors = client.insert_rows_json(table, rows_to_insert)

    if errors:
        print(f"BigQuery insertion errors: {errors}")
    else:
        print(f"Inserted {len(rows_to_insert)} rows into {table} for upload_id={upload_id}")
