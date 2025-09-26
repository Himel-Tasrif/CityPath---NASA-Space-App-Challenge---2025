import os
from pathlib import Path
import glob

import numpy as np
import pandas as pd
import rasterio
from rasterio.warp import reproject, Resampling
from h3 import h3
from tqdm import tqdm
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parents[1]
RASTERS_DIR = BASE_DIR / "app" / "data" / "rasters"

# 👉 write to a *new* parquet so we don't clash with the old file
OUT_PARQUET = BASE_DIR / "app" / "data" / "hex_features_ext.parquet"

# Study area / bbox (same as you used for AppEEARS)
CITY_NAME = os.getenv("CITY_NAME", "Dhaka")
CITY_CENTER_LAT = float(os.getenv("CITY_CENTER_LAT", 23.8103))
CITY_CENTER_LON = float(os.getenv("CITY_CENTER_LON", 90.4125))
BBOX = [90.20, 23.60, 90.60, 24.00]  # minlon, minlat, maxlon, maxlat

# H3 resolution (~460 m edge; good compromise between LST@1km and NDVI@250m)
H3_RES = 9

# ------------------ scale helpers ------------------

def lst_scale_to_celsius(arr: np.ndarray) -> np.ndarray:
    """MOD11A2 LST_Day_1km: Kelvin*0.02 -> °C (filter 0 and negatives)."""
    arr = arr.astype("float32")
    arr[arr <= 0] = np.nan
    return arr * 0.02 - 273.15

def ndvi_scale(arr: np.ndarray) -> np.ndarray:
    """MOD13Q1 NDVI: scale 0.0001; clamp to [-1,1]; drop extreme fills."""
    arr = arr.astype("float32")
    arr[arr < -2000] = np.nan
    arr[arr > 10000] = np.nan
    arr = arr * 0.0001
    arr[(arr < -1) | (arr > 1)] = np.nan
    return arr

def pop_density_scale_pd_to_km2(arr: np.ndarray) -> np.ndarray:
    """
    WorldPop 'pd' 1km: persons per hectare.
    Convert to persons per km² by multiplying by 100.
    """
    arr = arr.astype("float32")
    # WorldPop uses -3.40282e+38 (float32 min) or negative values as nodata sometimes
    arr[~np.isfinite(arr)] = np.nan
    arr[arr < 0] = np.nan
    return arr * 100.0  # persons / km^2

# ------------------ raster utilities ------------------

def list_geotiffs(pattern: str):
    return sorted(glob.glob(str(RASTERS_DIR / pattern), recursive=True))

def stack_mean_on_first_grid(file_list, scaler=None):
    """
    Resamples each raster onto the grid of the first file, stacks over time,
    and returns (mean_img, transform, crs).
    """
    if not file_list:
        return None, None, None

    with rasterio.open(file_list[0]) as ref:
        ref_transform = ref.transform
        ref_crs = ref.crs
        ref_width = ref.width
        ref_height = ref.height

    stack = []
    for fp in tqdm(file_list, desc=f"Stacking {Path(file_list[0]).stem.split('_')[0]}"):
        with rasterio.open(fp) as src:
            data = src.read(1).astype("float32")
            dst = np.full((ref_height, ref_width), np.nan, dtype="float32")
            reproject(
                source=data,
                destination=dst,
                src_transform=src.transform,
                src_crs=src.crs,
                dst_transform=ref_transform,
                dst_crs=ref_crs,
                resampling=Resampling.average,
            )
            if scaler:
                dst = scaler(dst)
            stack.append(dst)

    stack = np.stack(stack, axis=0)  # (time, rows, cols)
    mean_img = np.nanmean(stack, axis=0)
    return mean_img, ref_transform, ref_crs

def reproject_to_grid(src_img, src_transform, src_crs, dst_shape, dst_transform, dst_crs):
    """Reproject a single 2D array to a target grid."""
    dst = np.full(dst_shape, np.nan, dtype="float32")
    reproject(
        source=src_img,
        destination=dst,
        src_transform=src_transform,
        src_crs=src_crs,
        dst_transform=dst_transform,
        dst_crs=dst_crs,
        resampling=Resampling.average,
    )
    return dst

# ------------------ H3 helpers ------------------

def center_of_hex(hex_id):
    lat, lon = h3.h3_to_geo(hex_id)
    return lat, lon

def lonlat_to_rowcol(transform, lon, lat):
    col, row = ~transform * (lon, lat)
    return int(round(row)), int(round(col))

