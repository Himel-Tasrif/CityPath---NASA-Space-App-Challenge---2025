# app/routes/recommend.py
from fastapi import APIRouter, Query
from app.services.recommend import suggest_parks, suggest_clinics

router = APIRouter(prefix="/api/recommend", tags=["recommend"])

@router.get("/parks")
def recommend_parks(limit: int = Query(10, ge=1, le=200)):
    items = suggest_parks(limit=limit)
    return {"items": items, "count": len(items)}

@router.get("/clinics")
def recommend_clinics(limit: int = Query(10, ge=1, le=200)):
    items = suggest_clinics(limit=limit)
    return {"items": items, "count": len(items)}
