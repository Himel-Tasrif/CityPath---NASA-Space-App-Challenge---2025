# app/services/recommend.py
from __future__ import annotations
from typing import List, Dict
import numpy as np
import pandas as pd

from .geo import HexStore

def _z(s: pd.Series) -> pd.Series:
    s = s.astype(float)
    std = s.std(ddof=0)
    return (s - s.mean()) / (std if std else 1.0)

def suggest_parks(limit: int = 10) -> List[Dict]:
    """
    Recommend hexes that are HOT and BARE (low NDVI) where people live.
    Higher score = better candidate for planting/park intervention.
    """
    df = HexStore.load().copy()
    # safety fills
    df["ndvi_mean"] = df["ndvi_mean"].astype(float)
    df["lst_day_mean"] = df["lst_day_mean"].astype(float)
    df["pop_density"] = df["pop_density"].fillna(0).astype(float)

    # score: hot + bare + populated
    heat = _z(df["lst_day_mean"])
    bare = -_z(df["ndvi_mean"])  # lower NDVI → higher score
    popw = np.log1p(df["pop_density"])  # gentle weight so 0 doesn’t kill it

    df["score"] = (heat + bare) * (1.0 + popw)

    out = (
        df.dropna(subset=["lat", "lon", "score"])
          .sort_values("score", ascending=False)
          .head(int(limit))
    )

    return [
        {
            "hex_id": str(r["hex_id"]),
            "lat": float(r["lat"]),
            "lon": float(r["lon"]),
            "score": float(r["score"]),
            "why": {
                "lst_day_mean": None if pd.isna(r["lst_day_mean"]) else float(r["lst_day_mean"]),
                "ndvi_mean": None if pd.isna(r["ndvi_mean"]) else float(r["ndvi_mean"]),
                "pop_density": None if pd.isna(r["pop_density"]) else float(r["pop_density"]),
            },
        }
        for _, r in out.iterrows()
    ]

def suggest_clinics(limit: int = 10) -> List[Dict]:
    """
    Recommend hexes that are HOT and POPULATED (proxy for exposure).
    (Later you can subtract proximity to existing clinics.)
    """
    df = HexStore.load().copy()
    df["ndvi_mean"] = df["ndvi_mean"].astype(float)
    df["lst_day_mean"] = df["lst_day_mean"].astype(float)
    df["pop_density"] = df["pop_density"].fillna(0).astype(float)

    heat = _z(df["lst_day_mean"])
    popz = _z(df["pop_density"])
    df["score"] = heat + popz

    out = (
        df.dropna(subset=["lat", "lon", "score"])
          .sort_values("score", ascending=False)
          .head(int(limit))
    )

    return [
        {
            "hex_id": str(r["hex_id"]),
            "lat": float(r["lat"]),
            "lon": float(r["lon"]),
            "score": float(r["score"]),
            "why": {
                "lst_day_mean": None if pd.isna(r["lst_day_mean"]) else float(r["lst_day_mean"]),
                "ndvi_mean": None if pd.isna(r["ndvi_mean"]) else float(r["ndvi_mean"]),
                "pop_density": None if pd.isna(r["pop_density"]) else float(r["pop_density"]),
            },
        }
        for _, r in out.iterrows()
    ]
