from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os

# Fix import path for Docker environment
try:
    from backend.api.services.rag_client import RAGClient
except ImportError:
    from services.rag_client import RAGClient

router = APIRouter()

class DraftRequest(BaseModel):
    topic: str
    standard: str

@router.post("/generate-draft")
def generate_draft_route(request: DraftRequest):
    """
    Generates a draft using the RAG Client.
    """
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
    if not project_id:
        # Fallback for local dev if env var not set
        project_id = "csrd-copilot" 
        
    try:
        client = RAGClient(project_id=project_id)
        result = client.generate_draft(request.topic, request.standard)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Draft generation failed: {str(e)}")
