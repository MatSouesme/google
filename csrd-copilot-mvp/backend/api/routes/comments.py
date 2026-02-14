from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
import os
import logging

# Configure logger
logger = logging.getLogger(__name__)

try:
    from backend.api.utils.auth import get_current_user
    from backend.api.utils.rbac import UserProfile
    from backend.api.services.comment_service import CommentService
except ImportError:
    from utils.auth import get_current_user
    from utils.rbac import UserProfile
    from services.comment_service import CommentService

router = APIRouter()

class CreateCommentRequest(BaseModel):
    kpi_id: str
    comment_text: str
    comment_type: str = "comment"  # "comment", "question", "alert"
    parent_comment_id: Optional[str] = None
    data_source: Optional[str] = None
    reference_id: Optional[str] = None
    datapoint_id: Optional[str] = None  # ID spécifique du datapoint (lineage_id, entry_id, etc.)
    datapoint_value: Optional[str] = None  # Valeur numérique du datapoint pour affichage
    tags: Optional[List[str]] = None

class UpdateCommentRequest(BaseModel):
    comment_text: str

class ResolveCommentRequest(BaseModel):
    resolution_notes: Optional[str] = None

@router.post("/comments")
def create_comment(
    request: CreateCommentRequest,
    user: UserProfile = Depends(get_current_user)
):
    """
    Crée un nouveau commentaire ou une réponse dans un thread de discussion.
    Tous les utilisateurs authentifiés peuvent commenter.
    """
    try:
        service = CommentService()
        result = service.create_comment(
            kpi_id=request.kpi_id,
            comment_text=request.comment_text,
            author_email=user.email,
            author_name=user.email.split('@')[0],  # Simplification, pourrait venir du profil
            author_role=user.role.value,
            comment_type=request.comment_type,
            parent_comment_id=request.parent_comment_id,
            data_source=request.data_source,
            reference_id=request.reference_id,
            datapoint_id=request.datapoint_id,
            datapoint_value=request.datapoint_value,
            tags=request.tags
        )
        return result
    except Exception as e:
        logger.error(f"Error creating comment", extra={"error_type": type(e).__name__})
        raise HTTPException(status_code=500, detail="Failed to create comment")

@router.get("/comments/{kpi_id}")
def get_kpi_comments(
    kpi_id: str,
    include_resolved: bool = True,
    user: UserProfile = Depends(get_current_user)
):
    """
    Récupère tous les commentaires pour un KPI donné, organisés en threads.
    """
    try:
        service = CommentService()
        comments = service.get_comments_for_kpi(kpi_id, include_resolved)
        return {
            "kpi_id": kpi_id,
            "comments": comments
        }
    except Exception as e:
        logger.error(f"Error fetching comments", extra={"error_type": type(e).__name__})
        raise HTTPException(status_code=500, detail="Failed to fetch comments")

@router.get("/comments/{kpi_id}/summary")
def get_thread_summary(
    kpi_id: str,
    user: UserProfile = Depends(get_current_user)
):
    """
    Récupère un résumé du thread de discussion pour un KPI.
    Utile pour afficher des badges/indicateurs sans charger tous les commentaires.
    """
    try:
        service = CommentService()
        summary = service.get_thread_summary(kpi_id)
        return summary
    except Exception as e:
        logger.error(f"Error fetching thread summary", extra={"error_type": type(e).__name__})
        raise HTTPException(status_code=500, detail="Failed to fetch summary")

@router.put("/comments/{comment_id}")
def update_comment(
    comment_id: str,
    request: UpdateCommentRequest,
    user: UserProfile = Depends(get_current_user)
):
    """
    Modifie le texte d'un commentaire existant.
    Seulement l'auteur ou un admin peut modifier.
    """
    try:
        service = CommentService()
        success = service.update_comment(comment_id, request.comment_text)
        if success:
            return {"success": True, "comment_id": comment_id}
        else:
            raise HTTPException(status_code=403, detail="Cannot update this comment")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating comment", extra={"error_type": type(e).__name__})
        raise HTTPException(status_code=500, detail="Failed to update comment")

