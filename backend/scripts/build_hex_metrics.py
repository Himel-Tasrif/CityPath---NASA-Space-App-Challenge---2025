import os
from pathlib import Path
import glob
import math

import numpy as np
import pandas as pd
import rasterio
from rasterio.merge import merge
from rasterio.warp import transform_bounds
from h3 import h3
from tqdm import tqdm
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parents[1]
RASTERS_DIR = BASE_DIR / "app" / "data" / "rasters"
OUT_PARQUET = BASE_DIR / "app" / "data" / "hex_features.parquet"

# City center / bbox (same we used for AppEEARS)
CITY_NAME = os.getenv("CITY_NAME", "Dhaka")
CITY_CENTER_LAT = float(os.getenv("CITY_CENTER_LAT", 23.8103))
CITY_CENTER_LON = float(os.getenv("CITY_CENTER_LON", 90.4125))
# The bbox we used to download
BBOX = [90.20, 23.60, 90.60, 24.00]  # minlon, minlat, maxlon, maxlat

# H3 resolution: 9 is ~0.18km^2 cells (~460m edge) -> good compromise between 1km LST and 250m NDVI
H3_RES = 9

# Scale factors
# MOD11A2 LST_Day_1km: scale = 0.02 Kelvin; to Celsius: val*0.02 - 273.15 ; fill usually 0
def lst_scale_to_celsius(arr):
    arr = arr.astype("float32")
    arr[arr <= 0] = np.nan
    return arr * 0.02 - 273.15

# MOD13Q1 NDVI: scale = 0.0001; fill often -3000; valid range [-2000..10000]
def ndvi_scale(arr):
    arr = arr.astype("float32")
    # Treat very negative or extreme values as nodata
    arr[arr < -2000] = np.nan
    arr[arr > 10000] = np.nan
    arr = arr * 0.0001
    # optional clamp [-1,1]
    arr[arr < -1] = np.nan
    arr[arr > 1] = np.nan
    return arr

def list_geotiffs(pattern):
    return sorted(glob.glob(str(RASTERS_DIR / pattern), recursive=True))

def mosaic_or_stack_mean(file_list, scaler=None):
    """
    Reads all GeoTIFFs in file_list and returns:
    - a single in-memory rasterio dataset (mosaicked to one array in common grid)
    - a numpy 2D array with mean across time (nanmean)
    """
    if not file_list:
        return None, None

    # Strategy: open all, reproject/merge to first CRS+res via rasterio.merge.merge
    srcs = [rasterio.open(fp) for fp in file_list]
    try:
        mosaic, transform = merge(srcs)  # mosaic shape: (bands, rows, cols)
        # We expect single-band rasters; mosaic[0] is first image, mosaic[i] stacked per-file? No: merge blends
        # For per-time mean, do NOT mosaic across files at once. Instead, resample onto first grid manually.

    finally:
        for s in srcs:
            s.close()

    # The above 'merge' produces ONE blended array; that's not what we want across time slices.
    # Instead, re-open and resample each to the grid of the first file, then stack.

def stack_mean_on_first_grid(file_list, scaler=None):
    if not file_list:
        return None, None, None

    # Use first file as the target grid
    with rasterio.open(file_list[0]) as ref:
        ref_profile = ref.profile
        ref_transform = ref.transform
        ref_crs = ref.crs
        ref_width = ref.width
        ref_height = ref.height
        ref_bounds = ref.bounds

    stack = []
    for fp in tqdm(file_list, desc="Stacking"):
        with rasterio.open(fp) as src:
            # Reproject to ref grid if needed
            if src.crs != ref_crs or src.transform != ref_transform or src.width != ref_width or src.height != ref_height:
                data = src.read(1)
                dst = np.full((ref_height, ref_width), np.nan, dtype="float32")
                rasterio.warp.reproject(
                    source=data,
                    destination=dst,
                    src_transform=src.transform,
                    src_crs=src.crs,
                    dst_transform=ref_transform,
                    dst_crs=ref_crs,
                    resampling=rasterio.warp.Resampling.average,
                )
            else:
                dst = src.read(1).astype("float32")

            if scaler:
                dst = scaler(dst)
            stack.append(dst)

    stack = np.stack(stack, axis=0)  # (time, rows, cols)
    mean_img = np.nanmean(stack, axis=0)  # (rows, cols)
    return mean_img, ref_transform, ref_crs

