"""
Prompt templates for LLM-powered features.
"""

from typing import Dict, Any, Optional, Tuple
import json


def get_eda_prompt(data_summary: Dict[str, Any]) -> Tuple[str, str]:
    """Generate prompts for EDA analysis."""

    system_prompt = """You are an expert data scientist performing exploratory data analysis.
Analyze the provided dataset summary and provide actionable insights.

Your response must be valid JSON with this structure:
{
    "summary": "Brief overview of the dataset",
    "insights": [
        {
            "category": "distribution|correlation|quality|anomaly|recommendation",
            "title": "Short title",
            "description": "Detailed explanation",
            "severity": "info|warning|critical",
            "affected_columns": ["col1", "col2"],
            "recommendation": "What to do about it"
        }
    ],
    "data_quality_score": 0-100,
    "recommended_preprocessing": ["step1", "step2"],
    "target_analysis": {
        "type": "classification|regression",
        "balance": "balanced|imbalanced",
        "recommendation": "suggestion for target variable"
    }
}

Focus on:
1. Data quality issues (missing values, outliers, duplicates)
2. Feature distributions and skewness
3. Correlations with target variable
4. Potential data leakage
5. Recommended preprocessing steps"""

    user_prompt = f"""Analyze this dataset:

**Dataset Shape:** {data_summary.get('shape', 'Unknown')}
**Target Column:** {data_summary.get('target', 'Not specified')}

**Column Statistics:**
{json.dumps(data_summary.get('columns', {}), indent=2)}

**Missing Values:**
{json.dumps(data_summary.get('missing', {}), indent=2)}

**Data Types:**
{json.dumps(data_summary.get('dtypes', {}), indent=2)}

Provide comprehensive EDA insights as JSON."""

    return system_prompt, user_prompt


def get_feature_prompt(data_summary: Dict[str, Any]) -> Tuple[str, str]:
    """Generate prompts for feature engineering suggestions."""

    system_prompt = """You are an expert ML engineer specializing in feature engineering.
Analyze the dataset and suggest new features that could improve model performance.

Your response must be valid JSON with this structure:
{
    "suggestions": [
        {
            "name": "new_feature_name",
            "description": "What this feature represents",
            "transformation": "mathematical/logical transformation",
            "code": "Python code to create the feature",
            "rationale": "Why this feature might help",
            "estimated_impact": "low|medium|high",
            "dependencies": ["required_column1", "required_column2"]
        }
    ],
    "interaction_features": [
        {
            "name": "feature_interaction",
            "columns": ["col1", "col2"],
            "operation": "multiply|divide|add|subtract",
            "rationale": "Why this interaction matters"
        }
    ],
    "encoding_recommendations": {
        "categorical_columns": ["col1", "col2"],
        "suggested_encoding": "onehot|label|target|frequency"
    },
    "scaling_recommendations": {
        "columns_to_scale": ["col1", "col2"],
        "suggested_method": "standard|minmax|robust"
    }
}

Consider:
1. Domain-relevant transformations
2. Polynomial features for numeric columns
3. Binning continuous variables
4. Date/time decomposition
5. Text feature extraction if applicable
6. Aggregation features if hierarchical data"""

    user_prompt = f"""Suggest feature engineering for this dataset:

**Task Type:** {data_summary.get('task', 'classification')}
**Target Column:** {data_summary.get('target', 'Unknown')}
**Number of Samples:** {data_summary.get('n_samples', 'Unknown')}

**Current Features:**
{json.dumps(data_summary.get('columns', {}), indent=2)}

**Feature Statistics:**
{json.dumps(data_summary.get('statistics', {}), indent=2)}

Suggest features that could improve model performance. Provide as JSON."""

    return system_prompt, user_prompt


def get_model_prompt(data_summary: Dict[str, Any]) -> Tuple[str, str]:
    """Generate prompts for model recommendation."""

    system_prompt = """You are an expert ML engineer recommending the best model for a task.
Analyze the dataset characteristics and suggest appropriate models.

Your response must be valid JSON with this structure:
{
    "recommendations": [
        {
            "rank": 1,
            "model_name": "Random Forest",
            "model_type": "random_forest",
            "rationale": "Why this model is suitable",
            "pros": ["advantage1", "advantage2"],
            "cons": ["disadvantage1"],
            "hyperparameters": {
                "n_estimators": 100,
                "max_depth": 10
            },
            "estimated_performance": "high|medium|low",
            "training_time": "fast|medium|slow",
            "interpretability": "high|medium|low"
        }
    ],
    "analysis": {
        "dataset_size": "small|medium|large",
        "feature_complexity": "low|medium|high",
        "recommended_approach": "tree-based|linear|neural-network|ensemble"
    },
    "preprocessing_required": ["step1", "step2"],
    "cross_validation_strategy": "kfold|stratified|timeseries"
}

Consider:
1. Dataset size and dimensionality
2. Feature types (numeric, categorical, mixed)
3. Target variable characteristics
4. Interpretability requirements
5. Training time constraints"""

    user_prompt = f"""Recommend models for this ML task:

**Task Type:** {data_summary.get('task', 'classification')}
**Target Column:** {data_summary.get('target', 'Unknown')}
**Dataset Shape:** {data_summary.get('shape', 'Unknown')}

**Feature Summary:**
- Numeric features: {data_summary.get('n_numeric', 0)}
- Categorical features: {data_summary.get('n_categorical', 0)}
- Total features: {data_summary.get('n_features', 0)}

**Target Distribution:**
{json.dumps(data_summary.get('target_distribution', {}), indent=2)}

**Data Characteristics:**
{json.dumps(data_summary.get('characteristics', {}), indent=2)}

Recommend the best models for this task. Provide as JSON."""

    return system_prompt, user_prompt


