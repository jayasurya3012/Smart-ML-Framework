from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime


class SessionNode(BaseModel):
    id: str
    type: str
    position: Dict[str, float]
    data: Dict[str, Any]


class SessionEdge(BaseModel):
    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None


class SessionData(BaseModel):
    nodes: List[SessionNode]
    edges: List[SessionEdge]


class Session(BaseModel):
    id: str
    name: str
    created_at: str
    updated_at: str
    data: SessionData


class SessionCreate(BaseModel):
    name: Optional[str] = None
    data: SessionData


class SessionUpdate(BaseModel):
    name: Optional[str] = None
    data: Optional[SessionData] = None
