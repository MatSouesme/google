# Script pour créer la table kpi_comments dans BigQuery
$ErrorActionPreference = "Continue"

$PROJECT_ID = "csrd-copilot"
Write-Host "Creating kpi_comments table in project: $PROJECT_ID" -ForegroundColor Cyan

# Créer la table directement avec bq mk
Write-Host "`nCreating table with bq mk command..." -ForegroundColor Yellow

bq mk `
  --table `
  --project_id=$PROJECT_ID `
  --time_partitioning_field=created_at `
  --time_partitioning_type=DAY `
  --time_partitioning_expiration=31536000 `
  --clustering_fields=kpi_id,comment_type `
  --description="KPI comments with 1-year retention" `
  csrd_mvp.kpi_comments `
  comment_id:STRING,parent_comment_id:STRING,kpi_id:STRING,data_source:STRING,reference_id:STRING,comment_text:STRING,comment_type:STRING,author_email:STRING,author_name:STRING,author_role:STRING,is_resolved:BOOLEAN,resolved_by:STRING,resolved_at:TIMESTAMP,created_at:TIMESTAMP,updated_at:TIMESTAMP,mentioned_users:STRING,attachments:STRING,tags:STRING

Write-Host "`nChecking if table exists..." -ForegroundColor Yellow
bq show csrd-copilot:csrd_mvp.kpi_comments

Write-Host "`nSetup completed!" -ForegroundColor Green
