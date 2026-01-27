import os
import datetime
from google.cloud import bigquery

class AuditTrailService:
    def __init__(self):
        self.project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "csrd-copilot")
        self.client = bigquery.Client(project=self.project_id)
        self.dataset_id = "csrd_mvp"
        self.table_id = "audit_logs"
        self._ensure_table_exists()

    def _ensure_table_exists(self):
        """Checks if the audit table exists, creates it if not."""
        table_ref = f"{self.project_id}.{self.dataset_id}.{self.table_id}"
        try:
            self.client.get_table(table_ref)
        except Exception:
            # Table doesn't exist, create it
            schema = [
                bigquery.SchemaField("timestamp", "TIMESTAMP", mode="REQUIRED"),
                bigquery.SchemaField("user_id", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("action", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("details", "STRING", mode="NULLABLE"),
            ]
            table = bigquery.Table(table_ref, schema=schema)
            try:
                self.client.create_table(table)
                print(f"Created audit table: {table_ref}")
            except Exception as e:
                print(f"Error creating audit table (might exist): {e}")

    def log_event(self, user_id: str, action: str, details: str = None):
        """Logs an event to the BigQuery audit table."""
        table_ref = f"{self.project_id}.{self.dataset_id}.{self.table_id}"
        
        rows = [{
            "timestamp": datetime.datetime.now().isoformat(),
            "user_id": user_id,
            "action": action,
            "details": details
        }]
        
        try:
            errors = self.client.insert_rows_json(table_ref, rows)
            if errors:
                print(f"Failed to insert audit log: {errors}")
        except Exception as e:
            print(f"Exception logging audit event: {e}")
