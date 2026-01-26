from typing import List, Dict, Any, Literal
from pydantic import BaseModel

BlockType = Literal[
    "dataset",
    "split",
    "feature_pipeline",
    "model",
    "metrics",
    "trainer"
]

class Block(BaseModel):
    block_id: str
    type: BlockType
    params: Dict[str, Any]
    inputs: List[str]
    outputs: List[str]
