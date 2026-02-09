"""
Dataset downloader -- fetches datasets from URLs (Kaggle, direct CSV, ZIP archives)
and saves them to the uploads directory.
"""

import os
import re
import uuid
import shutil
import zipfile
import tempfile
from typing import Optional, Dict, Any, List

import pandas as pd
import httpx

from utils.logger import logger

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")


def detect_source(url: str) -> str:
    """Classify a URL as kaggle, direct_csv, or zip_url."""
    url_lower = url.strip().lower()

    # Kaggle: full URL or short-form "user/dataset-name"
    if "kaggle.com" in url_lower:
        return "kaggle"
    if re.match(r'^[\w-]+/[\w._-]+$', url.strip()) and not url.strip().endswith(".csv"):
        return "kaggle"

    # ZIP archive
    if url_lower.endswith(".zip"):
        return "zip_url"

    # Default: treat as direct CSV
    return "direct_csv"


def _extract_filename(url: str, headers: dict) -> str:
    """Extract a filename from URL path or Content-Disposition header."""
    # Try Content-Disposition first
    cd = headers.get("content-disposition", "")
    if "filename=" in cd:
        match = re.search(r'filename="?([^";]+)"?', cd)
        if match:
            return match.group(1).strip()

    # Fall back to URL path
    path = url.split("?")[0].split("#")[0]
    name = path.rstrip("/").split("/")[-1]
    if name and "." in name:
        return name
    return "downloaded_dataset.csv"


def _detect_task_type(df: pd.DataFrame, target_col: str) -> str:
    """Auto-detect if task is classification or regression based on target column."""
    if target_col not in df.columns:
        return "classification"

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

    # If few unique values, likely classification
    if n_unique <= 20 or (n_unique / n_total) < 0.05:
        return "classification"

    return "regression"


def _get_column_types(df: pd.DataFrame) -> Dict[str, Any]:
    """Analyze column types for smart preprocessing."""
    import numpy as np
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
    boolean_cols = df.select_dtypes(include=['bool']).columns.tolist()
    missing_cols = df.columns[df.isnull().any()].tolist()

    return {
        "numeric": numeric_cols,
        "categorical": categorical_cols,
        "boolean": boolean_cols,
        "missing": missing_cols,
        "total_missing": int(df.isnull().sum().sum())
    }


def _save_csv_to_uploads(source_path: str, original_name: str) -> Dict[str, Any]:
    """
    Copy a CSV file into the uploads directory with a UUID prefix.
    Returns the same response shape as POST /upload.
    """
    if not original_name.endswith(".csv"):
        original_name += ".csv"

    file_id = str(uuid.uuid4())[:8]
    safe_filename = f"{file_id}_{original_name}"
    dest_path = os.path.join(UPLOAD_DIR, safe_filename)

    shutil.copy2(source_path, dest_path)

    df = pd.read_csv(dest_path)
    columns = df.columns.tolist()

    # Auto-detect target column
    suggested_target = None
    target_hints = ["target", "label", "class", "y", "outcome", "result"]
    for col in columns:
        if col.lower() in target_hints:
            suggested_target = col
            break
    if not suggested_target and columns:
        suggested_target = columns[-1]

    # Auto-detect task type and column analysis
    suggested_task = _detect_task_type(df, suggested_target) if suggested_target else "classification"
    column_analysis = _get_column_types(df)

    logger.info(f"Saved downloaded dataset: {original_name} -> {dest_path}, Task: {suggested_task}")

    return {
        "status": "success",
        "file_path": dest_path,
        "filename": original_name,
        "columns": columns,
        "suggested_target": suggested_target,
        "suggested_task": suggested_task,
        "column_analysis": column_analysis,
        "rows": len(df),
        "preview": df.head(5).to_dict(orient="records")
    }


def _find_csv_files(directory: str) -> List[Dict[str, Any]]:
    """Walk a directory tree and find all CSV files."""
    csv_files = []
    for root, _dirs, files in os.walk(directory):
        for f in files:
            if f.lower().endswith(".csv"):
                full = os.path.join(root, f)
                size_kb = round(os.path.getsize(full) / 1024, 2)
                csv_files.append({"name": f, "size_kb": size_kb, "path": full})
    # Sort by size descending (largest first -- usually the main data file)
    csv_files.sort(key=lambda x: x["size_kb"], reverse=True)
    return csv_files


def _normalize_kaggle_ref(url: str) -> str:
    """
    Normalize a Kaggle URL or short-form ref to 'user/dataset-name'.
    Accepts:
      - "user/dataset-name"
      - "https://www.kaggle.com/datasets/user/dataset-name"
      - "kaggle.com/datasets/user/dataset-name/..."
    """
    url = url.strip().rstrip("/")

    # Already short-form
    if re.match(r'^[\w-]+/[\w._-]+$', url):
        return url

    # Extract from full URL
    match = re.search(r'kaggle\.com/datasets/([\w-]+/[\w._-]+)', url)
    if match:
        return match.group(1)

    # Try without /datasets/ prefix
    match = re.search(r'kaggle\.com/([\w-]+/[\w._-]+)', url)
    if match:
        return match.group(1)

    raise ValueError(
        f"Could not parse Kaggle dataset reference from: {url}. "
        "Use format 'user/dataset-name' or a full kaggle.com URL."
    )


