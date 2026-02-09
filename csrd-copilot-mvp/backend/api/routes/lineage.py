from fastapi import APIRouter, HTTPException, Depends, Response
from typing import List, Dict, Any
import uuid

# Fix import path for Docker environment
try:
    from backend.api.utils.auth import get_current_user
    from backend.api.utils.rbac import UserProfile
    from backend.api.services.lineage_service import LineageService
except ImportError:
    from utils.auth import get_current_user
    from utils.rbac import UserProfile
    from services.lineage_service import LineageService

router = APIRouter()
lineage_service = LineageService()

@router.get("/lineage/kpi/{kpi_id}")
def get_kpi_lineage(kpi_id: str, user: UserProfile = Depends(get_current_user)):
    """
    Returns all lineage entries for a specific KPI (downstream: from report to source).
    """
    entries = lineage_service.get_lineage_by_kpi(kpi_id)
    
    # Group by source for cleaner display
    source_map = {}
    for entry in entries:
        source_filename = entry.get('source_filename', 'Unknown')
        if source_filename not in source_map:
            source_map[source_filename] = []
        source_map[source_filename].append(entry)
    
    return {
        "kpi_id": kpi_id,
        "total_sources": len(source_map),
        "sources": [
            {
                "source_filename": filename,
                "entries": entries
            }
            for filename, entries in source_map.items()
        ]
    }

@router.get("/lineage/search")
def search_lineage(value: str, standard: str = None, user: UserProfile = Depends(get_current_user)):
    """
    Search for lineage entries by value (and optionally standard).
    Useful when KPI ID is unknown but value is known.
    """
    results = lineage_service.search_by_value(value, standard)
    
    # Group by KPI and then by source
    kpi_map = {}
    for entry in results:
        kpi_id = entry['kpi_id']
        if kpi_id not in kpi_map:
            kpi_map[kpi_id] = {}
        
        source_filename = entry.get('source_filename', 'Unknown')
        if source_filename not in kpi_map[kpi_id]:
            kpi_map[kpi_id][source_filename] = []
        kpi_map[kpi_id][source_filename].append(entry)
    
    # Format for frontend
    formatted_sources = []
    for kpi_id, sources in kpi_map.items():
        for source_filename, entries in sources.items():
            formatted_sources.append({
                "source_filename": source_filename,
                "entries": entries
            })
    
    return {
        "value": value,
        "standard": standard,
        "total_sources": len(formatted_sources),
        "sources": formatted_sources
    }

@router.get("/lineage/source/{source_filename}")
def get_source_lineage(source_filename: str, user: UserProfile = Depends(get_current_user)):
    """
    Returns all KPIs derived from a specific source document (upstream: from source to report).
    """
    entries = lineage_service.get_lineage_by_source(source_filename)
    
    # Group by KPI for cleaner display
    kpi_map = {}
    for entry in entries:
        kpi_id = entry['kpi_id']
        if kpi_id not in kpi_map:
            kpi_map[kpi_id] = []
        kpi_map[kpi_id].append(entry)
    
    return {
        "source_filename": source_filename,
        "total_kpis": len(kpi_map),
        "kpis": kpi_map
    }

@router.get("/lineage/sources")
def list_all_sources(user: UserProfile = Depends(get_current_user)):
    """
    Returns a list of all unique source documents with metadata.
    """
    sources = lineage_service.get_all_sources()
    return {
        "total_sources": len(sources),
        "sources": sources
    }

@router.get("/lineage/document/{source_filename}")
def download_source_document(source_filename: str, user: UserProfile = Depends(get_current_user)):
    """
    Downloads the original source document from GCS.
    """
    # First get the GCS URL from lineage table
    entries = lineage_service.get_lineage_by_source(source_filename)
    if not entries:
        raise HTTPException(status_code=404, detail="Source document not found in lineage")
    
    source_url = entries[0].get('source_url')
    if not source_url:
        raise HTTPException(status_code=404, detail="Source URL not available")
    
    document = lineage_service.get_source_document(source_url)
    if not document:
        raise HTTPException(status_code=404, detail="Failed to download source document")
    
    # Determine content type
    content_type = "application/pdf"
    if source_filename.endswith('.xlsx') or source_filename.endswith('.xls'):
        content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    elif source_filename.endswith('.csv'):
        content_type = "text/csv"
    
    return Response(
        content=document,
        media_type=content_type,
        headers={
            "Content-Disposition": f'attachment; filename="{source_filename}"'
        }
    )

@router.post("/lineage/record")
def record_lineage_manually(
    payload: Dict[str, Any],
    user: UserProfile = Depends(get_current_user)
):
    """
    Manually record a lineage entry (for testing or manual corrections).
    Admin only.
    """
    from backend.api.utils.rbac import Role
    
    if user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can manually record lineage")
    
    lineage_id = str(uuid.uuid4())
    success = lineage_service.record_lineage(
        lineage_id=lineage_id,
        kpi_id=payload.get("kpi_id"),
        value=payload.get("value"),
        source_type=payload.get("source_type", "manual"),
        user_email=user.email,
        unit=payload.get("unit"),
        date=payload.get("date"),
        source_filename=payload.get("source_filename"),
        source_url=payload.get("source_url"),
        page_number=payload.get("page_number"),
        snippet=payload.get("snippet"),
        confidence=payload.get("confidence"),
        upload_id=payload.get("upload_id"),
    )
    
    if success:
        return {"status": "success", "lineage_id": lineage_id}
    else:
        raise HTTPException(status_code=500, detail="Failed to record lineage")
