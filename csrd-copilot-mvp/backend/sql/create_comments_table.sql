-- Table pour stocker les commentaires sur les KPIs et data points
-- Système de discussion type Google Sheets pour collaboration Contributor/Auditor

CREATE TABLE IF NOT EXISTS `csrd-copilot.csrd_mvp.kpi_comments` (
    comment_id STRING NOT NULL,           -- UUID du commentaire
    parent_comment_id STRING,             -- NULL si commentaire racine, sinon ID du parent (thread)
    
    -- Contexte du commentaire
    kpi_id STRING NOT NULL,               -- ID du KPI (ex: "E1-1", "G1-3")
    data_source STRING,                   -- Source: "manual_entry", "uploaded_data", "generated_draft"
    reference_id STRING,                  -- ID de référence (manual entry ID, upload_id, etc.)
    
    -- Contenu du commentaire
    comment_text STRING NOT NULL,
    comment_type STRING DEFAULT 'comment', -- "comment", "question", "alert", "resolved"
    
    -- Métadonnées utilisateur
    author_email STRING NOT NULL,
    author_name STRING,
    author_role STRING,                   -- "admin", "editor", "reader", "auditor"
    
    -- Résolution (pour les questions/alertes)
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by STRING,                   -- Email de qui a résolu
    resolved_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    updated_at TIMESTAMP,
    
    -- Mentions et notifications
    mentioned_users ARRAY<STRING>,        -- Liste d'emails mentionnés avec @
    
    -- Métadonnées additionnelles
    attachments ARRAY<STRING>,            -- URLs vers des pièces jointes éventuelles
    tags ARRAY<STRING>                    -- Tags optionnels (ex: ["urgent", "data_quality"])
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_kpi_comments_kpi 
ON `csrd-copilot.csrd_mvp.kpi_comments`(kpi_id);

CREATE INDEX IF NOT EXISTS idx_kpi_comments_parent 
ON `csrd-copilot.csrd_mvp.kpi_comments`(parent_comment_id);

CREATE INDEX IF NOT EXISTS idx_kpi_comments_author 
ON `csrd-copilot.csrd_mvp.kpi_comments`(author_email);

-- Vue pour les threads de commentaires (avec counts)
CREATE OR REPLACE VIEW `csrd-copilot.csrd_mvp.kpi_comment_threads` AS
SELECT 
    kpi_id,
    COUNT(DISTINCT comment_id) as total_comments,
    COUNT(DISTINCT CASE WHEN parent_comment_id IS NULL THEN comment_id END) as thread_count,
    COUNT(DISTINCT CASE WHEN is_resolved = FALSE AND comment_type IN ('question', 'alert') THEN comment_id END) as unresolved_count,
    MAX(created_at) as last_activity,
    ARRAY_AGG(DISTINCT author_email IGNORE NULLS) as participants
FROM `csrd-copilot.csrd_mvp.kpi_comments`
GROUP BY kpi_id;
