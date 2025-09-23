# backend/app/routes/grid.py
from fastapi import APIRouter, Query
from app.services.geo import HexStore
import pandas as pd
import numpy as np
import math

router = APIRouter(prefix="/api/grid", tags=["grid"])

def _clean_val(v):
    # Convert any pandas/NumPy NaN/Inf to None so JSON is valid
    if v is None:
        return None
    # pandas uses numpy scalars sometimes; handle both
    if isinstance(v, (float, np.floating)):
        if math.isnan(float(v)) or math.isinf(float(v)):
            return None
    # pd.isna also catches NaT
    if pd.isna(v):
        return None
    return v

@router.get("/")
def grid(limit: int = Query(2000, ge=10, le=20000)):
    df = HexStore.load()
    cols = ["hex_id", "lat", "lon", "ndvi_mean", "lst_day_mean", "pop_density"]
    use = [c for c in cols if c in df.columns]

    out = df[use].dropna(subset=["lat", "lon"]).head(limit)

    # final pass: map every value through cleaner
    records = []
    for row in out.to_dict(orient="records"):
        records.append({k: _clean_val(v) for k, v in row.items()})

    return {"items": records, "count": len(records)}
