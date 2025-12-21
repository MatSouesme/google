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

class ChatRequest(BaseModel):
    query: str
    mode: str = "data" # "data" (SQL) or "docs" (RAG)

@router.post("/chat/data")
def chat_data_route(request: ChatRequest, user=Depends(verify_token)):
    """
    Handles natural language queries.
    Mode 'data': Text-to-SQL on structured data.
    Mode 'docs': RAG search on uploaded documents.
    """
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
    if not project_id:
        project_id = "csrd-copilot" 
        
    try:
        client = RAGClient(project_id=project_id)
        
        if request.mode == "docs":
            result = client.search_documents(request.query)
            return {"response": result, "type": "text"}
        else:
            result = client.generate_sql_response(request.query)
            return result
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")
