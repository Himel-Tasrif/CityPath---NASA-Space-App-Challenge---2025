### NASA Space App Challenge 2025

# 🌍 CityPath – AI-Powered Urban Planning Tool

CityPath is an AI-assisted geospatial analytics tool built for the **NASA Space Apps Challenge**.  
It integrates **NASA EarthData** (LST, NDVI), **WorldPop** (population density), and other datasets into a **hexagonal grid (H3)** to empower **urban planners** in identifying priority intervention areas for **parks, clinics**.

> **🌐 For a live test, please visit:**  
> [https://city-builder.phigalaxy.com/](https://city-builder.phigalaxy.com/)
---

## 📸 Demo Images

> Web Application Demo Image
![CityPath Desktop Demo](/Resource/Image/Web.png)  

> Mobile Application Demo Image
![CityPath Mobile Demo](/Resource/Image/Mobile.png)

---

## ✨ Technical Stack

- **Frontend:** React + Vite + Leaflet.js (interactive maps)
- **Backend:** FastAPI (Python), Pandas, Numpy, Rasterio, H3-py
- **Database:** Parquet files (`hex_features_ext.parquet`)
- **AI Assistant:** OpenAI GPT-4o via `openai` Python SDK
- **Data Sources:**
  - NASA AppEEARS API → MODIS LST (MOD11A2), NDVI (MOD13Q1)
  - WorldPop → Population density (1km resolution)
  - NASA GIBS overlays → Visualization layers

---

## 📚 Core Capabilities

| Feature                       | Description                                                                                 |
|-------------------------------|---------------------------------------------------------------------------------------------|
| **Hex-Grid Analysis**         | Converts Earth observation data into **H3 hexagons** for uniform geospatial comparison      |
| **Heat & Greenspace Mapping** | Identifies **urban heat islands** and **low-NDVI** areas for greening interventions        |
| **Population Hotspots**       | Highlights **densely populated** but underserved regions                                   |
| **AI Recommendations**        | Chatbot suggests **parks, clinics, housing, or energy sites** based on combined indicators |
| **Interactive Layers**        | Toggle heat, greenspace, population choropleths & recommendation markers                   |
| **Event Creation**            | “Local Leader” can create **community events** (e.g., tree plantations) on hotspot areas   |
| **Cross-Platform**            | Web (React) + Mobile (APK build available)                                                 |

---

## 📂 Project Structure

```
CityPath/
│
├── backend/
│   ├── app/
│   │   ├── data/            # Parquet + raster files
│   │   ├── routes/          # API endpoints (grid, hotspots, stats, recommend, chat)
│   │   ├── services/        # Data loaders, recommendation logic
│   │   └── main.py          # FastAPI entrypoint
│   └── scripts/
│       ├── appeears_fetch.py      # Fetches NASA AppEEARS data
│       └── build_hex_metrics.py   # Builds hex_features_ext.parquet (LST, NDVI, population…)
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Map/         # MapView, HexLayer, LegendControl
│   │   │   └── Chat/        # ChatBox UI
│   │   └── services/api.js  # Frontend API calls
│   └── vite.config.js
│
└── README.md
```


---

## ⚙️ Data Workflow

### 1. Download NASA EarthData (AppEEARS)
We use **NASA AppEEARS API** to fetch MODIS products:  
- **MOD11A2** → Land Surface Temperature (LST)  
- **MOD13Q1** → Vegetation Index (NDVI)  

Run:
```bash
cd backend/scripts
python appeears_fetch.py
```
This script downloads `.tif` rasters into:

    backend/app/data/rasters/

---

### 2. Add Population Data

We use WorldPop 1km population density.  
Example: `bgd_pd_2020_1km.tif` for Dhaka, Bangladesh.  
Place it manually into:

    backend/app/data/rasters/

---

### 3. Build Hex Metrics Table

After rasters are ready, run:
```bash
python build_hex_metrics.py
```
This script:
- Converts rasters to a common grid
- Samples values into H3 hexagons (resolution 9 ≈ 460m edge)
- Creates a `hex_features_ext.parquet` file in:

      backend/app/data/

---

## ⚙️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/Himel-Tasrif/CityPath---NASA-Space-App-Challenge---2025.git
cd CityPath---NASA-Space-App-Challenge---2025
```

### 2. Backend Setup (FastAPI + Python)

```bash
cd backend
python -m venv nasa
source nasa/bin/activate  # On Windows: nasa\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory with these variables:

```env
OPENAI_API_KEY= Your OpenAI API Key
EARTHDATA_TOKEN= Your Earthdata Token
CITY_NAME=Dhaka
CITY_CENTER_LAT=23.8103
CITY_CENTER_LON=90.4125
```

Run the backend server:

```bash
uvicorn app.main:app --reload --port 8080
```

### 3. Frontend Setup (React + Vite)

- Install [Node.js](https://nodejs.org/) (LTS recommended).

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at: [http://localhost:5173/](http://localhost:5173/)

---

## 📊 Data Sources

- **NASA AppEEARS**  
  [appeears.earthdatacloud.nasa.gov](https://appeears.earthdatacloud.nasa.gov/)  
  Used via `appeears_fetch.py` to download MODIS LST (MOD11A2) and NDVI (MOD13Q1).

- **WorldPop Population Density (1km)**  
  [hub.worldpop.org/geodata/](https://hub.worldpop.org/geodata/summary?id=40150)  
  Example: `bgd_pd_2020_1km.tif` for Dhaka.

---

## 🧠 Recommendation Logic

- **Parks:** Hot (high LST) + Bare (low NDVI) + Populated
- **Clinics:** Hot + High Population Density
- **Housing Growth:** High Nighttime Lights + Low Pop Density
- **Agriculture:** Low cropland_frac but suitable land
- **Energy:** Low Nighttime Lights but high population

---

## 📱 Mobile APP
- [Mobile APK Download](/App%20File/app-release.apk)

## 🎥 Documentation
- [Documentation PDF](docs/CityPath_Documentation.pdf)

## 📄Video
- [Demo Video](docs/video/demo.mp4)

---

## Contact

**Team Leader:** Tasrif Nur Himel
- 📧 Email: himel35-1078@diu.edu.bd  
- 🌐 [Portfolio](https://www.tasrifnurhimel.me/)
- ℹ️ [LinkedIn](https://linkedin.com/in/tasrifnurhimel)

---


## CityPath – Empowering urban planners with AI & NASA Earth Data

---

> **This README includes:**
> - Project intro + demo images
> - Tech stack
> - Features (table format)
> - File structure
> - Setup instructions (backend + frontend)
> - Data sources + links
> - Recommendation logic
> - Download links (APK, docs, video)
> - Contact info

---

>
