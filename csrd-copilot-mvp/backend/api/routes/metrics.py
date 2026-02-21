"""
Routes pour les métriques et analytics
- Public dashboard: métriques pour tous les users
- Admin analytics: métriques détaillées réservées aux admins
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
import logging

# Fix import path for Docker environment
try:
    from api.services.metrics_service import MetricsService
    from api.utils.auth import get_current_user
except ImportError:
    try:
        from backend.api.services.metrics_service import MetricsService
        from backend.api.utils.auth import get_current_user
    except ImportError:
        from services.metrics_service import MetricsService
        from utils.auth import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)
metrics_service = MetricsService()

# ========== MODELS ==========

class UserDashboardResponse(BaseModel):
    """Métriques publiques pour tous les users"""
    my_activity: Dict[str, Any]
    platform_health: Dict[str, Any]

class AdminAnalyticsResponse(BaseModel):
    """Métriques détaillées pour admins"""
    extraction_stats: Dict[str, Any]
    api_performance: List[Dict]
    user_engagement: Dict[str, Any]
    data_quality: Dict[str, Any]
    vertex_ai_stats: Dict[str, Any]
    duplicate_detection: Dict[str, Any]

# ========== PUBLIC ENDPOINTS ==========

@router.get("/metrics/dashboard", response_model=UserDashboardResponse)
def get_user_dashboard(
    current_user: dict = Depends(get_current_user),
    days: int = Query(30, ge=1, le=90)
):
    """
    Dashboard public avec métriques limitées pour tous les users
    - Activité personnelle (mes documents, mes rapports)
    - Santé de la plateforme (taux de succès global, temps moyen)
    """
    try:
        user_email = current_user.email
        
        # Statistiques personnelles
        my_activity = _get_user_activity(user_email, days)
        
        # Santé de la plateforme (métriques agrégées)
        platform_health = {
            "extraction_success_rate": _get_global_success_rate("extraction", days),
            "avg_extraction_time_seconds": round(_get_avg_extraction_time(days) / 1000, 1),
            "documents_processed_today": _get_documents_count_today(),
            "platform_status": "operational"  # TODO: calculer vraiment
        }
        
        return UserDashboardResponse(
            my_activity=my_activity,
            platform_health=platform_health
        )
    
    except Exception as e:
        logger.error(f"Error fetching user dashboard: {e}", extra={"user": current_user.email})
        raise HTTPException(status_code=500, detail="Failed to fetch dashboard metrics")

# ========== ADMIN ENDPOINTS ==========

@router.get("/metrics/analytics", response_model=AdminAnalyticsResponse)
def get_admin_analytics(
    current_user: dict = Depends(get_current_user),
    days: int = Query(30, ge=1, le=90)  # MAX 90 jours pour limiter les coûts BigQuery
):
    """
    Analytics détaillées réservées aux admins
    - Toutes les métriques d'extraction, API, users, AI, etc.
    - Filtrage par période
    
    REQUIRED: User doit avoir le rôle 'admin' dans ses custom claims
    """
    # Vérifier les permissions admin
    if not _is_admin(current_user):
        logger.warning(f"Unauthorized analytics access attempt", extra={"user": current_user.email})
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        analytics = AdminAnalyticsResponse(
            extraction_stats=metrics_service.get_extraction_stats(days),
            api_performance=metrics_service.get_endpoint_performance(days=min(days, 7)),  # Max 7 jours pour perf
            user_engagement=metrics_service.get_user_engagement(days),
            data_quality=metrics_service.get_data_quality_stats(days),
            vertex_ai_stats=metrics_service.get_vertex_ai_stats(days),
            duplicate_detection=metrics_service.get_duplicate_stats(days)
        )
        
        logger.info("Admin analytics accessed", extra={"user": current_user.email, "days": days})
        return analytics
    
    except Exception as e:
        logger.error(f"Error fetching admin analytics: {e}", extra={"user": current_user.email})
        raise HTTPException(status_code=500, detail="Failed to fetch analytics")

@router.get("/metrics/extraction/timeseries")
def get_extraction_timeseries(
    current_user: dict = Depends(get_current_user),
    days: int = Query(30, ge=1, le=90),
    granularity: str = Query("day", regex="^(day|hour)$")
):
    """
    Évolution temporelle des extractions (admin only)
    - Granularité: jour ou heure
    - Retourne: durée moyenne, taux de succès, KPIs extraits
    """
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        timeseries = metrics_service.get_extraction_timeseries(days, granularity)
        return {"data": timeseries}
    except Exception as e:
        logger.error(f"Error fetching timeseries: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch timeseries")

@router.get("/metrics/confidence/distribution")
def get_confidence_distribution(
    current_user: dict = Depends(get_current_user),
    days: int = Query(30, ge=1, le=90)
):
    """
    Distribution des scores de confiance des extractions (admin only)
    """
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        distribution = metrics_service.get_confidence_distribution(days)
        return distribution
    except Exception as e:
        logger.error(f"Error fetching confidence distribution: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch distribution")

@router.get("/metrics/features/adoption")
def get_feature_adoption(
    current_user: dict = Depends(get_current_user),
    days: int = Query(30, ge=1, le=90)
):
    """
    Taux d'adoption des features par les utilisateurs (admin only)
    """
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        features = metrics_service.get_feature_adoption(days)
        return {"features": features}
    except Exception as e:
        logger.error(f"Error fetching feature adoption: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch adoption")

# ========== HELPER FUNCTIONS ==========

def _is_admin(user) -> bool:
    """Vérifie si l'utilisateur a les droits admin"""
    # TODO: Implémenter vraiment via Firebase custom claims
    # Pour l'instant: simple check sur l'email
    admin_emails = [
        "admin@ecoply.fr",
        "victor@ecoply.fr", 
        "msouesme@albertschool.com", 
        "aarroyo@albertschool.com"
    ]
    
    # Mode développement: accepter tous les utilisateurs comme admin
    # SUPPRIMER EN PRODUCTION !
    if hasattr(user, 'email') and user.email:
        return True
    
    # Fallback for dict-based user objects
    user_email = user.email if hasattr(user, 'email') else user.get("email")
    return user_email in admin_emails

