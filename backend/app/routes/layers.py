from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()

@router.get("/")
def list_layers():
    # We'll fill from DB later; for now return static "layers" available
    return {
        "city": settings.CITY_NAME,
        "layers": [
            {"id":"ndvi", "name":"Vegetation (NDVI)", "type":"metric"},
            {"id":"lst", "name":"Land Surface Temperature", "type":"metric"},
            {"id":"pop", "name":"Population Density", "type":"metric"},
            {"id":"no2", "name":"NO2 (GIBS overlay)", "type":"tile"},
        ]
    }
