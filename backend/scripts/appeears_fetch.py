import os, time, json, sys
import requests
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

# ---- config ----
EARTHDATA_TOKEN = os.getenv("EARTHDATA_TOKEN")
if not EARTHDATA_TOKEN:
    print("ERROR: EARTHDATA_TOKEN not set in environment (.env).")
    sys.exit(1)

# Dhaka approx bbox polygon (minlon,minlat,maxlon,maxlat)
# We make a simple GeoJSON polygon from bbox
BBOX = [90.20, 23.60, 90.60, 24.00]  # tweak if you like
START_DATE = "04-01-2024"
END_DATE   = "06-30-2024"


# MODIS products/layers
# MOD11A2: 8-day LST Day 1km
# MODIS products/layers  ✅ use lowercase keys
LAYER_LST  = {"product": "MOD11A2.061", "layer": "LST_Day_1km"}  # 8-day LST Day 1km
LAYER_NDVI = {"product": "MOD13Q1.061", "layer": "_250m_16_days_NDVI"}         # 16-day NDVI 250m


OUT_DIR = Path(__file__).resolve().parents[1] / "app" / "data" / "rasters"
OUT_DIR.mkdir(parents=True, exist_ok=True)

BASE = "https://appeears.earthdatacloud.nasa.gov/api"

HEADERS = {"Authorization": f"Bearer {EARTHDATA_TOKEN}", "Content-Type": "application/json"}

def bbox_to_geojson(bbox):
    minlon, minlat, maxlon, maxlat = bbox
    return {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [minlon, minlat],
                    [maxlon, minlat],
                    [maxlon, maxlat],
                    [minlon, maxlat],
                    [minlon, minlat]
                ]]
            },
            "properties": {"name": "Dhaka bbox"}
        }]
    }

def submit_area_task():
    payload = {
        "task_type": "area",
        "task_name": "citypath_dhaka_modis",
        "params": {
            "dates": [
                {"startDate": START_DATE, "endDate": END_DATE}
            ],
            "layers": [
                {"product": "MOD11A2.061", "layer": "LST_Day_1km"},
                {"product": "MOD13Q1.061", "layer": "_250m_16_days_NDVI"}
            ],
            "geo": bbox_to_geojson(BBOX),
            "output": {
                "format": {"type": "geotiff"},
                "projection": "geographic"
            }
        }
    }
    r = requests.post(f"{BASE}/task", headers=HEADERS, json=payload)
    print("DEBUG response:", r.text)  # 👈 helpful debug
    r.raise_for_status()
    tid = r.json()["task_id"]
    print("Submitted task:", tid)
    return tid


def wait_for_task(tid, poll=15):
    while True:
        r = requests.get(f"{BASE}/status/{tid}", headers=HEADERS)
        r.raise_for_status()
        st = r.json()
        print("status:", st.get("status"), st.get("progress", ""))
        if st.get("status") in ("done", "failed"):
            return st
        time.sleep(poll)

def list_bundle(tid):
    r = requests.get(f"{BASE}/bundle/{tid}", headers=HEADERS)
    r.raise_for_status()
    return r.json()

def download_file(task_id, file_obj):
    fid = file_obj["file_id"]
    name = file_obj["file_name"]
    url = f"{BASE}/bundle/{task_id}/{fid}"   # ✅ includes task_id
    out_path = OUT_DIR / name
    out_path.parent.mkdir(parents=True, exist_ok=True)  # ✅ create subfolders if needed
    print("Downloading:", name)

    with requests.get(url, headers=HEADERS, stream=True) as resp:
        resp.raise_for_status()
        with open(out_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
    print("Saved:", out_path)


def main():
    tid = submit_area_task()
    st = wait_for_task(tid)
    if st.get("status") != "done":
        print("Task failed:", st)
        sys.exit(1)

    bundle = list_bundle(tid)
    files = bundle.get("files", [])
    wanted_ext = (".tif", ".tiff")
    dl = [f for f in files if f["file_name"].lower().endswith(wanted_ext)]
    if not dl:
        print("No GeoTIFFs found in bundle; bundle keys:", [f["file_name"] for f in files])
        return

    for f in dl:
        download_file(tid, f)


    print("\nAll rasters downloaded to:", OUT_DIR)
    print("Next step: build hex metrics from these rasters.")

if __name__ == "__main__":
    main()
