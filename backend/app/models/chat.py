from pydantic import BaseModel
from typing import List, Optional, Any

class ChatRequest(BaseModel):
    question: str

class ChatCitation(BaseModel):
    title: str
    source: str

class ChatResponse(BaseModel):
    answer: str
    highlights: Optional[list[Any]] = None
    citations: Optional[List[ChatCitation]] = None
