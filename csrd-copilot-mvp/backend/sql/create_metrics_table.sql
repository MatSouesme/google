-- Script pour créer la table de métriques dans BigQuery
-- Dataset: csrd_mvp
-- Table: metrics_events

CREATE TABLE IF NOT EXISTS `csrd-copilot.csrd_mvp.metrics_events` (
  event_id STRING NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  event_type STRING NOT NULL,  -- extraction, ingestion, generation, api_call, user_action, duplicate_detection, data_quality
  metric_name STRING NOT NULL,
  value FLOAT64,
  unit STRING,  -- ms, count, percent, bytes, usd, score
  
  -- Dimensions pour filtrage
  user_email STRING,
  endpoint STRING,
  document_type STRING,  -- pdf, excel, image
  file_size_category STRING,  -- small, medium, large
  page_count INT64,
  kpi_count INT64,
  standard STRING,  -- E1, S1, G1
  
  -- Détails erreurs
  status STRING,  -- success, error
  error_type STRING,
  error_message STRING,
  
  -- Métadonnées JSON
  metadata JSON
)
PARTITION BY DATE(timestamp)
CLUSTER BY event_type, user_email, status
OPTIONS(
  description="Table de métriques pour monitoring et analytics CSRD Copilot",
  labels=[("env", "production"), ("type", "monitoring")]
);

-- Index pour performance
CREATE OR REPLACE VIEW `csrd-copilot.csrd_mvp.metrics_daily_summary` AS
SELECT
  DATE(timestamp) as date,
  event_type,
  status,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_email) as unique_users,
  AVG(value) as avg_value,
  APPROX_QUANTILES(value, 100)[OFFSET(50)] as p50_value,
  APPROX_QUANTILES(value, 100)[OFFSET(95)] as p95_value,
  APPROX_QUANTILES(value, 100)[OFFSET(99)] as p99_value
FROM `csrd-copilot.csrd_mvp.metrics_events`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
GROUP BY date, event_type, status
ORDER BY date DESC, event_count DESC;

-- Vérification
SELECT 
  'Table created successfully' as status,
  COUNT(*) as row_count
FROM `csrd-copilot.csrd_mvp.metrics_events`;
