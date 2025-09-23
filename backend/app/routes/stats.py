from fastapi import APIRouter, HTTPException, Query
from app.services.geo import hex_stats

router = APIRouter(prefix="/api/stats", tags=["stats"])

@router.get("/")
def stats(hex_id: str = Query(..., description="H3 hex id")):
    s = hex_stats(hex_id)
    if not s:
        raise HTTPException(status_code=404, detail="Not Found")
    return s
