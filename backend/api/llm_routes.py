"""
LLM-powered API endpoints for intelligent ML assistance.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import pandas as pd
import numpy as np
import uuid
import os

from schemas.llm_schema import (
    ChatRequest, ChatResponse, ChatAction,
    EDARequest, EDAResponse, EDAInsight,
    FeatureSuggestRequest, FeatureSuggestResponse, FeatureSuggestion,
    ModelRecommendRequest, ModelRecommendResponse, ModelRecommendation,
    PipelineSuggestionRequest, PipelineSuggestionResponse
)
from llm.groq_client import groq_service
from llm.prompts import get_chat_prompt, get_eda_prompt, get_feature_prompt, get_model_prompt, get_custom_block_prompt
from custom_blocks.manager import manager as block_manager
from utils.logger import logger

router = APIRouter(prefix="/llm", tags=["LLM"])

# In-memory chat sessions (in production, use Redis or database)
chat_sessions: Dict[str, list] = {}


# ==================== Chat Endpoint ====================

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Natural language chat with the ML assistant.
    Can understand user intent and suggest pipeline actions.
    """
    try:
        # Get or create session
        session_id = request.session_id or str(uuid.uuid4())
        if session_id not in chat_sessions:
            chat_sessions[session_id] = []

        history = chat_sessions[session_id]

        # Generate response
        system_prompt, user_prompt = get_chat_prompt(
            request.message,
            history,
            request.pipeline_context
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        response_text = groq_service.chat(messages, max_tokens=4096, temperature=0.3)

        # Try to parse actions from response
        actions = None
        message = response_text

        # Check if response contains JSON with actions
        try:
            import json
            if "{" in response_text:
                json_response = groq_service._extract_json(response_text)
                if json_response and not json_response.get("error"):
                    if "message" in json_response:
                        message = json_response["message"]
                    if "actions" in json_response and isinstance(json_response["actions"], list):
                        parsed_actions = []
                        for a in json_response["actions"]:
                            try:
                                parsed_actions.append(ChatAction(**a))
                            except Exception as action_err:
                                logger.warning(f"Failed to parse action: {a}, error: {action_err}")
                        if parsed_actions:
                            actions = parsed_actions
        except Exception as e:
            logger.warning(f"JSON parsing failed, using plain text response: {e}")

        # Store in history
        chat_sessions[session_id].append({"role": "user", "content": request.message})
        chat_sessions[session_id].append({"role": "assistant", "content": message})

        # Limit history size
        if len(chat_sessions[session_id]) > 20:
            chat_sessions[session_id] = chat_sessions[session_id][-20:]

        return ChatResponse(
            message=message,
            session_id=session_id,
            actions=actions
        )

    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== EDA Analysis Endpoint ====================

@router.post("/analyze/eda", response_model=EDAResponse)
async def analyze_eda(request: EDARequest):
    """
    Perform LLM-powered exploratory data analysis.
    Returns insights, data quality issues, and recommendations.
    """
    try:
        # Load and analyze data
        if not os.path.exists(request.file_path):
            raise HTTPException(status_code=404, detail="File not found")

        df = pd.read_csv(request.file_path)

        # Compute data profile
        data_summary = compute_data_summary(df, request.target_column)

        # Get LLM analysis
        system_prompt, user_prompt = get_eda_prompt(data_summary)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        response = groq_service.chat_json(messages)

        # Parse insights
        insights = []
        for insight_data in response.get("insights", []):
            try:
                insights.append(EDAInsight(
                    category=insight_data.get("category", "recommendation"),
                    title=insight_data.get("title", "Insight"),
                    description=insight_data.get("description", ""),
                    severity=insight_data.get("severity", "info"),
                    affected_columns=insight_data.get("affected_columns"),
                    recommendation=insight_data.get("recommendation")
                ))
            except Exception:
                continue

        # If no insights parsed, create a basic one
        if not insights:
            insights.append(EDAInsight(
                category="recommendation",
                title="Analysis Complete",
                description=response.get("summary", "Dataset has been analyzed."),
                severity="info"
            ))

        return EDAResponse(
            summary=response.get("summary", "Analysis complete"),
            insights=insights,
            data_quality_score=response.get("data_quality_score"),
            data_profile=data_summary,
            recommended_preprocessing=response.get("recommended_preprocessing"),
            target_analysis=response.get("target_analysis")
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"EDA analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Feature Suggestion Endpoint ====================

@router.post("/suggest/features", response_model=FeatureSuggestResponse)
async def suggest_features(request: FeatureSuggestRequest):
    """
    Get AI-powered feature engineering suggestions.
    """
    try:
        if not os.path.exists(request.file_path):
            raise HTTPException(status_code=404, detail="File not found")

        df = pd.read_csv(request.file_path)

        # Compute feature statistics
        data_summary = {
            "task": request.task_type,
            "target": request.target_column,
            "n_samples": len(df),
            "columns": {},
            "statistics": {}
        }

        for col in df.columns:
            if col == request.target_column:
                continue

            col_info = {"dtype": str(df[col].dtype)}

            if df[col].dtype in ["int64", "float64"]:
                col_info["stats"] = {
                    "mean": float(df[col].mean()),
                    "std": float(df[col].std()),
                    "min": float(df[col].min()),
                    "max": float(df[col].max())
                }
            else:
                col_info["unique"] = int(df[col].nunique())

            data_summary["columns"][col] = col_info

        # Get LLM suggestions
        system_prompt, user_prompt = get_feature_prompt(data_summary)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        response = groq_service.chat_json(messages)

        # Parse suggestions
        suggestions = []
        for sug in response.get("suggestions", []):
            try:
                suggestions.append(FeatureSuggestion(
                    name=sug.get("name", "new_feature"),
                    description=sug.get("description", ""),
                    transformation=sug.get("transformation", ""),
                    code=sug.get("code", ""),
                    rationale=sug.get("rationale", ""),
                    estimated_impact=sug.get("estimated_impact", "medium"),
                    dependencies=sug.get("dependencies", [])
                ))
            except Exception:
                continue

        return FeatureSuggestResponse(
            suggestions=suggestions,
            interaction_features=response.get("interaction_features"),
            encoding_recommendations=response.get("encoding_recommendations"),
            scaling_recommendations=response.get("scaling_recommendations")
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Feature suggestion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Model Recommendation Endpoint ====================

@router.post("/suggest/model", response_model=ModelRecommendResponse)
async def suggest_model(request: ModelRecommendRequest):
    """
    Get AI-powered model recommendations based on data characteristics.
    """
    try:
        # Build data summary
        data_summary = request.data_summary or {}

        if request.file_path and os.path.exists(request.file_path):
            df = pd.read_csv(request.file_path)

            data_summary.update({
                "shape": df.shape,
                "n_samples": len(df),
                "n_features": len(df.columns) - 1,
                "n_numeric": len(df.select_dtypes(include=["number"]).columns),
                "n_categorical": len(df.select_dtypes(exclude=["number"]).columns),
                "task": request.task_type,
                "target": request.target_column
            })

            # Target distribution
            if request.target_column in df.columns:
                target = df[request.target_column]
                if request.task_type == "classification":
                    data_summary["target_distribution"] = target.value_counts().to_dict()
                else:
                    data_summary["target_distribution"] = {
                        "mean": float(target.mean()),
                        "std": float(target.std()),
                        "min": float(target.min()),
                        "max": float(target.max())
                    }

        data_summary["task"] = request.task_type
        data_summary["target"] = request.target_column
        data_summary["priority"] = request.priority

        # Get LLM recommendations
        system_prompt, user_prompt = get_model_prompt(data_summary)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        response = groq_service.chat_json(messages)

        # Parse recommendations
        recommendations = []
        for i, rec in enumerate(response.get("recommendations", [])):
            try:
                recommendations.append(ModelRecommendation(
                    rank=rec.get("rank", i + 1),
                    model_name=rec.get("model_name", "Unknown"),
                    model_type=rec.get("model_type", "unknown"),
                    rationale=rec.get("rationale", ""),
                    pros=rec.get("pros", []),
                    cons=rec.get("cons", []),
                    hyperparameters=rec.get("hyperparameters", {}),
                    estimated_performance=rec.get("estimated_performance", "medium"),
                    training_time=rec.get("training_time", "medium"),
                    interpretability=rec.get("interpretability", "medium")
                ))
            except Exception:
                continue

        # Default recommendation if none parsed
        if not recommendations:
            recommendations.append(ModelRecommendation(
                rank=1,
                model_name="Random Forest",
                model_type="random_forest",
                rationale="Good default choice for most tasks",
                pros=["Robust", "Handles mixed features"],
                cons=["Can be slow for large datasets"],
                hyperparameters={"n_estimators": 100, "max_depth": 10},
                estimated_performance="medium",
                training_time="medium",
                interpretability="medium"
            ))

        return ModelRecommendResponse(
            recommendations=recommendations,
            analysis=response.get("analysis", {}),
            preprocessing_required=response.get("preprocessing_required"),
            cross_validation_strategy=response.get("cross_validation_strategy")
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Model recommendation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Pipeline Suggestion Endpoint ====================

@router.post("/suggest/pipeline")
async def suggest_pipeline(request: PipelineSuggestionRequest):
    """
    Generate pipeline suggestions from natural language description.
    """
    try:
        response = groq_service.generate_pipeline_suggestion(
            request.user_message,
            request.current_pipeline
        )

        return PipelineSuggestionResponse(
            message=response.get("message", "Here are my suggestions"),
            understood_intent=response.get("understood_intent", request.user_message),
            suggested_blocks=response.get("suggested_blocks", []),
            suggested_connections=response.get("suggested_connections"),
            questions=response.get("questions"),
            tips=response.get("tips")
        )

    except Exception as e:
        logger.error(f"Pipeline suggestion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Custom Block Endpoints ====================

@router.post("/generate-block")
async def generate_block(request: dict):
    """
    Use LLM to generate a custom pipeline block definition from a description.
    Saves the block and returns the definition.
    """
    try:
        description = request.get("description", "")
        param_hints = request.get("param_hints", None)

        if not description:
            raise HTTPException(status_code=400, detail="Description is required")

        system_prompt, user_prompt = get_custom_block_prompt(description, param_hints)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        # Use higher max_tokens for code generation and lower temperature
        raw_response = groq_service.chat(messages, temperature=0.2, max_tokens=8192)
        response = groq_service._extract_json(raw_response)

        # Log raw response for debugging
        logger.info(f"Custom block LLM raw response ({len(raw_response)} chars)")

        # Check if JSON extraction failed
        if "error" in response and "raw" in response:
            logger.error(f"JSON extraction failed. Raw: {raw_response[:500]}")
            raise ValueError(
                "AI generated a response but it couldn't be parsed as JSON. "
                "Try rephrasing your description or making it simpler."
            )

        # Validate required fields
        required = ["name", "type_key", "description", "code"]
        missing = [f for f in required if f not in response]
        if missing:
            logger.error(f"Missing fields: {missing}. Got keys: {list(response.keys())}")
            raise ValueError(
                f"AI response is missing required fields: {', '.join(missing)}. "
                "Try a simpler description."
            )

        # Ensure code is a string
        if not isinstance(response.get("code"), str):
            response["code"] = str(response["code"])

        # Set defaults for optional fields
        response.setdefault("icon", "🧩")
        response.setdefault("color", "#6366f1")
        response.setdefault("category", "custom")
        response.setdefault("param_schema", [])

        # Clean param_schema: ensure each entry has required keys
        cleaned_schema = []
        for p in response.get("param_schema", []):
            if isinstance(p, dict) and "name" in p:
                cleaned_schema.append({
                    "name": p["name"],
                    "type": p.get("type", "string"),
                    "default": p.get("default", ""),
                    "description": p.get("description", ""),
                    **({"options": p["options"]} if "options" in p else {})
                })
        response["param_schema"] = cleaned_schema

        # Save the block
        saved = block_manager.save_block(response)
        logger.info(f"Generated custom block: {saved['name']} ({saved['type_key']})")

        return saved

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Block generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/custom-blocks")
async def get_custom_blocks():
    """Return all saved custom block definitions."""
    return block_manager.load_blocks()


@router.delete("/custom-blocks/{block_id}")
async def delete_custom_block(block_id: str):
    """Delete a custom block by ID."""
    deleted = block_manager.delete_block(block_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Custom block not found")
    return {"status": "deleted", "id": block_id}


# ==================== Helper Functions ====================

def compute_data_summary(df: pd.DataFrame, target_column: str = None) -> Dict[str, Any]:
    """Compute comprehensive data summary for LLM analysis."""
    summary = {
        "shape": list(df.shape),
        "columns": {},
        "missing": {},
        "dtypes": {},
        "target": target_column
    }

    for col in df.columns:
        summary["dtypes"][col] = str(df[col].dtype)
        summary["missing"][col] = int(df[col].isnull().sum())

        col_info = {
            "dtype": str(df[col].dtype),
            "missing": int(df[col].isnull().sum()),
            "unique": int(df[col].nunique())
        }

        if df[col].dtype in ["int64", "float64"]:
            col_info.update({
                "mean": round(float(df[col].mean()), 4),
                "std": round(float(df[col].std()), 4),
                "min": round(float(df[col].min()), 4),
                "max": round(float(df[col].max()), 4),
                "median": round(float(df[col].median()), 4),
                "skew": round(float(df[col].skew()), 4) if len(df[col].dropna()) > 2 else 0
            })

            # Histogram bins for distribution chart
            try:
                clean = df[col].dropna()
                if len(clean) > 0:
                    counts, bin_edges = np.histogram(clean, bins=min(20, max(5, int(len(clean) ** 0.5))))
                    col_info["histogram"] = {
                        "counts": counts.tolist(),
                        "bin_edges": [round(float(b), 4) for b in bin_edges]
                    }
                    # Quartiles for box-plot style display
                    col_info["q25"] = round(float(clean.quantile(0.25)), 4)
                    col_info["q75"] = round(float(clean.quantile(0.75)), 4)
            except Exception:
                pass
        else:
            # Categorical stats
            value_counts = df[col].value_counts()
            col_info["top_values"] = {str(k): int(v) for k, v in value_counts.head(8).items()}

        summary["columns"][col] = col_info

    # Correlation matrix for numeric columns
    try:
        numeric_df = df.select_dtypes(include=["number"])
        if len(numeric_df.columns) >= 2:
            corr = numeric_df.corr()
            # Only keep top correlations to avoid huge payloads
            corr_data = {}
            for c in corr.columns:
                corr_data[c] = {str(k): round(float(v), 4) for k, v in corr[c].items()}
            summary["correlations"] = corr_data
            summary["correlation_columns"] = list(corr.columns)
    except Exception:
        pass

    # Target analysis if specified
    if target_column and target_column in df.columns:
        target = df[target_column]
        if target.dtype in ["int64", "float64"] and target.nunique() > 10:
            summary["task_type"] = "regression"
            # Distribution for target
            try:
                counts, bin_edges = np.histogram(target.dropna(), bins=15)
                summary["target_histogram"] = {
                    "counts": counts.tolist(),
                    "bin_edges": [round(float(b), 4) for b in bin_edges]
                }
            except Exception:
                pass
        else:
            summary["task_type"] = "classification"
            summary["target_distribution"] = {str(k): int(v) for k, v in target.value_counts().items()}

    return summary
