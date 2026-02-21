"""
Middleware pour logging automatique des métriques API
Capture latency, payload size, status pour chaque requête
LOGGING ASYNCHRONE pour ne jamais bloquer l'API
"""
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import time
import uuid
import asyncio
import logging

# Fix import path for Docker environment
try:
    from api.services.metrics_service import MetricsService
except ImportError:
    try:
        from backend.api.services.metrics_service import MetricsService
    except ImportError:
        from services.metrics_service import MetricsService

logger = logging.getLogger(__name__)

class MetricsMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.metrics_service = MetricsService()
        
        # Circuit breaker pour éviter de surcharger BigQuery
        self.circuit_open = False
        self.failure_count = 0
        self.last_failure_time = None
        self.circuit_timeout = 300  # 5 minutes
        
        # Endpoints à monitorer
        self.monitored_endpoints = [
            "/data/smart-extract",
            "/data/check-duplicates",
            "/data/upsert-entries",
            "/data/status",
            "/data/history",
            "/generate/draft",
            "/chat"
        ]

    async def dispatch(self, request: Request, call_next):
        # Ne monitorer que les endpoints listés
        if not any(request.url.path.startswith(ep) for ep in self.monitored_endpoints):
            return await call_next(request)
        
        # Capturer le début
        start_time = time.time()
        event_id = str(uuid.uuid4())
        
        # Récupérer user email depuis l'état de la requête (set par auth middleware)
        user_email = None
        if hasattr(request.state, "user"):
            # UserProfile is a Pydantic model, not a dict - use attribute access
            user_email = getattr(request.state.user, "email", None)
        
        # Exécuter la requête (JAMAIS BLOQUÉ par le logging)
        response: Response = await call_next(request)
        
        # Capturer la fin
        end_time = time.time()
        latency_ms = (end_time - start_time) * 1000
        
        # Déterminer le statut
        status = "success" if response.status_code < 400 else "error"
        error_type = None
        if response.status_code >= 400:
            if response.status_code < 500:
                error_type = "client_error"
            else:
                error_type = "server_error"
        
        # Logger de manière ASYNCHRONE NON-BLOQUANTE
        # Si le logging échoue, l'API continue normalement
        asyncio.create_task(self._log_metric_async(
            event_id=event_id,
            latency_ms=latency_ms,
            user_email=user_email,
            endpoint=request.url.path,
            method=request.method,
            status=status,
            status_code=response.status_code,
            error_type=error_type
        ))
        
        return response
    
    async def _log_metric_async(
        self, 
        event_id: str, 
        latency_ms: float,
        user_email: str,
        endpoint: str,
        method: str,
        status: str,
        status_code: int,
        error_type: str
    ):
        """
        Log asynchrone qui ne bloque JAMAIS l'API.
        Implémente un circuit breaker pour éviter les appels répétés si BigQuery est down.
        """
        # Circuit breaker: Si trop d'échecs, arrêter de logger temporairement
        if self.circuit_open:
            if time.time() - self.last_failure_time < self.circuit_timeout:
                # Circuit ouvert, skip silencieusement
                return
            else:
                # Timeout écoulé, réessayer
                self.circuit_open = False
                self.failure_count = 0
                logger.info("Metrics circuit breaker: Attempting to reconnect to BigQuery")
        
        try:
            self.metrics_service.log_event(
                event_id=event_id,
                event_type="api_call",
                metric_name="endpoint_latency",
                value=latency_ms,
                unit="ms",
                user_email=user_email,
                endpoint=endpoint,
                status=status,
                error_type=error_type,
                metadata={
                    "method": method,
                    "status_code": status_code
                }
            )
            
            # Succès: Reset le compteur d'échecs
            if self.failure_count > 0:
                self.failure_count = max(0, self.failure_count - 1)
                
        except Exception as e:
            # Échec: Incrémenter et potentiellement ouvrir le circuit
            self.failure_count += 1
            
            if self.failure_count >= 10:
                self.circuit_open = True
                self.last_failure_time = time.time()
                logger.error(
                    f"Metrics circuit breaker OPENED after {self.failure_count} failures. "
                    f"Will retry in {self.circuit_timeout}s. Error: {e}"
                )
            else:
                logger.warning(f"Failed to log API metric ({self.failure_count}/10): {e}")
