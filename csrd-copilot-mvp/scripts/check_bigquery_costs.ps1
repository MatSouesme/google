# Commandes de monitoring des coûts BigQuery
# À exécuter régulièrement pendant la première semaine

Write-Host "=== MONITORING DES COÛTS BIGQUERY ===" -ForegroundColor Cyan

# 1. Vérifier le nombre d'events dans la table
Write-Host "`n1. Nombre d'events loggés:" -ForegroundColor Yellow
bq query --use_legacy_sql=false "
  SELECT 
    event_type,
    COUNT(*) as count,
    ROUND(SUM(LENGTH(TO_JSON_STRING(STRUCT(
      event_id, timestamp, metric_name, value, user_email, metadata
    )))) / 1024 / 1024, 2) as size_mb
  FROM \`csrd-copilot.csrd_mvp.metrics_events\`
  GROUP BY event_type
  ORDER BY count DESC
"

# 2. Coût estimé des queries sur 7 derniers jours
Write-Host "`n2. Coût estimé des queries (7 derniers jours):" -ForegroundColor Yellow
bq query --use_legacy_sql=false "
  SELECT 
    DATE(creation_time) as date,
    user_email,
    COUNT(*) as query_count,
    ROUND(SUM(total_bytes_processed) / POW(10, 12), 3) as TB_processed,
    ROUND(SUM(total_bytes_processed) / POW(10, 12) * 5, 2) as estimated_cost_usd
  FROM \`region-europe-west1.INFORMATION_SCHEMA.JOBS_BY_PROJECT\`
  WHERE creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
    AND statement_type = 'SELECT'
    AND job_type = 'QUERY'
  GROUP BY date, user_email
  ORDER BY date DESC, TB_processed DESC
  LIMIT 20
"

# 3. Taille totale du dataset
Write-Host "`n3. Taille du dataset csrd_mvp:" -ForegroundColor Yellow
bq show --format=prettyjson csrd-copilot:csrd_mvp | ConvertFrom-Json | Select-Object -ExpandProperty numBytes | ForEach-Object {
  $sizeMB = [math]::Round($_ / 1024 / 1024, 2)
  $costMonth = [math]::Round($sizeMB / 1024 * 0.02, 4)
  Write-Host "  Taille: $sizeMB MB" -ForegroundColor White
  Write-Host "  Coût estimé: `$$costMonth/mois" -ForegroundColor $(if ($costMonth -gt 0.10) { "Red" } else { "Green" })
}

# 4. Top 10 queries les plus coûteuses
Write-Host "`n4. Top 10 queries les plus coûteuses:" -ForegroundColor Yellow
bq query --use_legacy_sql=false "
  SELECT 
    SUBSTR(query, 1, 100) as query_preview,
    total_bytes_processed / POW(10, 9) as GB_processed,
    ROUND(total_bytes_processed / POW(10, 12) * 5, 4) as cost_usd,
    creation_time
  FROM \`region-europe-west1.INFORMATION_SCHEMA.JOBS_BY_PROJECT\`
  WHERE creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
    AND statement_type = 'SELECT'
  ORDER BY total_bytes_processed DESC
  LIMIT 10
"

# 5. Résumé des coûts
Write-Host "`n=== RÉSUMÉ ===" -ForegroundColor Cyan
Write-Host "Si vous voyez:" -ForegroundColor White
Write-Host "  - Taille < 1 GB: ✅ Excellent" -ForegroundColor Green
Write-Host "  - Coût queries < $1/mois: ✅ Dans le free tier" -ForegroundColor Green
Write-Host "  - TB_processed > 1: ⚠️  Risque de dépasser le free tier" -ForegroundColor Yellow
Write-Host "  - Cost > $5: 🚨 Action requise" -ForegroundColor Red

Write-Host "`nPour surveiller en temps réel:" -ForegroundColor Cyan
Write-Host "https://console.cloud.google.com/bigquery?project=csrd-copilot&p=csrd-copilot&d=csrd_mvp&page=dataset" -ForegroundColor Blue
