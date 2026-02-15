from google.cloud import bigquery, storage
import os
from typing import Optional, List, Dict, Any
import datetime

class LineageService:
    def __init__(self):
        self.project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "csrd-copilot")
        self.bq_client = bigquery.Client(project=self.project_id)
        self.storage_client = storage.Client(project=self.project_id)
        self.dataset_id = "csrd_mvp"
        self.lineage_table = f"{self.project_id}.{self.dataset_id}.data_lineage"
        self._ensure_table_exists()

    def _ensure_table_exists(self):
        """Creates the lineage table if it doesn't exist."""
        try:
            self.bq_client.get_table(self.lineage_table)
        except Exception:
            schema = [
                bigquery.SchemaField("lineage_id", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("kpi_id", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("value", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("unit", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("date", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("source_type", "STRING", mode="REQUIRED"),  # 'manual', 'pdf', 'excel', 'api'
                bigquery.SchemaField("source_filename", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("source_url", "STRING", mode="NULLABLE"),  # GCS path
                bigquery.SchemaField("page_number", "INTEGER", mode="NULLABLE"),
                bigquery.SchemaField("snippet", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("confidence", "FLOAT", mode="NULLABLE"),
                bigquery.SchemaField("user_email", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("ingestion_timestamp", "TIMESTAMP", mode="REQUIRED"),
                bigquery.SchemaField("upload_id", "STRING", mode="NULLABLE"),
            ]
            table = bigquery.Table(self.lineage_table, schema=schema)
            try:
                self.bq_client.create_table(table)
                print(f"Created lineage table: {self.lineage_table}")
            except Exception as e:
                print(f"Error creating lineage table: {e}")

    def record_lineage(
        self,
        lineage_id: str,
        kpi_id: str,
        value: str,
        source_type: str,
        user_email: str,
        unit: Optional[str] = None,
        date: Optional[str] = None,
        source_filename: Optional[str] = None,
        source_url: Optional[str] = None,
        page_number: Optional[int] = None,
        snippet: Optional[str] = None,
        confidence: Optional[float] = None,
        upload_id: Optional[str] = None,
    ):
        """Records a lineage entry."""
        row = {
            "lineage_id": lineage_id,
            "kpi_id": kpi_id,
            "value": str(value),
            "unit": unit,
            "date": date,
            "source_type": source_type,
            "source_filename": source_filename,
            "source_url": source_url,
            "page_number": page_number,
            "snippet": snippet,
            "confidence": confidence,
            "user_email": user_email,
            "ingestion_timestamp": datetime.datetime.now().isoformat(),
            "upload_id": upload_id,
        }

        try:
            errors = self.bq_client.insert_rows_json(self.lineage_table, [row])
            if errors:
                print(f"[LINEAGE] ❌ BigQuery insert errors: {errors}")
                return False
            print(f"[LINEAGE] ✅ Recorded lineage: KPI={kpi_id}, value={value}, file={source_filename}")
            return True
        except Exception as e:
            print(f"[LINEAGE] ❌ Exception recording lineage: {e}")
            return False

    def get_lineage_by_kpi(self, kpi_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves all lineage entries for a specific KPI (downstream tracing)."""
        query = f"""
            SELECT *
            FROM `{self.lineage_table}`
            WHERE kpi_id = @kpi_id
            ORDER BY ingestion_timestamp DESC
            LIMIT {limit}
        """
        job_config = bigquery.QueryJobConfig(
            query_parameters=[bigquery.ScalarQueryParameter("kpi_id", "STRING", kpi_id)]
        )
        
        try:
            results = self.bq_client.query(query, job_config=job_config)
            return [dict(row) for row in results]
        except Exception as e:
            print(f"Error querying lineage: {e}")
            return []

    def get_lineage_by_source(self, source_filename: str) -> List[Dict[str, Any]]:
        """Retrieves all KPIs derived from a specific source document (upstream tracing)."""
        query = f"""
            SELECT *
            FROM `{self.lineage_table}`
            WHERE source_filename = @source_filename
            ORDER BY kpi_id, ingestion_timestamp DESC
        """
        job_config = bigquery.QueryJobConfig(
            query_parameters=[bigquery.ScalarQueryParameter("source_filename", "STRING", source_filename)]
        )
        
        try:
            results = self.bq_client.query(query, job_config=job_config)
            return [dict(row) for row in results]
        except Exception as e:
            print(f"Error querying lineage by source: {e}")
            return []

    def get_source_document(self, source_url: str) -> Optional[bytes]:
        """Downloads the source document from GCS."""
        if not source_url or not source_url.startswith("gs://"):
            return None
        
        try:
            # Parse gs://bucket/path
            parts = source_url.replace("gs://", "").split("/", 1)
            bucket_name = parts[0]
            blob_path = parts[1] if len(parts) > 1 else ""
            
            bucket = self.storage_client.bucket(bucket_name)
            blob = bucket.blob(blob_path)
            return blob.download_as_bytes()
        except Exception as e:
            print(f"Error downloading source document: {e}")
            return None

    def get_all_sources(self) -> List[Dict[str, Any]]:
        """Returns a list of all unique source documents."""
        query = f"""
            SELECT DISTINCT
                source_filename,
                source_type,
                COUNT(DISTINCT kpi_id) as kpi_count,
                MIN(ingestion_timestamp) as first_used,
                MAX(ingestion_timestamp) as last_used
            FROM `{self.lineage_table}`
            WHERE source_filename IS NOT NULL
            GROUP BY source_filename, source_type
            ORDER BY last_used DESC
        """
        
        try:
            results = self.bq_client.query(query)
            sources_list = [dict(row) for row in results]
            print(f"[LINEAGE] Retrieved {len(sources_list)} unique source documents")
            return sources_list
        except Exception as e:
            print(f"Error querying sources: {e}")
            return []

    def search_by_value(self, value: str, standard: Optional[str] = None) -> List[Dict[str, Any]]:
        """Search for lineage entries by value (and optionally by standard prefix in KPI ID)."""
        # Clean the value for search (remove commas, spaces)
        clean_value = value.replace(',', '').replace(' ', '').strip()
        
        if standard:
            # Search with standard filter (E1, G1, etc.)
            query = f"""
                SELECT *
                FROM `{self.lineage_table}`
                WHERE REPLACE(REPLACE(value, ',', ''), ' ', '') LIKE @value
                  AND UPPER(kpi_id) LIKE @standard_pattern
                ORDER BY confidence DESC, ingestion_timestamp DESC
                LIMIT 50
            """
            job_config = bigquery.QueryJobConfig(
                query_parameters=[
                    bigquery.ScalarQueryParameter("value", "STRING", f"%{clean_value}%"),
                    bigquery.ScalarQueryParameter("standard_pattern", "STRING", f"{standard.upper()}%")
                ]
            )
        else:
            # Search without standard filter
            query = f"""
                SELECT *
                FROM `{self.lineage_table}`
                WHERE REPLACE(REPLACE(value, ',', ''), ' ', '') LIKE @value
                ORDER BY confidence DESC, ingestion_timestamp DESC
                LIMIT 50
            """
            job_config = bigquery.QueryJobConfig(
                query_parameters=[
                    bigquery.ScalarQueryParameter("value", "STRING", f"%{clean_value}%")
                ]
            )
        
        try:
            results = self.bq_client.query(query, job_config=job_config)
            return [dict(row) for row in results]
        except Exception as e:
            print(f"Error searching lineage by value: {e}")
            return []
