from pydantic import BaseModel
from typing import Dict, Any, List


class PipelineBlock(BaseModel):
    id: str
    type: str
    params: Dict[str, Any] = {}
    inputs: List[str] = []