def get_pipeline_prompt(
    user_message: str,
    current_pipeline: Optional[Dict[str, Any]] = None
) -> Tuple[str, str]:
    """Generate prompts for pipeline suggestions from natural language."""

    system_prompt = """You are an AI assistant helping users build ML pipelines.
Interpret the user's request and suggest pipeline blocks to add.

Available block types:
- dataset: Load a dataset (params: file_path, target)
- split: Train/test split (params: test_size)
- model: Create a model (params: task, n_estimators, max_depth)
- trainer: Train the model (no params needed)
- metrics: Evaluate model (no params needed)

Your response must be valid JSON with this structure:
{
    "message": "Friendly response explaining what you'll help with",
    "understood_intent": "What the user wants to do",
    "suggested_blocks": [
        {
            "type": "block_type",
            "params": {"param1": "value1"},
            "explanation": "Why this block is needed"
        }
    ],
    "suggested_connections": [
        {"from": "block_id_1", "to": "block_id_2"}
    ],
    "questions": ["Any clarifying questions if needed"],
    "tips": ["Helpful tips for the user"]
}

Be helpful, concise, and guide the user through building their pipeline."""

    pipeline_context = ""
    if current_pipeline:
        nodes = current_pipeline.get('nodes', [])
        if nodes:
            pipeline_context = f"""

Current pipeline has these blocks:
{json.dumps([{'id': n.get('id'), 'type': n.get('data', {}).get('blockType')} for n in nodes], indent=2)}
"""

    user_prompt = f"""User request: "{user_message}"
{pipeline_context}
Help the user build their ML pipeline. Provide as JSON."""

    return system_prompt, user_prompt


def get_chat_prompt(
    message: str,
    conversation_history: list,
    pipeline_context: Optional[Dict[str, Any]] = None
) -> Tuple[str, str]:
    """Generate prompts for general chat assistance."""

    system_prompt = """You are an intelligent ML assistant helping users build machine learning pipelines.
You can help with:
1. Understanding their data and suggesting analysis
2. Recommending models and hyperparameters
3. Explaining ML concepts
4. Debugging pipeline issues
5. Suggesting improvements

When the user wants to create or modify the pipeline, respond with JSON containing actions:
{
    "message": "Your helpful response",
    "actions": [
        {
            "type": "add_block|update_block|remove_block|run_pipeline",
            "block_type": "dataset|split|model|trainer|metrics",
            "params": {}
        }
    ]
}

For general questions, just respond with a helpful message (no JSON needed).
Be friendly, knowledgeable, and proactive in offering suggestions."""

    # Build context from history
    history_text = ""
    for msg in conversation_history[-5:]:  # Last 5 messages
        role = msg.get('role', 'user')
        content = msg.get('content', '')
        history_text += f"{role}: {content}\n"

    pipeline_info = ""
    if pipeline_context:
        nodes = pipeline_context.get('nodes', [])
        if nodes:
            pipeline_info = f"""

Current Pipeline:
{json.dumps([{'type': n.get('data', {}).get('blockType'), 'params': n.get('data', {}).get('params', {})} for n in nodes], indent=2)}
"""

    user_prompt = f"""{history_text}
user: {message}
{pipeline_info}
Respond helpfully."""

    return system_prompt, user_prompt


def get_code_generation_prompt(
    description: str,
    component_type: str = "loss_function"
) -> Tuple[str, str]:
    """Generate prompts for custom code generation."""

    system_prompt = f"""You are an expert ML engineer generating custom {component_type} code.
Generate clean, working Python code based on the user's description.

Your response must be valid JSON with this structure:
{{
    "code": "The complete Python code",
    "explanation": "What the code does",
    "usage_example": "How to use it",
    "dependencies": ["required_packages"],
    "warnings": ["Any caveats or limitations"]
}}

The code should:
1. Be well-documented with docstrings
2. Follow Python best practices
3. Be compatible with scikit-learn or PyTorch
4. Include proper error handling"""

    user_prompt = f"""Generate a custom {component_type} based on this description:

"{description}"

Provide working Python code as JSON."""

    return system_prompt, user_prompt