@router.post("/comments/{comment_id}/resolve")
def resolve_comment(
    comment_id: str,
    request: Optional[ResolveCommentRequest] = None,
    user: UserProfile = Depends(get_current_user)
):
    """
    Enregistre un événement de résolution pour un commentaire/question/alerte.
    N'update PAS le commentaire - ajoute une ligne dans comment_events pour l'audit trail.
    Permet de calculer les temps de résolution et tracer l'historique complet.
    """
    try:
        service = CommentService()
        resolution_notes = request.resolution_notes if request else None
        success = service.resolve_comment(comment_id, user.email, resolution_notes)
        if success:
            return {
                "success": True, 
                "comment_id": comment_id, 
                "resolved_by": user.email,
                "message": "Événement de résolution enregistré"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to record resolution event")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resolving comment", extra={"error_type": type(e).__name__})
        raise HTTPException(status_code=500, detail="Failed to resolve comment")

@router.delete("/comments/{comment_id}")
def delete_comment(
    comment_id: str,
    user: UserProfile = Depends(get_current_user)
):
    """
    Supprime un commentaire (seulement par son auteur ou admin).
    Les réponses au commentaire sont également supprimées.
    """
    try:
        service = CommentService()
        success = service.delete_comment(comment_id, user.email)
        if success:
            return {"success": True, "comment_id": comment_id}
        else:
            raise HTTPException(status_code=403, detail="Cannot delete this comment")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting comment", extra={"error_type": type(e).__name__})
        raise HTTPException(status_code=500, detail="Failed to delete comment")

@router.get("/comments/mentions/me")
def get_my_mentions(
    limit: int = 50,
    user: UserProfile = Depends(get_current_user)
):
    """
    Récupère tous les commentaires où l'utilisateur actuel a été mentionné avec @.
    Utile pour un système de notifications.
    """
    try:
        service = CommentService()
        mentions = service.get_user_mentions(user.email, limit)
        return {
            "user_email": user.email,
            "mentions": mentions
        }
    except Exception as e:
        logger.error(f"Error fetching mentions", extra={"error_type": type(e).__name__})
        raise HTTPException(status_code=500, detail="Failed to fetch mentions")

@router.get("/comments/datapoint/{datapoint_id}")
def get_datapoint_comments(
    datapoint_id: str,
    user: UserProfile = Depends(get_current_user)
):
    """
    Récupère tous les commentaires pour un datapoint spécifique.
    Utile pour afficher les commentaires au survol d'une valeur dans le draft.
    """

@router.get("/comments/{comment_id}/events")
def get_comment_events(
    comment_id: str,
    user: UserProfile = Depends(get_current_user)
):
    """
    Récupère l'historique complet des événements pour un commentaire :
    - Résolutions (resolve)
    - Réouvertures (unresolve)
    - Éditions (edit)
    Permet de tracer le cycle de vie complet et calculer les temps de résolution.
    """
    try:
        service = CommentService()
        events = service.get_comment_events(comment_id)
        return {
            "comment_id": comment_id,
            "events": events,
            "total_events": len(events)
        }
    except Exception as e:
        logger.error(f"Error fetching comment events", extra={"error_type": type(e).__name__})
        raise HTTPException(status_code=500, detail="Failed to fetch events")

@router.get("/comments/metrics/resolution")
def get_resolution_metrics(
    kpi_id: Optional[str] = None,
    days: int = 30,
    user: UserProfile = Depends(get_current_user)
):
    """
    Calcule des métriques sur les temps de résolution des commentaires :
    - Temps moyen de résolution
    - Taux de résolution en 24h/72h
    - Min/max temps de résolution
    Utile pour le dashboard et le suivi de la qualité des discussions.
    """
    try:
        service = CommentService()
        metrics = service.get_resolution_metrics(kpi_id, days)
        return metrics
    except Exception as e:
        logger.error(f"Error calculating resolution metrics", extra={"error_type": type(e).__name__})
        raise HTTPException(status_code=500, detail="Failed to calculate metrics")
    try:
        service = CommentService()
        comments = service.get_comments_by_datapoint(datapoint_id)
        return {
            "datapoint_id": datapoint_id,
            "comments": comments
        }
    except Exception as e:
        logger.error(f"Error fetching datapoint comments", extra={"error_type": type(e).__name__})
        raise HTTPException(status_code=500, detail="Failed to fetch datapoint comments")
