# app/services/geo.py
from pathlib import Path
import pandas as pd
import numpy as np

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "hex_features_ext.parquet"

class HexStore:
    """Small cache/wrapper around the hex_features.parquet."""
    _df = None

    @classmethod
    def load(cls) -> pd.DataFrame:
        if cls._df is None:
            if not DATA_PATH.exists():
                raise FileNotFoundError(f"hex_features.parquet not found at {DATA_PATH}")

            df = pd.read_parquet(DATA_PATH)

            need = ["hex_id", "lat", "lon", "ndvi_mean", "lst_day_mean", "pop_density"]
            missing = [c for c in need if c not in df.columns]
            if missing:
                raise ValueError(f"Parquet missing columns {missing}. Found: {list(df.columns)}")

            # Basic type cleanup
            df = df.dropna(subset=["hex_id", "lat", "lon"])
            df["hex_id"] = df["hex_id"].astype(str)

            # Replace ±inf with NaN in numeric columns, we’ll convert to None later
            num_cols = ["ndvi_mean", "lst_day_mean", "pop_density"]
            for c in num_cols:
                if c in df.columns:
                    df[c] = pd.to_numeric(df[c], errors="coerce")
                    df[c] = df[c].replace([np.inf, -np.inf], np.nan)

            cls._df = df
        return cls._df



def rank_hotspots(theme: str = "heat", limit: int = 50):
    """
    Scores:
      - heat: hotter and less green  -> higher score
      - greenspace: greener          -> higher score
      - cool: cooler                 -> higher score
    """
    df = HexStore.load().copy()

    # safe z-score
    def z(s):
        s = s.astype(float)
        std = s.std(ddof=0)
        return (s - s.mean()) / (std if std else 1.0)

    if theme == "greenspace":
        df["score"] = z(df["ndvi_mean"])
    elif theme == "cool":
        df["score"] = -z(df["lst_day_mean"])
    else:  # "heat"
        df["score"] = z(df["lst_day_mean"]) + (-z(df["ndvi_mean"]))

    out = (
        df.dropna(subset=["lat", "lon", "score"])
          .sort_values("score", ascending=False)
          .head(int(limit))
    )

    items = []
    for _, r in out.iterrows():
        items.append({
            "hex_id": r["hex_id"],
            "lat": float(r["lat"]),
            "lon": float(r["lon"]),
            "score": float(r["score"])
        })
    return items


def hex_stats(hex_id: str):
    df = HexStore.load()
    hit = df.loc[df["hex_id"] == str(hex_id)]
    if hit.empty:
        return None
    r = hit.iloc[0]
    return {
        "hex_id": r["hex_id"],
        "ndvi_mean": None if pd.isna(r["ndvi_mean"]) else round(float(r["ndvi_mean"]), 3),
        "lst_day_mean": None if pd.isna(r["lst_day_mean"]) else round(float(r["lst_day_mean"]), 2),
        "pop_density": None if pd.isna(r["pop_density"]) else int(r["pop_density"]),
    }
