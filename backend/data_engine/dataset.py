import os
import pandas as pd
from fastapi import HTTPException

def execute_dataset_block(block, context):
    file_path = block.params.get("file_path")
    target = block.params.get("target")

    if not file_path or not target:
        raise HTTPException(
            status_code=400,
            detail="Dataset block requires 'file_path' and 'target'"
        )

    # Sanitize path
    file_path = file_path.strip().strip('"').strip("'")

    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=400,
            detail=f"Dataset file not found: {file_path}"
        )

    df = pd.read_csv(file_path)

    if target not in df.columns:
        raise HTTPException(
            status_code=400,
            detail=f"Target column '{target}' not found in dataset"
        )

    # Separate features and target
    X = df.drop(columns=[target])
    y = df[target]

    context["df"] = df
    context["X"] = X
    context["y"] = y
    context["target"] = target
    context["feature_names"] = X.columns.tolist()
    context["target_name"] = target

    return context
