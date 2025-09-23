from pydantic import BaseModel
from typing import Optional, List

class HexFeature(BaseModel):
    hex_id: str
    lat: float
    lon: float
    ndvi_mean: Optional[float] = None
    lst_day_mean: Optional[float] = None
    pop_density: Optional[float] = None
    pm25: Optional[float] = None

class HotspotItem(BaseModel):
    hex_id: str
    score: float
    lat: float
    lon: float
