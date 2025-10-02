# app/routes/chat.py
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from openai import OpenAI
import os
import json
import math

from app.services.recommend import suggest_parks, suggest_clinics

router = APIRouter(prefix="/api/chat", tags=["chat"])
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

def _fmt(x, nd=2, none_dash=True):
    if x is None:
        return "—" if none_dash else ""
    try:
        return str(round(float(x), nd))
    except Exception:
        return str(x)

def stream_openai(messages, markers=None):
    """Stream GPT output, append [MARKERS] JSON at the end for the UI."""
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        temperature=0.2,            # concise, consistent
        max_tokens=180,             # hard cap to keep output short
        stream=True,
    )

    async def event_gen():
        try:
            for chunk in response:
                delta = getattr(chunk.choices[0].delta, "content", None)
                if delta:
                    yield delta
        finally:
            if markers:
                yield f"\n\n[MARKERS]{json.dumps(markers)}"

    return StreamingResponse(event_gen(), media_type="text/plain")

@router.post("/")
async def chat(request: Request):
    body = await request.json()
    question = (body.get("question") or "").strip()
    qlow = question.lower()

    # Pick tool + context
    markers = []
    if "park" in qlow or "green" in qlow or "tree" in qlow:
        markers = suggest_parks(limit=10)
        intent = "parks"
        context = "The user wants locations for new parks/trees (hot + bare + populated)."
    elif "clinic" in qlow or "health" in qlow or "hospital" in qlow:
        markers = suggest_clinics(limit=10)
        intent = "clinics"
        context = "The user wants locations for clinics (hot + populated)."
    else:
        intent = "general"
        context = "The user asked a general planning question; be brief and helpful."

    # Make a tiny, rounded summary so the model stays terse
    lines = []
    for m in markers[:10]:
        why = m.get("why", {})
        lines.append(
            f"- {m['hex_id']}: LST={_fmt(why.get('lst_day_mean'),1)}°C, "
            f"NDVI={_fmt(why.get('ndvi_mean'),2)}, "
            f"Pop={_fmt(why.get('pop_density'),0)}"
        )
    sample = "\n".join(lines) if lines else "No candidate markers."

    # Ultra-concise style rules
    system_rules = (
        "You are an urban planning assistant.\n"
        "STYLE:\n"
        "• Answer in 3–5 very short bullet points (no intro, no conclusion).\n"
        "• ≤ 80 words total. Be specific. No filler.\n"
        "• Tie recommendations to heat (LST), greenness (NDVI), and population.\n"
        "• If no data is available, say so briefly and suggest the next step.\n"
        "• Do NOT repeat the question.\n"
    )

    user_prompt = (
        f"{context}\n\n"
        f"User question: {question}\n\n"
        f"Candidate data (rounded):\n{sample}\n\n"
        "Return only concise bullet points with the rationale."
    )

    messages = [
        {"role": "system", "content": system_rules},
        {"role": "user", "content": user_prompt},
    ]

    return stream_openai(messages, markers)