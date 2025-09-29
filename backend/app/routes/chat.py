# app/routes/chat.py
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from openai import OpenAI
import os
import json

from app.services.recommend import suggest_parks, suggest_clinics

router = APIRouter(prefix="/api/chat", tags=["chat"])
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

def stream_openai(messages, markers=None):
    """Stream GPT output, wrap with markers at the end."""
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        stream=True,
    )

    async def event_gen():
        full_text = ""
        try:
            for chunk in response:
                delta = chunk.choices[0].delta.content
                if delta:
                    full_text += delta
                    yield delta
        finally:
            # At the end, append a JSON payload with markers
            if markers:
                yield f"\n\n[MARKERS]{json.dumps(markers)}"

    return StreamingResponse(event_gen(), media_type="text/plain")

@router.post("/")
async def chat(request: Request):
    body = await request.json()
    question = body.get("question", "").lower()

    markers = []
    if "park" in question:
        markers = suggest_parks(limit=10)
        context = "The user wants to know where parks/green areas are most needed."
    elif "clinic" in question:
        markers = suggest_clinics(limit=10)
        context = "The user wants to know where clinics are most needed."
    else:
        context = "The user is asking a general question about urban planning."

    # Convert markers into a short summary for GPT
    sample = "\n".join(
        f"- Hex {m['hex_id']}: LST={m['why']['lst_day_mean']}, NDVI={m['why']['ndvi_mean']}, Pop={m['why']['pop_density']}"
        for m in markers
    ) or "No markers selected."

    messages = [
        {"role": "system", "content": "You are an urban planning assistant. Always explain reasoning based on heat (LST), NDVI, and population density."},
        {"role": "user", "content": f"{context}\n\nCandidate data:\n{sample}\n\nPlease explain your recommendations clearly for city officials."}
    ]

    return stream_openai(messages, markers)