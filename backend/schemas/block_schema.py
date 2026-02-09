from typing import List, Dict, Any
from pydantic import BaseModel


class Block(BaseModel):
    block_id: str
    type: str  # Accepts built-in and custom block types
    params: Dict[str, Any]
    inputs: List[str]
    outputs: List[str]

class PipelineBlock(BaseModel):
    id: str
    type: str
    params: Dict[str, Any] = {}
    inputs: List[str] = []
    outputs: List[str] = []