def sample_from_grid(img, transform, lon, lat):
    r, c = lonlat_to_rowcol(transform, lon, lat)
    if r < 0 or c < 0 or r >= img.shape[0] or c >= img.shape[1]:
        return np.nan
    return float(img[r, c])

# ------------------ main ------------------

def main():
    # 1) Collect rasters
    lst_files  = list_geotiffs("**/*LST_Day_1km*.tif")
    ndvi_files = list_geotiffs("**/*_250m_16_days_NDVI*.tif")
    # WorldPop population density: persons per hectare @ 1km
    # Your file name is: bgd_pd_2020_1km.tif
    pop_files  = list_geotiffs("**/*pd*1km*.tif")

    if not lst_files:
        print("No LST files found.")
    if not ndvi_files:
        print("No NDVI files found.")
    if not pop_files:
        print("No WorldPop population density files found (pattern '*pd*1km*.tif').")

    if not lst_files or not ndvi_files or not pop_files:
        return

    # 2) Build mean LST (this defines the reference grid)
    print("\nBuilding mean LST (°C) …")
    lst_mean, lst_transform, lst_crs = stack_mean_on_first_grid(lst_files, scaler=lst_scale_to_celsius)

    # 3) Build mean NDVI (then reproject to LST grid if needed)
    print("Building mean NDVI …")
    ndvi_mean, ndvi_transform, ndvi_crs = stack_mean_on_first_grid(ndvi_files, scaler=ndvi_scale)
    if (ndvi_crs != lst_crs) or (ndvi_transform != lst_transform) or (ndvi_mean.shape != lst_mean.shape):
        print("Reprojecting NDVI → LST grid …")
        ndvi_mean = reproject_to_grid(
            ndvi_mean, ndvi_transform, ndvi_crs,
            lst_mean.shape, lst_transform, lst_crs
        )

    # 4) Build mean POP density (then reproject to LST grid if needed)
    print("Building mean Population Density (WorldPop pd, persons/km²) …")
    pop_mean, pop_transform, pop_crs = stack_mean_on_first_grid(pop_files, scaler=pop_density_scale_pd_to_km2)
    if (pop_crs != lst_crs) or (pop_transform != lst_transform) or (pop_mean.shape != lst_mean.shape):
        print("Reprojecting Population Density → LST grid …")
        pop_mean = reproject_to_grid(
            pop_mean, pop_transform, pop_crs,
            lst_mean.shape, lst_transform, lst_crs
        )

    # 5) Create H3 hex set over bbox
    minlon, minlat, maxlon, maxlat = BBOX

    def in_bbox(lat, lon):
        return (minlat <= lat <= maxlat) and (minlon <= lon <= maxlon)

    seeds = [
        h3.geo_to_h3(minlat, minlon, H3_RES),
        h3.geo_to_h3(minlat, maxlon, H3_RES),
        h3.geo_to_h3(maxlat, minlon, H3_RES),
        h3.geo_to_h3(maxlat, maxlon, H3_RES),
        h3.geo_to_h3(CITY_CENTER_LAT, CITY_CENTER_LON, H3_RES),
    ]
    hexes = set(seeds)
    for k in range(1, 18):
        for s in list(hexes):
            hexes.update(h3.k_ring(s, k))
    hexes = [h for h in hexes if in_bbox(*center_of_hex(h))]

    # 6) Sample each hex center
    rows = []
    print(f"Sampling {len(hexes)} hexes at resolution {H3_RES} …")
    for hx in tqdm(hexes):
        lat, lon = center_of_hex(hx)
        ndvi = sample_from_grid(ndvi_mean, lst_transform, lon, lat)
        lstc = sample_from_grid(lst_mean,  lst_transform, lon, lat)
        popd = sample_from_grid(pop_mean,  lst_transform, lon, lat)  # persons / km²

        rows.append({
            "hex_id": hx,
            "lat": lat,
            "lon": lon,
            "ndvi_mean": None if np.isnan(ndvi) else float(ndvi),
            "lst_day_mean": None if np.isnan(lstc) else float(lstc),
            "pop_density": None if np.isnan(popd) else float(popd),  # persons/km²
        })

    # 7) Save
    df = pd.DataFrame(rows)
    df = df.dropna(subset=["ndvi_mean", "lst_day_mean"], how="all").reset_index(drop=True)
    OUT_PARQUET.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(OUT_PARQUET, index=False)
    print(f"Saved hex metrics → {OUT_PARQUET} ({len(df)} rows)")

if __name__ == "__main__":
    main()
