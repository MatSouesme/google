-- Table pour tracer l'historique des événements sur les commentaires
-- Permet de calculer les temps de résolution et avoir un audit trail complet

CREATE TABLE IF NOT EXISTS `csrd-copilot.csrd_mvp.comment_events` (
    event_id STRING NOT NULL,
    comment_id STRING NOT NULL,
    event_type STRING NOT NULL, -- 'resolve', 'unresolve', 'edit', 'delete'
    user_email STRING NOT NULL,
    user_name STRING,
    event_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    notes STRING, -- Note optionnelle sur la résolution
    metadata JSON -- Données additionnelles (ex: temps écoulé, raison, etc.)
)
PARTITION BY DATE(event_timestamp)
CLUSTER BY comment_id, event_type
OPTIONS (
    description = "Historique des événements sur les commentaires (résolution, édition, etc.)",
    labels = [("component", "comments"), ("type", "audit_trail")]
);

-- Index pour recherche rapide par comment_id
-- Note: BigQuery crée automatiquement des indexes sur les colonnes de clustering
