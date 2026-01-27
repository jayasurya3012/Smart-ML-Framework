from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from orchestrator.run_pipeline import run_pipeline
from schemas.pipeline import PipelineBlock
from schemas.session import SessionCreate, SessionUpdate, SessionData
from utils.logger import logger
from utils.session_manager import SessionManager
from typing import List, Optional
import pandas as pd
import os
import uuid

app = FastAPI()

# Create directories
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
SESSIONS_DIR = os.path.join(os.path.dirname(__file__), "sessions")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(SESSIONS_DIR, exist_ok=True)

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

        logger.info(f"Uploaded file: {file.filename} -> {file_path}")
        logger.info(f"Columns: {columns}")

        return {
            "status": "success",
            "file_path": file_path,
            "filename": file.filename,
            "columns": columns,
            "suggested_target": suggested_target,
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

        return {
            "status": "success",
            "metrics": context.get("metrics", {}),
            "predictions_preview": context.get("y_pred", [])[:10]
        }
    except ValueError as e:
        logger.error(f"Pipeline validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Pipeline execution error: {e}")
        raise HTTPException(status_code=500, detail=f"Pipeline execution failed: {str(e)}")
