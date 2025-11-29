from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import os

# Fix import path for Docker environment
try:
    from backend.api.services.rag_client import RAGClient
    from backend.api.utils.auth import verify_token
except ImportError:
    from services.rag_client import RAGClient
    from utils.auth import verify_token

router = APIRouter()

class DraftRequest(BaseModel):
    topic: str
    standard: str

@router.post("/generate-draft")
def generate_draft_route(request: DraftRequest, user=Depends(verify_token)):
    """
    Generates a draft using the RAG Client.
    Requires a valid Firebase ID token.
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
