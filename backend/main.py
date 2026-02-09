from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from orchestrator.run_pipeline import run_pipeline
from schemas.pipeline import PipelineBlock
from schemas.session import SessionCreate, SessionUpdate, SessionData
from pydantic import BaseModel
from utils.logger import logger
from utils.session_manager import SessionManager
from typing import List, Optional, Dict, Any
import pandas as pd
import numpy as np
import joblib
import os
import uuid

# Import routers
from api.llm_routes import router as llm_router
from api.inspector_routes import router as inspector_router
from data_engine.downloader import detect_source, download_direct_csv, download_kaggle_dataset, download_zip

app = FastAPI(title="Smart ML Framework", version="1.0.0")

# Create directories
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
SESSIONS_DIR = os.path.join(os.path.dirname(__file__), "sessions")
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(SESSIONS_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

# Initialize session manager
session_manager = SessionManager(SESSIONS_DIR)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(llm_router)
app.include_router(inspector_router)


def detect_task_type(df: pd.DataFrame, target_col: str) -> str:
    """Auto-detect if task is classification or regression based on target column."""
    if target_col not in df.columns:
        return "classification"  # default

    target = df[target_col]

    # If target is object/string type, it's classification
    if target.dtype == 'object' or target.dtype.name == 'category':
        return "classification"

    # If target is boolean, it's classification
    if target.dtype == 'bool':
        return "classification"

    # For numeric columns, check unique value ratio
    n_unique = target.nunique()
    n_total = len(target)

    # If few unique values relative to total, likely classification
    # Rule: if <= 20 unique values OR unique ratio < 5%, treat as classification
    if n_unique <= 20 or (n_unique / n_total) < 0.05:
        return "classification"

    return "regression"


def get_column_types(df: pd.DataFrame) -> dict:
    """Analyze column types for smart preprocessing."""
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
    boolean_cols = df.select_dtypes(include=['bool']).columns.tolist()

    # Detect columns with missing values
    missing_cols = df.columns[df.isnull().any()].tolist()

    return {
        "numeric": numeric_cols,
        "categorical": categorical_cols,
        "boolean": boolean_cols,
        "missing": missing_cols,
        "total_missing": int(df.isnull().sum().sum())
    }


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a CSV file and return file info with columns."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    # Generate unique filename to avoid collisions
    file_id = str(uuid.uuid4())[:8]
    safe_filename = f"{file_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    try:
        # Save the file
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)

        # Read CSV to get column info
        df = pd.read_csv(file_path)
        columns = df.columns.tolist()

        # Detect potential target columns (usually last column or common names)
        suggested_target = None
        target_hints = ["target", "label", "class", "y", "outcome", "result"]
        for col in columns:
            if col.lower() in target_hints:
                suggested_target = col
                break
        if not suggested_target and len(columns) > 0:
            suggested_target = columns[-1]  # Default to last column

        # Auto-detect task type and column types
        suggested_task = detect_task_type(df, suggested_target) if suggested_target else "classification"
        column_analysis = get_column_types(df)

        logger.info(f"Uploaded file: {file.filename} -> {file_path}")
        logger.info(f"Columns: {columns}, Task: {suggested_task}")

        return {
            "status": "success",
            "file_path": file_path,
            "filename": file.filename,
            "columns": columns,
            "suggested_target": suggested_target,
            "suggested_task": suggested_task,
            "column_analysis": column_analysis,
            "rows": len(df),
            "preview": df.head(5).to_dict(orient="records")
        }

    except Exception as e:
        # Clean up file if parsing failed
        if os.path.exists(file_path):
            os.remove(file_path)
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to process file: {str(e)}")


@app.get("/uploads")
def list_uploads():
    """List all uploaded files."""
    files = []
    for filename in os.listdir(UPLOAD_DIR):
        if filename.endswith(".csv"):
            file_path = os.path.join(UPLOAD_DIR, filename)
            try:
                df = pd.read_csv(file_path)
                files.append({
                    "filename": filename,
                    "file_path": file_path,
                    "columns": df.columns.tolist(),
                    "rows": len(df)
                })
            except:
                pass
    return {"files": files}


# ==================== Dataset Download ====================

class DatasetDownloadRequest(BaseModel):
    url: str
    selected_file: Optional[str] = None


@app.post("/download-dataset")
async def download_dataset(request: DatasetDownloadRequest):
    """Download a dataset from a URL (Kaggle, direct CSV, ZIP) and return file info."""
    try:
        url = request.url.strip()
        if not url:
            raise HTTPException(status_code=400, detail="URL is required")

        source = detect_source(url)
        logger.info(f"Dataset download request: source={source}, url={url}")

        if source == "kaggle":
            return download_kaggle_dataset(url, request.selected_file)
        elif source == "zip_url":
            return download_zip(url, request.selected_file)
        else:
            return download_direct_csv(url)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Dataset download failed: {e}")
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")


# ==================== Session Endpoints ====================

@app.post("/sessions")
def create_session(session: SessionCreate):
    """Create a new session."""
    try:
        new_session = session_manager.create(session.name, session.data)
        logger.info(f"Created session: {new_session.id} - {new_session.name}")
        return new_session
    except Exception as e:
        logger.error(f"Failed to create session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/sessions")
def list_sessions():
    """List all sessions."""
    sessions = session_manager.get_all()
    # Sort by updated_at descending (most recent first)
    sessions.sort(key=lambda s: s.updated_at, reverse=True)
    return {"sessions": [s.model_dump() for s in sessions]}


@app.get("/sessions/latest")
def get_latest_session():
    """Get the most recently updated session."""
    session = session_manager.get_latest()
    if not session:
        return {"session": None}
    return {"session": session.model_dump()}


