# Script pour créer un Budget Alert dans GCP
# OBLIGATOIRE AVANT DÉPLOIEMENT pour éviter les surprises financières

# 1. Récupérer le billing account ID
$BILLING_ACCOUNT_ID = gcloud billing accounts list --format="value(name)" --limit=1

Write-Host "Billing Account ID: $BILLING_ACCOUNT_ID" -ForegroundColor Cyan

# 2. Créer un topic Pub/Sub pour les alertes
Write-Host "`nCréation du topic Pub/Sub pour les alertes budget..." -ForegroundColor Yellow
gcloud pubsub topics create budget-alerts --project csrd-copilot

# 3. Créer le budget avec alertes à 50%, 80%, 100%
Write-Host "`nCréation du budget avec seuil à $10/mois..." -ForegroundColor Yellow

# Note: Les budgets ne peuvent être créés que via l'API REST ou la Console
# pour PowerShell. Voici la commande gcloud équivalente:

gcloud billing budgets create `
  --billing-account=$BILLING_ACCOUNT_ID `
  --display-name="CSRD Copilot Budget Alert" `
  --budget-amount=10 `
  --threshold-rule=percent=50 `
  --threshold-rule=percent=80 `
  --threshold-rule=percent=100 `
  --all-updates-rule-pubsub-topic=projects/csrd-copilot/topics/budget-alerts

Write-Host "`n✅ Budget Alert créé avec succès!" -ForegroundColor Green
Write-Host "Alertes configurées à:" -ForegroundColor Cyan
Write-Host "  - 50%: $5/mois" -ForegroundColor Yellow
Write-Host "  - 80%: $8/mois" -ForegroundColor Yellow
Write-Host "  - 100%: $10/mois" -ForegroundColor Red

Write-Host "`nVous recevrez des emails à ces seuils." -ForegroundColor Cyan
Write-Host "Vous pouvez modifier le budget dans la Console GCP:" -ForegroundColor Cyan
Write-Host "https://console.cloud.google.com/billing/budgets?project=csrd-copilot" -ForegroundColor Blue

# 4. Ajouter des emails pour les notifications (optionnel)
Write-Host "`nℹ️  Pour ajouter des emails de notification:" -ForegroundColor Cyan
Write-Host "1. Aller sur: https://console.cloud.google.com/billing/budgets?project=csrd-copilot" -ForegroundColor White
Write-Host "2. Cliquer sur le budget 'CSRD Copilot Budget Alert'" -ForegroundColor White
Write-Host "3. Manage notifications > Add email recipients" -ForegroundColor White
