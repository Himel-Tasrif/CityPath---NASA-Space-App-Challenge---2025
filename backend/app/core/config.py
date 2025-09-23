from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()

class Settings(BaseModel):
    OPENAI_API_KEY: str | None = os.getenv("OPENAI_API_KEY")
    EARTHDATA_TOKEN: str | None = os.getenv("EARTHDATA_TOKEN")
    CITY_NAME: str = os.getenv("CITY_NAME", "Dhaka")
    CITY_CENTER_LAT: float = float(os.getenv("CITY_CENTER_LAT", "23.8103"))
    CITY_CENTER_LON: float = float(os.getenv("CITY_CENTER_LON", "90.4125"))

settings = Settings()