@app.get("/sessions/{session_id}")
def get_session(session_id: str):
    """Get a specific session."""
    session = session_manager.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@app.put("/sessions/{session_id}")
def update_session(session_id: str, update: SessionUpdate):
    """Update a session."""
    session = session_manager.update(session_id, update.name, update.data)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    logger.info(f"Updated session: {session_id}")
    return session


@app.delete("/sessions/{session_id}")
def delete_session(session_id: str):
    """Delete a session."""
    success = session_manager.delete(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    logger.info(f"Deleted session: {session_id}")
    return {"status": "deleted", "id": session_id}


# ==================== Available Models Endpoint ====================

@app.get("/available-models")
def available_models(task: str = "classification"):
    """List all available ML algorithms for a given task type."""
    from model_engine.random_forest import get_available_models
    return {"models": get_available_models(task)}


# ==================== Pipeline Endpoints ====================

@app.post("/run")
def run(pipeline: List[PipelineBlock]):
    if not pipeline:
        raise HTTPException(status_code=400, detail="Pipeline cannot be empty")

    logger.info(f"Received pipeline with {len(pipeline)} blocks")
    for block in pipeline:
        logger.info(f"  Block: {block.id} (type: {block.type}, inputs: {block.inputs})")

    try:
        context = run_pipeline(pipeline)

        # Get predictions and actual values for comparison
        y_pred = context.get("y_pred", [])
        y_actual = context.get("y_actual", [])

        # Create comparison preview (first 15 samples)
        comparison_preview = [
            {"actual": y_actual[i], "predicted": y_pred[i]}
            for i in range(min(15, len(y_pred), len(y_actual)))
        ]

        return {
            "status": "success",
            "metrics": context.get("metrics", {}),
            "predictions_preview": y_pred[:10],
            "comparison_preview": comparison_preview,
            "model_id": context.get("model_id"),
            "model_filename": context.get("model_filename")
        }
    except ValueError as e:
        logger.error(f"Pipeline validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Pipeline execution error: {e}")
        raise HTTPException(status_code=500, detail=f"Pipeline execution failed: {str(e)}")


# ==================== Model Export & Deployment Endpoints ====================

class PredictRequest(BaseModel):
    features: List[Dict[str, Any]]  # List of feature dictionaries


@app.get("/models")
def list_models():
    """List all saved models."""
    models = []
    for filename in os.listdir(MODELS_DIR):
        if filename.endswith(".joblib"):
            file_path = os.path.join(MODELS_DIR, filename)
            try:
                model_data = joblib.load(file_path)
                models.append({
                    "filename": filename,
                    "task": model_data.get("task", "unknown"),
                    "trained_at": model_data.get("trained_at", "unknown"),
                    "n_samples": model_data.get("n_samples", 0),
                    "n_features": model_data.get("n_features", 0),
                    "feature_names": model_data.get("feature_names", []),
                    "target_name": model_data.get("target_name", "target")
                })
            except Exception as e:
                logger.error(f"Failed to load model {filename}: {e}")

    # Sort by trained_at descending
    models.sort(key=lambda m: m.get("trained_at", ""), reverse=True)
    return {"models": models}


@app.get("/models/{filename}")
def get_model_info(filename: str):
    """Get information about a specific model."""
    file_path = os.path.join(MODELS_DIR, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Model not found")

    try:
        model_data = joblib.load(file_path)
        return {
            "filename": filename,
            "task": model_data.get("task", "unknown"),
            "trained_at": model_data.get("trained_at", "unknown"),
            "n_samples": model_data.get("n_samples", 0),
            "n_features": model_data.get("n_features", 0),
            "feature_names": model_data.get("feature_names", []),
            "target_name": model_data.get("target_name", "target"),
            "file_size_kb": round(os.path.getsize(file_path) / 1024, 2)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load model: {str(e)}")


@app.get("/models/{filename}/download")
def download_model(filename: str):
    """Download a trained model file."""
    file_path = os.path.join(MODELS_DIR, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Model not found")

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream"
    )


@app.post("/models/{filename}/predict")
def predict(filename: str, request: PredictRequest):
    """Make predictions using a saved model."""
    file_path = os.path.join(MODELS_DIR, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Model not found")

    try:
        model_data = joblib.load(file_path)
        model = model_data["model"]
        feature_names = model_data.get("feature_names", [])
        feature_pipeline = model_data.get("feature_pipeline")
        numeric_imputer = model_data.get("numeric_imputer")
        label_encoder = model_data.get("label_encoder")

        # Convert input features to DataFrame
        df = pd.DataFrame(request.features)

        # Ensure columns are in correct order
        if feature_names:
            missing_cols = set(feature_names) - set(df.columns)
            if missing_cols:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing features: {list(missing_cols)}"
                )
            df = df[feature_names]

        # Apply preprocessing if available
        if feature_pipeline is not None:
            X = feature_pipeline.transform(df)
        elif numeric_imputer is not None:
            X = numeric_imputer.transform(df.values)
        else:
            X = df

        # Make predictions
        predictions = model.predict(X)

        # Get probabilities for classification
        probabilities = None
        if hasattr(model, "predict_proba"):
            try:
                proba = model.predict_proba(X)
                probabilities = proba.tolist()
            except:
                pass

        # Decode labels if label encoder was used
        if label_encoder is not None:
            predictions = label_encoder.inverse_transform(predictions)

        return {
            "predictions": predictions.tolist(),
            "probabilities": probabilities,
            "n_samples": len(predictions)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.delete("/models/{filename}")
def delete_model(filename: str):
    """Delete a saved model."""
    file_path = os.path.join(MODELS_DIR, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Model not found")

    try:
        os.remove(file_path)
        logger.info(f"Deleted model: {filename}")
        return {"status": "deleted", "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete model: {str(e)}")
