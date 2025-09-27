from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from openai import OpenAI
import os
import json
import asyncio

from app.services.recommend import suggest_parks, suggest_clinics

router = APIRouter(prefix="/api/chat", tags=["chat"])
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

def detect_intent(question):
    """Detect what the user is asking for based on keywords."""
    question_lower = question.lower()
    
    park_keywords = ['park', 'green', 'tree', 'vegetation', 'ndvi', 'cool', 'shade']
    clinic_keywords = ['clinic', 'hospital', 'health', 'medical', 'healthcare', 'treatment']
    heat_keywords = ['heat', 'hot', 'temperature', 'lst', 'cooling', 'thermal']
    
    scores = {
        'parks': sum(1 for keyword in park_keywords if keyword in question_lower),
        'clinics': sum(1 for keyword in clinic_keywords if keyword in question_lower),
        'heat': sum(1 for keyword in heat_keywords if keyword in question_lower)
    }
    
    return max(scores, key=scores.get) if max(scores.values()) > 0 else 'general'

async def stream_openai_response(messages, markers=None):
    """Stream GPT output with markers at the end."""
    
    async def event_generator():
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                stream=True,
                temperature=0.7,
                max_tokens=500
            )
            
            full_text = ""
            for chunk in response:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_text += content
                    # Send each chunk as SSE format
                    yield f"data: {json.dumps({'type': 'content', 'data': content})}\n\n"
            
            # Send markers at the end
            if markers:
                yield f"data: {json.dumps({'type': 'markers', 'data': markers})}\n\n"
            
            # Send completion signal
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'data': str(e)})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

def safe_format_value(value, format_spec=""):
    """Safely format a value that might be None."""
    if value is None:
        return "—"
    try:
        if format_spec:
            return f"{value:{format_spec}}"
        return str(value)
    except:
        return "—"

@router.post("/")
async def chat(request: Request):
    body = await request.json()
    question = body.get("question", "")
    
    if not question.strip():
        return {"error": "Question cannot be empty"}
    
    # Detect user intent
    intent = detect_intent(question)
    
    markers = []
    context = ""
    
    try:
        if intent == 'parks':
            markers = suggest_parks(limit=15)
            context = "The user is asking about where to add parks, green spaces, or vegetation. Focus on areas with high heat and low vegetation."
        elif intent == 'clinics':
            markers = suggest_clinics(limit=15)
            context = "The user is asking about where to place clinics or healthcare facilities. Focus on areas with high population density and accessibility."
        elif intent == 'heat':
            # You might want to create a suggest_heat_areas function
            markers = suggest_parks(limit=10)  # Temporary - use parks for heat-related queries
            context = "The user is asking about heat hotspots or temperature-related urban planning."
        else:
            context = "The user is asking a general question about urban planning."
    except Exception as e:
        print(f"Error getting markers: {e}")
        markers = []
    
    # Create a summary of the data for GPT
    if markers:
        marker_summary = []
        for i, m in enumerate(markers[:5]):  # Limit to first 5 for context
            hex_id = m.get('hex_id', 'Unknown')
            why = m.get('why', {})
            
            lst = safe_format_value(why.get('lst_day_mean'), '.1f')
            ndvi = safe_format_value(why.get('ndvi_mean'), '.2f')
            pop = safe_format_value(why.get('pop_density'))
            
            marker_summary.append(
                f"• Location {i+1} (Hex {hex_id}): Temperature={lst}°C, Vegetation={ndvi}, Population={pop}"
            )
        
        sample_data = "\n".join(marker_summary)
        if len(markers) > 5:
            sample_data += f"\n... and {len(markers) - 5} more locations"
    else:
        sample_data = "No specific locations identified for this query."
    
    # Create messages for GPT
    system_prompt = """You are an expert urban planning AI assistant specializing in data-driven city development. 

Your expertise includes:
- Heat island effect mitigation through strategic green space placement
- Healthcare facility optimization based on population density and accessibility
- Environmental data analysis (LST, NDVI, population metrics)
- Sustainable urban development recommendations

Always provide:
1. Clear, actionable recommendations
2. Data-driven reasoning
3. Consideration of environmental and social factors
4. Professional tone suitable for city officials and planners

Keep responses concise but informative (under 200 words)."""

    user_message = f"""Context: {context}

User Question: {question}

Available Data:
{sample_data}

Please provide a comprehensive answer with specific recommendations based on the data. If locations are mentioned, explain why these areas were selected based on their environmental and demographic characteristics."""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message}
    ]
    
    return await stream_openai_response(messages, markers)