def download_direct_csv(url: str) -> Dict[str, Any]:
    """Download a CSV from a direct URL."""
    logger.info(f"Downloading CSV from: {url}")

    try:
        response = httpx.get(url, follow_redirects=True, timeout=60.0)
        response.raise_for_status()
    except httpx.HTTPStatusError as e:
        raise ValueError(f"Could not access URL (HTTP {e.response.status_code}). Check the link is public and correct.")
    except httpx.RequestError as e:
        raise ValueError(f"Network error downloading from URL: {e}")

    filename = _extract_filename(url, dict(response.headers))

    # Save to temp file
    tmp_path = os.path.join(tempfile.gettempdir(), f"dl_{uuid.uuid4().hex[:8]}_{filename}")
    with open(tmp_path, "wb") as f:
        f.write(response.content)

    # Validate it's a parseable CSV
    try:
        pd.read_csv(tmp_path, nrows=5)
    except Exception:
        os.remove(tmp_path)
        raise ValueError("Downloaded file is not a valid CSV format.")

    result = _save_csv_to_uploads(tmp_path, filename)
    os.remove(tmp_path)
    return result


def download_kaggle_dataset(
    dataset_ref: str,
    selected_file: Optional[str] = None
) -> Dict[str, Any]:
    """
    Download a Kaggle dataset via kagglehub.

    If the dataset has multiple CSV files and no selected_file is provided,
    returns a file selection response instead of the data.
    """
    try:
        import kagglehub
    except ImportError:
        raise ValueError(
            "kagglehub is not installed. Run: pip install kagglehub"
        )

    ref = _normalize_kaggle_ref(dataset_ref)
    logger.info(f"Downloading Kaggle dataset: {ref}")

    try:
        download_path = kagglehub.dataset_download(ref)
    except Exception as e:
        error_msg = str(e).lower()
        if "403" in error_msg or "unauthorized" in error_msg or "credential" in error_msg:
            raise ValueError(
                "Kaggle authentication required. Set KAGGLE_USERNAME and KAGGLE_KEY "
                "environment variables with your Kaggle API credentials."
            )
        elif "404" in error_msg or "not found" in error_msg:
            raise ValueError(f"Kaggle dataset '{ref}' not found. Check the dataset reference.")
        else:
            raise ValueError(f"Failed to download Kaggle dataset: {e}")

    csv_files = _find_csv_files(download_path)

    if not csv_files:
        raise ValueError("No CSV files found in the Kaggle dataset.")

    # Single CSV -- use it directly
    if len(csv_files) == 1:
        return _save_csv_to_uploads(csv_files[0]["path"], csv_files[0]["name"])

    # User already selected a file
    if selected_file:
        match = next((f for f in csv_files if f["name"] == selected_file), None)
        if not match:
            raise ValueError(f"File '{selected_file}' not found in dataset.")
        return _save_csv_to_uploads(match["path"], match["name"])

    # Multiple CSVs, no selection yet -- return file list
    return {
        "status": "select_file",
        "source": "kaggle",
        "dataset_name": ref,
        "available_files": [
            {"name": f["name"], "size_kb": f["size_kb"]}
            for f in csv_files
        ]
    }


def download_zip(
    url: str,
    selected_file: Optional[str] = None
) -> Dict[str, Any]:
    """Download a ZIP archive, extract it, and find CSV files."""
    logger.info(f"Downloading ZIP from: {url}")

    try:
        response = httpx.get(url, follow_redirects=True, timeout=120.0)
        response.raise_for_status()
    except httpx.HTTPStatusError as e:
        raise ValueError(f"Could not access URL (HTTP {e.response.status_code}).")
    except httpx.RequestError as e:
        raise ValueError(f"Network error downloading archive: {e}")

    tmp_zip = os.path.join(tempfile.gettempdir(), f"dl_{uuid.uuid4().hex[:8]}.zip")
    with open(tmp_zip, "wb") as f:
        f.write(response.content)

    extract_dir = os.path.join(tempfile.gettempdir(), f"extract_{uuid.uuid4().hex[:8]}")
    try:
        with zipfile.ZipFile(tmp_zip, "r") as z:
            z.extractall(extract_dir)
    except zipfile.BadZipFile:
        os.remove(tmp_zip)
        raise ValueError("Downloaded file is not a valid ZIP archive.")
    finally:
        if os.path.exists(tmp_zip):
            os.remove(tmp_zip)

    csv_files = _find_csv_files(extract_dir)

    if not csv_files:
        shutil.rmtree(extract_dir, ignore_errors=True)
        raise ValueError("No CSV files found in the ZIP archive.")

    # Single CSV
    if len(csv_files) == 1:
        result = _save_csv_to_uploads(csv_files[0]["path"], csv_files[0]["name"])
        shutil.rmtree(extract_dir, ignore_errors=True)
        return result

    # User already selected a file
    if selected_file:
        match = next((f for f in csv_files if f["name"] == selected_file), None)
        if not match:
            shutil.rmtree(extract_dir, ignore_errors=True)
            raise ValueError(f"File '{selected_file}' not found in archive.")
        result = _save_csv_to_uploads(match["path"], match["name"])
        shutil.rmtree(extract_dir, ignore_errors=True)
        return result

    # Multiple CSVs, no selection
    return {
        "status": "select_file",
        "source": "zip",
        "available_files": [
            {"name": f["name"], "size_kb": f["size_kb"]}
            for f in csv_files
        ],
        "download_path": extract_dir
    }