def _get_user_activity(user_email: str, days: int) -> Dict[str, Any]:
    """Récupère l'activité d'un utilisateur spécifique"""
    from google.cloud import bigquery
    import os
    
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "csrd-copilot")
    dataset_id = "csrd_mvp"
    metrics_table = f"{project_id}.{dataset_id}.metrics_events"
    
    client = bigquery.Client()
    query = f"""
    SELECT
        COUNTIF(event_type = 'extraction') as my_documents_uploaded,
        COUNTIF(metric_name = 'report_generated') as my_reports_generated,
        COUNTIF(metric_name = 'datapoint_added') as my_datapoints_added,
        COUNT(*) as my_total_actions
    FROM `{metrics_table}`
    WHERE user_email = @user_email
      AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days} DAY)
    """
    
    job_config = bigquery.QueryJobConfig(
        query_parameters=[bigquery.ScalarQueryParameter("user_email", "STRING", user_email)]
    )
    
    try:
        results = client.query(query, job_config=job_config).result()
        return dict(list(results)[0]) if results.total_rows > 0 else {}
    except Exception as e:
        logger.error(f"Error fetching user activity: {e}")
        return {}

def _get_global_success_rate(event_type: str, days: int) -> float:
    """Calcule le taux de succès global pour un type d'événement"""
    from google.cloud import bigquery
    import os
    
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "csrd-copilot")
    dataset_id = "csrd_mvp"
    metrics_table = f"{project_id}.{dataset_id}.metrics_events"
    
    client = bigquery.Client()
    query = f"""
    SELECT 
        ROUND(COUNTIF(status = 'success') / COUNT(*) * 100, 1) as success_rate
    FROM `{metrics_table}`
    WHERE event_type = @event_type
      AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days} DAY)
    """
    
    job_config = bigquery.QueryJobConfig(
        query_parameters=[bigquery.ScalarQueryParameter("event_type", "STRING", event_type)]
    )
    
    try:
        results = client.query(query, job_config=job_config).result()
        row = list(results)[0]
        return float(row['success_rate']) if row['success_rate'] is not None else 0.0
    except Exception:
        return 0.0

def _get_avg_extraction_time(days: int) -> float:
    """Temps moyen d'extraction en ms"""
    from google.cloud import bigquery
    import os
    
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "csrd-copilot")
    dataset_id = "csrd_mvp"
    metrics_table = f"{project_id}.{dataset_id}.metrics_events"
    
    client = bigquery.Client()
    query = f"""
    SELECT AVG(value) as avg_time_ms
    FROM `{metrics_table}`
    WHERE event_type = 'extraction'
      AND status = 'success'
      AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days} DAY)
    """
    
    try:
        results = client.query(query).result()
        row = list(results)[0]
        return float(row['avg_time_ms']) if row['avg_time_ms'] is not None else 0.0
    except Exception:
        return 0.0

def _get_documents_count_today() -> int:
    """Nombre de documents traités aujourd'hui"""
    from google.cloud import bigquery
    import os
    
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "csrd-copilot")
    dataset_id = "csrd_mvp"
    metrics_table = f"{project_id}.{dataset_id}.metrics_events"
    
    client = bigquery.Client()
    query = f"""
    SELECT COUNT(*) as doc_count
    FROM `{metrics_table}`
    WHERE event_type = 'extraction'
      AND DATE(timestamp) = CURRENT_DATE()
    """
    
    try:
        results = client.query(query).result()
        row = list(results)[0]
        return int(row['doc_count']) if row['doc_count'] is not None else 0
    except Exception:
        return 0
