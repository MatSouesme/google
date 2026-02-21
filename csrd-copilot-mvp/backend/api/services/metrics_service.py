"""
Service de collecte et analyse de métriques pour monitoring
Utilise BigQuery pour stocker les events
"""
from google.cloud import bigquery
import os
import datetime
import time
import json
from typing import Optional, Dict, Any, List
import logging

logger = logging.getLogger(__name__)

class MetricsService:
    def __init__(self):
        self.project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "csrd-copilot")
        self.dataset_id = "csrd_mvp"
        self.metrics_table = f"{self.project_id}.{self.dataset_id}.metrics_events"
        self.bq_client = None
        self._initialized = False
        self._init_failed = False
        
    def _lazy_init(self):
        """Initialise BigQuery seulement au premier usage pour éviter de bloquer le démarrage"""
        if self._initialized or self._init_failed:
            return self._initialized
            
        try:
            self.bq_client = bigquery.Client(project=self.project_id)
            self._ensure_table_exists()
            self._initialized = True
            logger.info("MetricsService initialized successfully")
            return True
        except Exception as e:
            self._init_failed = True
            logger.warning(f"MetricsService initialization failed (non-fatal): {e}")
            return False

    def _ensure_table_exists(self):
        """Crée la table de métriques si elle n'existe pas"""
        try:
            self.bq_client.get_table(self.metrics_table)
        except Exception:
            # Table n'existe pas, on ne la crée pas ici
            # Elle doit être créée manuellement via le script SQL
            logger.info(f"Metrics table {self.metrics_table} should be created manually")
            pass

    def log_event(
        self,
        event_id: str,
        event_type: str,
        metric_name: str,
        value: Optional[float] = None,
        unit: Optional[str] = None,
        user_email: Optional[str] = None,
        endpoint: Optional[str] = None,
        document_type: Optional[str] = None,
        file_size_mb: Optional[float] = None,
        page_count: Optional[int] = None,
        kpi_count: Optional[int] = None,
        standard: Optional[str] = None,
        status: Optional[str] = "success",
        error_type: Optional[str] = None,
        error_message: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log un événement métrique dans BigQuery"""
        print(f"🔔 MetricsService.log_event START: metric={metric_name}, type={event_type}, user={user_email}")
        
        # Lazy init - ne pas bloquer si BigQuery n'est pas disponible
        if not self._lazy_init():
            logger.warning(f"MetricsService not initialized, skipping metric: {metric_name}")
            print(f"🔔 MetricsService NOT INITIALIZED, skipping {metric_name}")
            return  # Échec silencieux, l'app continue normalement
        
        print(f"🔔 MetricsService initialized OK, proceeding with log")
        
        # Catégoriser la taille de fichier
        file_size_category = None
        if file_size_mb is not None:
            if file_size_mb < 1:
                file_size_category = "small"
            elif file_size_mb <= 10:
                file_size_category = "medium"
            else:
                file_size_category = "large"
        
        # Convert metadata dict to JSON string for BigQuery JSON type
        metadata_json = json.dumps(metadata) if metadata else "{}"
        
        row = {
            "event_id": event_id,
            "timestamp": datetime.datetime.now().isoformat(),
            "event_type": event_type,
            "metric_name": metric_name,
            "value": value,
            "unit": unit,
            "user_email": user_email,
            "endpoint": endpoint,
            "document_type": document_type,
            "file_size_category": file_size_category,
            "page_count": page_count,
            "kpi_count": kpi_count,
            "standard": standard,
            "status": status,
            "error_type": error_type,
            "error_message": error_message[:500] if error_message else None,  # Truncate
            "metadata": metadata_json  # BigQuery JSON type requires JSON string, not dict
        }
        
        print(f"🔔 About to insert row to BigQuery: {metric_name}")
        try:
            errors = self.bq_client.insert_rows_json(self.metrics_table, [row])
            print(f"🔔 BigQuery insert completed, errors={errors}")
            if errors:
                logger.error(f"Error inserting metric: {errors}")
            else:
                logger.info(f"✓ Logged metric: {metric_name} = {value} {unit} (user={user_email}, type={event_type})")
        except Exception as e:
            logger.error(f"Exception logging metric: {e}", exc_info=True)

    # ========== EXTRACTION METRICS ==========
    
    def get_extraction_stats(self, days: int = 30) -> Dict[str, Any]:
        """Statistiques d'extraction de documents"""
        if not self._lazy_init():
            return {}  # Retourner un dict vide si BigQuery n'est pas disponible
            
        query = f"""
        WITH extractions AS (
            SELECT 
                value as duration_ms,
                document_type,
                file_size_category,
                page_count,
                kpi_count,
                status,
                error_type,
                timestamp
            FROM `{self.metrics_table}`
            WHERE event_type = 'extraction'
              AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days} DAY)
        )
        SELECT
            -- Temps d'extraction percentiles
            APPROX_QUANTILES(duration_ms, 100)[OFFSET(50)] as p50_ms,
            APPROX_QUANTILES(duration_ms, 100)[OFFSET(95)] as p95_ms,
            APPROX_QUANTILES(duration_ms, 100)[OFFSET(99)] as p99_ms,
            
            -- Par type de document
            COUNTIF(document_type = 'pdf') as pdf_count,
            COUNTIF(document_type = 'excel') as excel_count,
            COUNTIF(document_type = 'image') as image_count,
            
            -- Par taille de fichier
            COUNTIF(file_size_category = 'small') as small_files,
            COUNTIF(file_size_category = 'medium') as medium_files,
            COUNTIF(file_size_category = 'large') as large_files,
            
            -- Taux de succès
            COUNT(*) as total_extractions,
            COUNTIF(status = 'success') as successful_extractions,
            SAFE_DIVIDE(COUNTIF(status = 'success') * 100, COUNT(*)) as success_rate,
            
            -- Erreurs par type
            COUNTIF(error_type = 'format_invalid') as format_errors,
            COUNTIF(error_type = 'ocr_failed') as ocr_errors,
            COUNTIF(error_type = 'timeout') as timeout_errors,
            
            -- KPIs extraits
            AVG(kpi_count) as avg_kpis_per_doc,
            APPROX_QUANTILES(kpi_count, 100)[OFFSET(50)] as median_kpis
        FROM extractions
        """
        
        try:
            results = self.bq_client.query(query).result()
            return dict(list(results)[0]) if results.total_rows > 0 else {}
        except Exception as e:
            logger.error(f"Error fetching extraction stats: {e}")
            return {}

    def get_extraction_timeseries(self, days: int = 30, granularity: str = 'day') -> List[Dict]:
        """Évolution temporelle des extractions"""
        if not self._lazy_init():
            return []  # Retourner une liste vide si BigQuery n'est pas disponible
            
        date_trunc = 'DAY' if granularity == 'day' else 'HOUR'
        
        query = f"""
        SELECT 
            TIMESTAMP_TRUNC(timestamp, {date_trunc}) as period,
            COUNT(*) as total_docs,
            AVG(value) as avg_duration_ms,
            AVG(kpi_count) as avg_kpis_extracted,
            SAFE_DIVIDE(COUNTIF(status = 'success') * 100, COUNT(*)) as success_rate
        FROM `{self.metrics_table}`
        WHERE event_type = 'extraction'
          AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days} DAY)
        GROUP BY period
        ORDER BY period DESC
        """
        
        try:
            results = self.bq_client.query(query).result()
            return [dict(row) for row in results]
        except Exception as e:
            logger.error(f"Error fetching timeseries: {e}")
            return []

    def get_confidence_distribution(self, days: int = 30) -> Dict[str, Any]:
        """Distribution des scores de confiance"""
        if not self._lazy_init():
            return {}  # Retourner un dict vide si BigQuery n'est pas disponible
            
        query = f"""
        SELECT 
            ROUND(value, 1) as confidence_bucket,
            COUNT(*) as count
        FROM `{self.metrics_table}`
        WHERE metric_name = 'extraction_confidence'
          AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days} DAY)
        GROUP BY confidence_bucket
        ORDER BY confidence_bucket
        """
        
        try:
            results = self.bq_client.query(query).result()
            return {
                "distribution": [dict(row) for row in results],
                "avg_confidence": self._get_avg_metric('extraction_confidence', days)
            }
        except Exception as e:
            logger.error(f"Error fetching confidence distribution: {e}")
            return {}

    # ========== DUPLICATE DETECTION METRICS ==========
    
    def get_duplicate_stats(self, days: int = 30) -> Dict[str, Any]:
        """Statistiques de détection de doublons"""
        if not self._lazy_init():
            return {}  # Retourner un dict vide si BigQuery n'est pas disponible
            
        query = f"""
        WITH duplicates AS (
            SELECT 
                value as conflicts_detected,
                metadata
            FROM `{self.metrics_table}`
            WHERE metric_name = 'duplicate_conflicts_found'
              AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days} DAY)
        ),
        actions AS (
            SELECT 
                JSON_VALUE(metadata, '$.action') as action
            FROM `{self.metrics_table}`
            WHERE metric_name = 'duplicate_resolution'
              AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days} DAY)
        )
        SELECT
            (SELECT COUNT(*) FROM duplicates) as total_checks,
            (SELECT SUM(conflicts_detected) FROM duplicates) as total_conflicts,
            (SELECT COUNTIF(action = 'add') FROM actions) as action_add,
            (SELECT COUNTIF(action = 'replace') FROM actions) as action_replace,
            (SELECT COUNTIF(action = 'skip') FROM actions) as action_skip
        """
        
        try:
            results = self.bq_client.query(query).result()
            data = dict(list(results)[0]) if results.total_rows > 0 else {}
            
            # Calculer taux de détection
            if data.get('total_checks', 0) > 0:
                data['detection_rate'] = round(data['total_conflicts'] / data['total_checks'] * 100, 2)
            else:
                data['detection_rate'] = 0.0
            
            return data
        except Exception as e:
            logger.error(f"Error fetching duplicate stats: {e}")
            return {}

    # ========== DATA QUALITY METRICS ==========
    
    def get_data_quality_stats(self, days: int = 30) -> Dict[str, Any]:
        """Statistiques de qualité des données"""
        if not self._lazy_init():
            return {}  # Retourner un dict vide si BigQuery n'est pas disponible
            
        query = f"""
        SELECT
            -- Taux de rejet
            COUNTIF(metric_name = 'datapoint_deleted') as deleted_count,
            COUNTIF(metric_name = 'datapoint_modified') as modified_count,
            COUNTIF(metric_name = 'datapoint_validated') as validated_count,
            
            -- Complétude par standard
            AVG(CASE WHEN JSON_VALUE(metadata, '$.standard') = 'E1' THEN value END) as e1_completeness,
            AVG(CASE WHEN JSON_VALUE(metadata, '$.standard') = 'S1' THEN value END) as s1_completeness,
            AVG(CASE WHEN JSON_VALUE(metadata, '$.standard') = 'G1' THEN value END) as g1_completeness
        FROM `{self.metrics_table}`
        WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days} DAY)
          AND event_type = 'data_quality'
        """
        
        try:
            results = self.bq_client.query(query).result()
            return dict(list(results)[0]) if results.total_rows > 0 else {}
        except Exception as e:
            logger.error(f"Error fetching data quality stats: {e}")
            return {}

    # ========== API PERFORMANCE METRICS ==========
    
    def get_endpoint_performance(self, days: int = 7) -> List[Dict]:
        """Performance par endpoint"""
        if not self._lazy_init():
            return []  # Retourner une liste vide si BigQuery n'est pas disponible
            
        query = f"""
        SELECT 
            endpoint,
            COUNT(*) as request_count,
            ROUND(APPROX_QUANTILES(value, 100)[OFFSET(50)], 1) as p50_latency_ms,
            ROUND(APPROX_QUANTILES(value, 100)[OFFSET(95)], 1) as p95_latency_ms,
            ROUND(APPROX_QUANTILES(value, 100)[OFFSET(99)], 1) as p99_latency_ms,
            ROUND(SAFE_DIVIDE(COUNTIF(status = 'error') * 100, COUNT(*)), 2) as error_rate,
            ROUND(AVG(SAFE_CAST(JSON_VALUE(metadata, '$.payload_size_kb') AS FLOAT64)), 1) as avg_payload_kb
        FROM `{self.metrics_table}`
        WHERE event_type = 'api_call'
          AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days} DAY)
        GROUP BY endpoint
        HAVING COUNT(*) >= 2
        ORDER BY request_count DESC
        """
        
        try:
            results = self.bq_client.query(query).result()
            return [dict(row) for row in results]
        except Exception as e:
            logger.error(f"Error fetching endpoint performance: {e}")
            return []

    # ========== USER ENGAGEMENT METRICS ==========
    
    def get_user_engagement(self, days: int = 30) -> Dict[str, Any]:
        """Métriques d'engagement utilisateur"""
        if not self._lazy_init():
            return {}  # Retourner un dict vide si BigQuery n'est pas disponible
            
        query = f"""
        WITH user_sessions AS (
            SELECT 
                user_email,
                DATE(timestamp) as session_date,
                COUNT(*) as actions
            FROM `{self.metrics_table}`
            WHERE event_type = 'user_action'
              AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days} DAY)
              AND user_email IS NOT NULL
            GROUP BY user_email, session_date
        ),
        daily_users AS (
            SELECT 
                session_date,
                COUNT(DISTINCT user_email) as dau
            FROM user_sessions
            GROUP BY session_date
        ),
        weekly_users AS (
            SELECT 
                DATE_TRUNC(session_date, WEEK) as week,
                COUNT(DISTINCT user_email) as wau
            FROM user_sessions
            GROUP BY week
        )
        SELECT
            COALESCE((SELECT AVG(dau) FROM daily_users), 0) as avg_dau,
            COALESCE((SELECT MAX(wau) FROM weekly_users), 0) as max_wau,
            COUNT(DISTINCT user_email) as total_active_users,
            COALESCE(AVG(actions), 0) as avg_actions_per_session
        FROM user_sessions
        """
        
        try:
            results = self.bq_client.query(query).result()
            data = dict(list(results)[0]) if results.total_rows > 0 else {}
            
            # Convert NoneType to 0 for safe comparison
            for key in ['avg_dau', 'max_wau', 'total_active_users', 'avg_actions_per_session']:
                if data.get(key) is None:
                    data[key] = 0
            
            # Calculer stickiness (DAU/MAU)
            if data.get('max_wau', 0) > 0:
                data['stickiness'] = round(data.get('avg_dau', 0) / data['max_wau'] * 100, 2)
            else:
                data['stickiness'] = 0.0
            
            return data
        except Exception as e:
            logger.error(f"Error fetching user engagement: {e}")
            return {}

    def get_feature_adoption(self, days: int = 30) -> List[Dict]:
        """Taux d'adoption des features"""
        if not self._lazy_init():
            return []  # Retourner une liste vide si BigQuery n'est pas disponible
            
        query = f"""
        SELECT 
            JSON_VALUE(metadata, '$.feature') as feature,
            COUNT(DISTINCT user_email) as unique_users,
            COUNT(*) as usage_count
        FROM `{self.metrics_table}`
        WHERE metric_name = 'feature_used'
          AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days} DAY)
        GROUP BY feature
        ORDER BY unique_users DESC
        """
        
        try:
            results = self.bq_client.query(query).result()
            return [dict(row) for row in results]
        except Exception as e:
            logger.error(f"Error fetching feature adoption: {e}")
            return []

    # ========== VERTEX AI METRICS ==========
    
    def get_vertex_ai_stats(self, days: int = 30) -> Dict[str, Any]:
        """Statistiques Vertex AI (tokens, coûts)"""
        if not self._lazy_init():
            return {}  # Retourner un dict vide si BigQuery n'est pas disponible
            
        query = f"""
        SELECT 
            SUM(CAST(JSON_VALUE(metadata, '$.input_tokens') AS INT64)) as total_input_tokens,
            SUM(CAST(JSON_VALUE(metadata, '$.output_tokens') AS INT64)) as total_output_tokens,
            SUM(value) as total_cost_usd,
            COUNT(*) as total_calls,
            AVG(value) as avg_cost_per_call
        FROM `{self.metrics_table}`
        WHERE metric_name = 'vertex_ai_call'
          AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days} DAY)
        """
        
        try:
            results = self.bq_client.query(query).result()
            return dict(list(results)[0]) if results.total_rows > 0 else {}
        except Exception as e:
            logger.error(f"Error fetching Vertex AI stats: {e}")
            return {}

    # ========== HELPER METHODS ==========
    
    def _get_avg_metric(self, metric_name: str, days: int = 30) -> float:
        """Helper pour récupérer la moyenne d'une métrique"""
        if not self._lazy_init():
            return 0.0  # Retourner 0.0 si BigQuery n'est pas disponible
            
        query = f"""
        SELECT AVG(value) as avg_value
        FROM `{self.metrics_table}`
        WHERE metric_name = @metric_name
          AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days} DAY)
        """
        
        job_config = bigquery.QueryJobConfig(
            query_parameters=[bigquery.ScalarQueryParameter("metric_name", "STRING", metric_name)]
        )
        
        try:
            results = self.bq_client.query(query, job_config=job_config).result()
            row = list(results)[0]
            return float(row['avg_value']) if row['avg_value'] is not None else 0.0
        except Exception:
            return 0.0
