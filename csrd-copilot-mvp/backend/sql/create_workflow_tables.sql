CREATE TABLE IF NOT EXISTS `csrd_mvp.draft_history` (
    draft_id STRING,
    user_id STRING,
    topic STRING,
    standard STRING,
    content STRING,
    audit_report STRING,
    source_data STRING,
    status STRING, -- 'DRAFT', 'APPROVED', 'ARCHIVED'
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