def center_of_hex(hex_id):
    lat, lon = h3.h3_to_geo(hex_id)
    return lat, lon

def lonlat_to_rowcol(transform, lon, lat):
    col, row = ~transform * (lon, lat)
    # nearest pixel
    return int(round(row)), int(round(col))

def sample_from_grid(mean_img, transform, lon, lat):
    row, col = lonlat_to_rowcol(transform, lon, lat)
    if row < 0 or col < 0 or row >= mean_img.shape[0] or col >= mean_img.shape[1]:
        return np.nan
    return float(mean_img[row, col])

def main():
    # Gather file lists
    lst_files = list_geotiffs("**/*LST_Day_1km*.tif")
    ndvi_files = list_geotiffs("**/*_250m_16_days_NDVI*.tif")

    if not lst_files:
        print("No LST files found.")
    if not ndvi_files:
        print("No NDVI files found.")
    if not lst_files or not ndvi_files:
        return

    # Build mean grids
    print("\nBuilding mean LST (°C) ...")
    lst_mean, lst_transform, lst_crs = stack_mean_on_first_grid(lst_files, scaler=lst_scale_to_celsius)

    print("Building mean NDVI ...")
    ndvi_mean, ndvi_transform, ndvi_crs = stack_mean_on_first_grid(ndvi_files, scaler=ndvi_scale)

    # Check CRSs match; if not, reproject NDVI to LST grid (simplify)
    if ndvi_crs != lst_crs or ndvi_transform != lst_transform or ndvi_mean.shape != lst_mean.shape:
        print("Reprojecting NDVI mean to LST grid for consistent sampling ...")
        dst = np.full(lst_mean.shape, np.nan, dtype="float32")
        rasterio.warp.reproject(
            source=ndvi_mean,
            destination=dst,
            src_transform=ndvi_transform,
            src_crs=ndvi_crs,
            dst_transform=lst_transform,
            dst_crs=lst_crs,
            resampling=rasterio.warp.Resampling.average,
        )
        ndvi_mean = dst

    # Build H3 set over bbox
    minlon, minlat, maxlon, maxlat = BBOX
    # Get a coarse grid by filling a ring of points along the bbox
    seeds = [
        h3.geo_to_h3(minlat, minlon, H3_RES),
        h3.geo_to_h3(minlat, maxlon, H3_RES),
        h3.geo_to_h3(maxlat, minlon, H3_RES),
        h3.geo_to_h3(maxlat, maxlon, H3_RES),
        h3.geo_to_h3(CITY_CENTER_LAT, CITY_CENTER_LON, H3_RES),
    ]
    hexes = set(seeds)
    # Expand around center by k rings to cover bbox (~15 rings is plenty for a medium bbox)
    for k in range(1, 18):
        for s in list(hexes):
            hexes.update(h3.k_ring(s, k))
    # Filter hexes to bbox
    def in_bbox(lat, lon):
        return (minlat <= lat <= maxlat) and (minlon <= lon <= maxlon)
    hexes = [h for h in hexes if in_bbox(*center_of_hex(h))]

    rows = []
    print(f"Sampling {len(hexes)} hexes at resolution {H3_RES} ...")
    for hx in tqdm(hexes):
        lat, lon = center_of_hex(hx)
        ndvi = sample_from_grid(ndvi_mean, ndvi_transform, lon, lat)
        lstc = sample_from_grid(lst_mean, lst_transform, lon, lat)
        rows.append({
            "hex_id": hx,
            "lat": lat,
            "lon": lon,
            "ndvi_mean": None if np.isnan(ndvi) else float(ndvi),
            "lst_day_mean": None if np.isnan(lstc) else float(lstc),
            # TODO: add real population later; 0 for now
            "pop_density": 0
        })

    df = pd.DataFrame(rows)
    # simple cleaning: drop rows where both ndvi and lst are nan
    df = df.dropna(subset=["ndvi_mean", "lst_day_mean"], how="all").reset_index(drop=True)
    OUT_PARQUET.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(OUT_PARQUET, index=False)
    print(f"Saved hex metrics → {OUT_PARQUET} ({len(df)} rows)")

if __name__ == "__main__":
    main()
