"""
Pydantic schemas for LLM-related API endpoints.
"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime


# ==================== Chat Schemas ====================

class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: Optional[datetime] = None


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    pipeline_context: Optional[Dict[str, Any]] = None  # Current nodes/edges


class ChatAction(BaseModel):
    type: Literal["add_block", "update_block", "remove_block", "run_pipeline", "run_eda", "download_dataset"]
    block_type: Optional[str] = None
    block_id: Optional[str] = None
    params: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    message: str
    session_id: str
    suggestions: Optional[List[Dict[str, Any]]] = None
    actions: Optional[List[ChatAction]] = None


# ==================== EDA Schemas ====================

class EDARequest(BaseModel):
    file_path: str
    target_column: Optional[str] = None
    analysis_depth: Literal["quick", "standard", "deep"] = "standard"


class EDAInsight(BaseModel):
    category: Literal["distribution", "correlation", "quality", "anomaly", "recommendation"]
    title: str
    description: str
    severity: Literal["info", "warning", "critical"]
    affected_columns: Optional[List[str]] = None
    recommendation: Optional[str] = None


class EDAResponse(BaseModel):
    summary: str
    insights: List[EDAInsight]
    data_quality_score: Optional[int] = None
    data_profile: Dict[str, Any]
    recommended_preprocessing: Optional[List[str]] = None
    target_analysis: Optional[Dict[str, Any]] = None


# ==================== Feature Engineering Schemas ====================

class FeatureSuggestion(BaseModel):
    name: str
    description: str
    transformation: str
    code: str
    rationale: str
    estimated_impact: Literal["low", "medium", "high"]
    dependencies: List[str]


class FeatureSuggestRequest(BaseModel):
    file_path: str
    target_column: str
    existing_features: Optional[List[str]] = None
    task_type: Literal["classification", "regression"] = "classification"


class FeatureSuggestResponse(BaseModel):
    suggestions: List[FeatureSuggestion]
    interaction_features: Optional[List[Dict[str, Any]]] = None
    encoding_recommendations: Optional[Dict[str, Any]] = None
    scaling_recommendations: Optional[Dict[str, Any]] = None


# ==================== Model Recommendation Schemas ====================

class ModelRecommendation(BaseModel):
    rank: int
    model_name: str
    model_type: str
    rationale: str
    pros: List[str]
    cons: List[str]
    hyperparameters: Dict[str, Any]
    estimated_performance: Literal["low", "medium", "high"]
    training_time: Literal["fast", "medium", "slow"]
    interpretability: Literal["low", "medium", "high"]


class ModelRecommendRequest(BaseModel):
    file_path: Optional[str] = None
    data_summary: Optional[Dict[str, Any]] = None
    target_column: str
    task_type: Literal["classification", "regression"] = "classification"
    priority: Literal["accuracy", "speed", "interpretability"] = "accuracy"


class ModelRecommendResponse(BaseModel):
    recommendations: List[ModelRecommendation]
    analysis: Dict[str, Any]
    preprocessing_required: Optional[List[str]] = None
    cross_validation_strategy: Optional[str] = None


# ==================== Code Generation Schemas ====================

class CodeGenRequest(BaseModel):
    description: str
    component_type: Literal["loss_function", "activation", "layer", "callback", "metric"]


class CodeGenResponse(BaseModel):
    code: str
    explanation: str
    usage_example: str
    dependencies: List[str]
    warnings: Optional[List[str]] = None


# ==================== Pipeline Suggestion Schemas ====================

class BlockSuggestion(BaseModel):
    type: str
    params: Dict[str, Any]
    explanation: str


class PipelineSuggestionRequest(BaseModel):
    user_message: str
    current_pipeline: Optional[Dict[str, Any]] = None


class PipelineSuggestionResponse(BaseModel):
    message: str
    understood_intent: str
    suggested_blocks: List[BlockSuggestion]
    suggested_connections: Optional[List[Dict[str, str]]] = None
    questions: Optional[List[str]] = None
    tips: Optional[List[str]] = None
