from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.grid import router as grid_router
from app.routes.layers import router as layers_router
from app.routes.stats import router as stats_router
from app.routes.hotspots import router as hotspots_router
from app.routes.chat import router as chat_router
from app.routes.recommend import router as recommend_router

app = FastAPI(title="CityPath API", version="0.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

# routers already carry their /api/... prefix
app.include_router(layers_router)
app.include_router(stats_router)
app.include_router(hotspots_router)
app.include_router(chat_router)
app.include_router(grid_router)
app.include_router(recommend_router)