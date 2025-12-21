CREATE TABLE IF NOT EXISTS `csrd_mvp.data_lineage` (
    lineage_id STRING,
    upload_id STRING,
    kpi_id STRING,
    source_filename STRING,
    page_number INT64,
    snippet STRING,
    confidence FLOAT64,
    ingestion_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS `csrd_mvp.documents_content` (
    document_id STRING,
    upload_id STRING,
    filename STRING,
    content_text STRING,
    ingestion_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);
