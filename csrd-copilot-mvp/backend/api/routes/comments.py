from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
import os

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
    tags: Optional[List[str]] = None

class UpdateCommentRequest(BaseModel):
    comment_text: str

class ResolveCommentRequest(BaseModel):
    comment_id: str

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
            tags=request.tags
        )
        return result
    except Exception as e:
        print(f"Error creating comment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
        print(f"Error fetching comments for {kpi_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
        print(f"Error fetching thread summary for {kpi_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
        print(f"Error updating comment {comment_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/comments/{comment_id}/resolve")
def resolve_comment(
    comment_id: str,
    user: UserProfile = Depends(get_current_user)
):
    """
    Marque un commentaire/question/alerte comme résolu.
    Utile pour fermer les discussions après résolution.
    """
    try:
        service = CommentService()
        success = service.resolve_comment(comment_id, user.email)
        if success:
            return {"success": True, "comment_id": comment_id, "resolved_by": user.email}
        else:
            raise HTTPException(status_code=500, detail="Failed to resolve comment")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error resolving comment {comment_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
        print(f"Error deleting comment {comment_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
        print(f"Error fetching mentions for {user.email}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
