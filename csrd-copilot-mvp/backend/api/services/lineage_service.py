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
        """Search for lineage entries by value (and optionally by standard prefix in KPI ID).
        If no exact match is found, performs a proximity search to find the closest numeric value."""
        # Clean the value for search (remove commas, spaces)
        clean_value = value.replace(',', '').replace(' ', '').strip()
        print(f"[LINEAGE] search_by_value called: value='{value}' clean='{clean_value}' standard='{standard}'", flush=True)
        
        # --- Strategy 1: LIKE match (exact substring) ---
        if standard:
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
            rows = [dict(row) for row in results]
            if rows:
                print(f"[LINEAGE] Exact match found: {len(rows)} results", flush=True)
                return rows
        except Exception as e:
            print(f"Error searching lineage by value: {e}")
        
        # --- Strategy 2: Proximity search — find closest numeric value ---
        # Extract numeric part from the search value
        import re
        numeric_str = re.sub(r'[^\d.]', '', clean_value)
        if not numeric_str:
            print(f"[LINEAGE] No numeric part found in '{clean_value}', giving up", flush=True)
            return []
        
        try:
            search_num = float(numeric_str)
        except ValueError:
            print(f"[LINEAGE] Cannot parse '{numeric_str}' as number, giving up", flush=True)
            return []
        
        print(f"[LINEAGE] No exact match, trying proximity search for {search_num} (standard={standard})", flush=True)
        
        # Fetch all numeric values for this standard and find closest
        std_filter = ""
        params = []
        if standard:
            std_filter = "AND UPPER(kpi_id) LIKE @standard_pattern"
            params.append(bigquery.ScalarQueryParameter("standard_pattern", "STRING", f"{standard.upper()}%"))
        
        proximity_query = f"""
            SELECT * FROM (
                SELECT *,
                       SAFE_CAST(REGEXP_REPLACE(REPLACE(REPLACE(value, ',', ''), ' ', ''), r'[^0-9.]', '') AS FLOAT64) AS numeric_val
                FROM `{self.lineage_table}`
                WHERE value IS NOT NULL
                  {std_filter}
            )
            WHERE numeric_val IS NOT NULL
            ORDER BY ABS(numeric_val - @search_num) ASC
            LIMIT 10
        """
        params.append(bigquery.ScalarQueryParameter("search_num", "FLOAT64", search_num))
        
        try:
            job_config = bigquery.QueryJobConfig(query_parameters=params)
            results = self.bq_client.query(proximity_query, job_config=job_config)
            rows = [dict(row) for row in results]
            # Remove the temporary numeric_val column
            for row in rows:
                row.pop('numeric_val', None)
            if rows:
                closest_val = rows[0].get('value', '?')
                print(f"[LINEAGE] Proximity match: searched {search_num}, closest BQ value = {closest_val} ({len(rows)} results)", flush=True)
            else:
                print(f"[LINEAGE] No proximity results found", flush=True)
            return rows
        except Exception as e:
            print(f"[LINEAGE] Proximity search error: {e}", flush=True)
            return []

    def get_all_for_standard(self, standard: str) -> List[Dict[str, Any]]:
        """Returns all distinct KPI values for a standard — used to build value→KPI mappings."""
        query = f"""
            SELECT DISTINCT kpi_id, value, unit, source_filename, page_number, confidence,
                   snippet, ingestion_timestamp
            FROM `{self.lineage_table}`
            WHERE UPPER(kpi_id) LIKE @standard_pattern
              AND value IS NOT NULL
            ORDER BY kpi_id, ingestion_timestamp DESC
        """
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("standard_pattern", "STRING", f"{standard.upper()}%")
            ]
        )
        try:
            results = self.bq_client.query(query, job_config=job_config)
            rows = [dict(row) for row in results]
            print(f"[LINEAGE] get_all_for_standard({standard}): {len(rows)} entries", flush=True)
            return rows
        except Exception as e:
            print(f"Error fetching lineage for standard: {e}")
            return []
