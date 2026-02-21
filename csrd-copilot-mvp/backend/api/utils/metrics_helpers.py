"""
Helpers pour logger les métriques facilement dans les routes
"""
import uuid
import time
from typing import Optional, Dict, Any

# Fix import path for Docker environment
try:
    from api.services.metrics_service import MetricsService
except ImportError:
    try:
        from backend.api.services.metrics_service import MetricsService
    except ImportError:
        from services.metrics_service import MetricsService

_metrics_service = None

def get_metrics_service() -> MetricsService:
    """Singleton pour éviter de créer plusieurs instances"""
    global _metrics_service
    if _metrics_service is None:
        _metrics_service = MetricsService()
    return _metrics_service

def log_extraction_event(
    duration_ms: float,
    document_type: str,  # pdf, excel, image
    file_size_mb: float,
    page_count: Optional[int],
    kpi_count: int,
    confidence_scores: list,
    user_email: str,
    status: str = "success",
    error_type: Optional[str] = None,
    error_message: Optional[str] = None
):
    """
    Log une extraction de document
    """
    print(f"🔔 log_extraction_event called: duration={duration_ms}ms, kpi_count={kpi_count}, user={user_email}")
    service = get_metrics_service()
    print(f"🔔 MetricsService obtained: {service is not None}")
    event_id = str(uuid.uuid4())
    
    # Log extraction avec durée
    service.log_event(
        event_id=event_id,
        event_type="extraction",
        metric_name="extraction_duration",
        value=duration_ms,
        unit="ms",
        user_email=user_email,
        document_type=document_type,
        file_size_mb=file_size_mb,
        page_count=page_count,
        kpi_count=kpi_count,
        status=status,
        error_type=error_type,
        error_message=error_message,
        metadata={
            "event_id": event_id
        }
    )
    
    # Log les scores de confiance individuellement
    if confidence_scores:
        avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.0
        service.log_event(
            event_id=f"{event_id}_conf",
            event_type="extraction",
            metric_name="extraction_confidence",
            value=avg_confidence,
            unit="score",
            user_email=user_email,
            document_type=document_type,
            kpi_count=kpi_count,
            status=status,
            metadata={
                "parent_event": event_id,
                "confidence_scores": confidence_scores[:10]  # Limit to first 10
            }
        )

def log_duplicate_check(
    conflicts_found: int,
    datapoints_checked: int,
    user_email: str,
):
    """
    Log un check de doublons
    """
    service = get_metrics_service()
    event_id = str(uuid.uuid4())
    
    service.log_event(
        event_id=event_id,
        event_type="duplicate_detection",
        metric_name="duplicate_conflicts_found",
        value=float(conflicts_found),
        unit="count",
        user_email=user_email,
        status="success",
        metadata={
            "datapoints_checked": datapoints_checked,
            "detection_rate": round(conflicts_found / datapoints_checked * 100, 2) if datapoints_checked > 0 else 0
        }
    )

def log_duplicate_resolutions(
    resolutions: list,  # [{"action": "add"/"replace"/"skip", "kpi_id": "..."}]
    user_email: str
):
    """
    Log les résolutions de doublons
    """
    service = get_metrics_service()
    
    counts = {"add": 0, "replace": 0, "skip": 0}
    for res in resolutions:
        action = res.get("action", "skip")
        counts[action] = counts.get(action, 0) + 1
    
    for action, count in counts.items():
        if count > 0:
            service.log_event(
                event_id=str(uuid.uuid4()),
                event_type="duplicate_detection",
                metric_name="duplicate_resolution",
                value=float(count),
                unit="count",
                user_email=user_email,
                status="success",
                metadata={"action": action}
            )

def log_datapoint_action(
    action: str,  # added, deleted, modified, validated
    user_email: str,
    kpi_id: Optional[str] = None,
    standard: Optional[str] = None,
):
    """
    Log une action sur un datapoint (ajout, suppression, modification)
    """
    service = get_metrics_service()
    
    service.log_event(
        event_id=str(uuid.uuid4()),
        event_type="data_quality",
        metric_name=f"datapoint_{action}",
        value=1.0,
        unit="count",
        user_email=user_email,
        status="success",
        standard=standard,
        metadata={"kpi_id": kpi_id}
    )

def log_report_generation(
    duration_ms: float,
    standard: str,
    user_email: str,
    success: bool = True,
    error_message: Optional[str] = None
):
    """
    Log une génération de rapport
    """
    service = get_metrics_service()
    
    service.log_event(
        event_id=str(uuid.uuid4()),
        event_type="report_generation",
        metric_name="report_generated",
        value=duration_ms,
        unit="ms",
        user_email=user_email,
        standard=standard,
        status="success" if success else "error",
        error_message=error_message
    )

def log_vertex_ai_call(
    input_tokens: int,
    output_tokens: int,
    cost_usd: float,
    user_email: Optional[str] = None,
    operation: str = "general"  # extraction, chat, generation
):
    """
    Log un appel à Vertex AI avec tokens et coût
    """
    service = get_metrics_service()
    
    service.log_event(
        event_id=str(uuid.uuid4()),
        event_type="vertex_ai",
        metric_name="vertex_ai_call",
        value=cost_usd,
        unit="usd",
        user_email=user_email,
        status="success",
        metadata={
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "operation": operation,
            "total_tokens": input_tokens + output_tokens
        }
    )

def log_user_action(
    feature: str,  # smart_import, manual_entry, chat, report_generation, data_review
    user_email: str,
    metadata: Optional[Dict[str, Any]] = None
):
    """
    Log une action utilisateur (pour engagement tracking)
    """
    service = get_metrics_service()
    
    service.log_event(
        event_id=str(uuid.uuid4()),
        event_type="user_action",
        metric_name="feature_used",
        value=1.0,
        unit="count",
        user_email=user_email,
        status="success",
        metadata={"feature": feature, **(metadata or {})}
    )
