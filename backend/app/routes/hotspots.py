from fastapi import APIRouter, Query
from app.services.geo import rank_hotspots

router = APIRouter(prefix="/api/hotspots", tags=["hotspots"])

@router.get("/")
def hotspots(theme: str = Query("heat"), limit: int = Query(50, ge=1, le=200)):
    return rank_hotspots(theme=theme, limit=limit)
