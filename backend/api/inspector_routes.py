"""
Dataset Inspector API routes - provides detailed statistics and code execution for datasets.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
import traceback
import io
import sys

from utils.logger import logger

router = APIRouter(prefix="/inspector", tags=["inspector"])


class DatasetStatsRequest(BaseModel):
    file_path: str


class CodeExecuteRequest(BaseModel):
    file_path: str
    code: str
    save_changes: bool = False


class ColumnStats(BaseModel):
    name: str
    dtype: str
    count: int
    missing: int
    missing_pct: float
    unique: int
    # Numeric stats
    mean: Optional[float] = None
    std: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None
    q25: Optional[float] = None
    q50: Optional[float] = None
    q75: Optional[float] = None
    # Categorical stats
    top_values: Optional[List[Dict[str, Any]]] = None


class DatasetStatsResponse(BaseModel):
    filename: str
    rows: int
    columns: int
    memory_mb: float
    column_stats: List[ColumnStats]
    preview: List[Dict[str, Any]]
    missing_summary: Dict[str, int]
    dtypes_summary: Dict[str, int]


class CodeExecuteResponse(BaseModel):
    success: bool
    output: str
    error: Optional[str] = None
    df_shape: Optional[List[int]] = None
    df_preview: Optional[List[Dict[str, Any]]] = None
    df_columns: Optional[List[str]] = None
    execution_time_ms: float


@router.post("/stats", response_model=DatasetStatsResponse)
async def get_dataset_stats(request: DatasetStatsRequest):
    """Get detailed statistics for a dataset."""
    try:
        df = pd.read_csv(request.file_path)

        # Calculate memory usage
        memory_mb = df.memory_usage(deep=True).sum() / (1024 * 1024)

        # Build column statistics
        column_stats = []
        for col in df.columns:
            stats = {
                "name": col,
                "dtype": str(df[col].dtype),
                "count": int(df[col].count()),
                "missing": int(df[col].isnull().sum()),
                "missing_pct": round(df[col].isnull().sum() / len(df) * 100, 2),
                "unique": int(df[col].nunique())
            }

            # Numeric column statistics
            if pd.api.types.is_numeric_dtype(df[col]):
                desc = df[col].describe()
                stats["mean"] = round(float(desc.get("mean", 0)), 4) if not pd.isna(desc.get("mean")) else None
                stats["std"] = round(float(desc.get("std", 0)), 4) if not pd.isna(desc.get("std")) else None
                stats["min"] = round(float(desc.get("min", 0)), 4) if not pd.isna(desc.get("min")) else None
                stats["max"] = round(float(desc.get("max", 0)), 4) if not pd.isna(desc.get("max")) else None
                stats["q25"] = round(float(desc.get("25%", 0)), 4) if not pd.isna(desc.get("25%")) else None
                stats["q50"] = round(float(desc.get("50%", 0)), 4) if not pd.isna(desc.get("50%")) else None
                stats["q75"] = round(float(desc.get("75%", 0)), 4) if not pd.isna(desc.get("75%")) else None
            else:
                # Categorical column - get top values
                value_counts = df[col].value_counts().head(5)
                stats["top_values"] = [
                    {"value": str(val), "count": int(cnt)}
                    for val, cnt in value_counts.items()
                ]

            column_stats.append(ColumnStats(**stats))

        # Missing summary
        missing_summary = {
            col: int(df[col].isnull().sum())
            for col in df.columns
            if df[col].isnull().sum() > 0
        }

        # Dtype summary
        dtypes_summary = {}
        for dtype in df.dtypes:
            dtype_str = str(dtype)
            if dtype_str not in dtypes_summary:
                dtypes_summary[dtype_str] = 0
            dtypes_summary[dtype_str] += 1

        # Preview (first 20 rows)
        preview = df.head(20).replace({np.nan: None}).to_dict(orient="records")

        return DatasetStatsResponse(
            filename=request.file_path.split("/")[-1].split("\\")[-1],
            rows=len(df),
            columns=len(df.columns),
            memory_mb=round(memory_mb, 2),
            column_stats=column_stats,
            preview=preview,
            missing_summary=missing_summary,
            dtypes_summary=dtypes_summary
        )

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Dataset file not found")
    except Exception as e:
        logger.error(f"Error getting dataset stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/execute", response_model=CodeExecuteResponse)
async def execute_code(request: CodeExecuteRequest):
    """Execute Python code on a dataset (like a Jupyter notebook cell)."""
    import time
    start_time = time.time()

    try:
        # Load the dataset
        df = pd.read_csv(request.file_path)
        original_shape = df.shape

        # Capture stdout
        old_stdout = sys.stdout
        sys.stdout = captured_output = io.StringIO()

        # Create a namespace for code execution
        namespace = {
            "df": df,
            "pd": pd,
            "np": np,
            "print": print,
        }

        error_msg = None
        success = True

        try:
            # Execute the code
            exec(request.code, namespace)

            # Get the potentially modified df
            df = namespace.get("df", df)

        except Exception as e:
            success = False
            error_msg = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"

        # Get captured output
        output = captured_output.getvalue()
        sys.stdout = old_stdout

        # Calculate execution time
        execution_time_ms = (time.time() - start_time) * 1000

        # If save_changes is True and execution was successful, save the modified DataFrame
        if success and request.save_changes and isinstance(df, pd.DataFrame):
            df.to_csv(request.file_path, index=False)
            output += f"\n[Changes saved to {request.file_path}]"
            logger.info(f"Saved modified dataset: {request.file_path}")

        # Prepare response
        df_preview = None
        df_shape = None
        df_columns = None

        if isinstance(df, pd.DataFrame):
            df_shape = list(df.shape)
            df_columns = df.columns.tolist()
            df_preview = df.head(20).replace({np.nan: None}).to_dict(orient="records")

        return CodeExecuteResponse(
            success=success,
            output=output,
            error=error_msg,
            df_shape=df_shape,
            df_preview=df_preview,
            df_columns=df_columns,
            execution_time_ms=round(execution_time_ms, 2)
        )

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Dataset file not found")
    except Exception as e:
        logger.error(f"Error executing code: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/transform")
async def apply_transform(request: Dict[str, Any]):
    """Apply a predefined transformation to a dataset."""
    file_path = request.get("file_path")
    transform_type = request.get("transform_type")
    params = request.get("params", {})

    if not file_path or not transform_type:
        raise HTTPException(status_code=400, detail="file_path and transform_type are required")

    try:
        df = pd.read_csv(file_path)
        original_shape = df.shape

        # Apply transformation based on type
        if transform_type == "drop_column":
            column = params.get("column")
            if column and column in df.columns:
                df = df.drop(columns=[column])

        elif transform_type == "drop_missing_rows":
            column = params.get("column")
            if column:
                df = df.dropna(subset=[column])
            else:
                df = df.dropna()

        elif transform_type == "fill_missing":
            column = params.get("column")
            strategy = params.get("strategy", "mean")
            value = params.get("value")

            if column and column in df.columns:
                if strategy == "mean" and pd.api.types.is_numeric_dtype(df[column]):
                    df[column] = df[column].fillna(df[column].mean())
                elif strategy == "median" and pd.api.types.is_numeric_dtype(df[column]):
                    df[column] = df[column].fillna(df[column].median())
                elif strategy == "mode":
                    df[column] = df[column].fillna(df[column].mode().iloc[0] if len(df[column].mode()) > 0 else 0)
                elif strategy == "constant":
                    df[column] = df[column].fillna(value)

        elif transform_type == "rename_column":
            old_name = params.get("old_name")
            new_name = params.get("new_name")
            if old_name and new_name and old_name in df.columns:
                df = df.rename(columns={old_name: new_name})

        elif transform_type == "change_dtype":
            column = params.get("column")
            new_dtype = params.get("dtype")
            if column and new_dtype and column in df.columns:
                try:
                    df[column] = df[column].astype(new_dtype)
                except Exception as e:
                    raise HTTPException(status_code=400, detail=f"Cannot convert to {new_dtype}: {str(e)}")

        # Save the transformed dataset
        df.to_csv(file_path, index=False)

        return {
            "success": True,
            "message": f"Transform '{transform_type}' applied successfully",
            "original_shape": list(original_shape),
            "new_shape": list(df.shape),
            "preview": df.head(10).replace({np.nan: None}).to_dict(orient="records")
        }

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Dataset file not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error applying transform: {e}")
        raise HTTPException(status_code=500, detail=str(e))
