-- Table pour stocker les commentaires sur les KPIs et data points
-- Système de discussion type Google Sheets pour collaboration Contributor/Auditor

DROP TABLE IF EXISTS `csrd-copilot.csrd_mvp.kpi_comments`;

CREATE TABLE `csrd-copilot.csrd_mvp.kpi_comments` (
    comment_id STRING NOT NULL,
    parent_comment_id STRING,
    
    -- Contexte du commentaire
    kpi_id STRING NOT NULL,
    data_source STRING,
    reference_id STRING,
    
    -- Contenu du commentaire
    comment_text STRING NOT NULL,
    comment_type STRING,
    
    -- Métadonnées utilisateur
    author_email STRING NOT NULL,
    author_name STRING,
    author_role STRING,
    
    -- Résolution (pour les questions/alertes)
    is_resolved BOOLEAN,
    resolved_by STRING,
    resolved_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    
    -- Mentions et notifications
    mentioned_users ARRAY<STRING>,
    
    -- Métadonnées additionnelles
    attachments ARRAY<STRING>,
    tags ARRAY<STRING>
)
PARTITION BY DATE(created_at)
CLUSTER BY kpi_id, comment_type
OPTIONS(
    partition_expiration_days=365
);
