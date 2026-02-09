from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    mean_squared_error,
    mean_absolute_error,
    r2_score
)
from utils.logger import logger


def execute_metrics_block(block, context):
    model = context["model"]
    X_test = context["X_test"]
    y_test = context["y_test"]

    # Handle X_test that needs preprocessing (categorical cols, missing values)
    import pandas as pd
    import numpy as np
    if isinstance(X_test, pd.DataFrame):
        if "feature_pipeline" in context:
            # Apply the full preprocessing pipeline (includes imputation)
            X_test = context["feature_pipeline"].transform(X_test)
    elif isinstance(X_test, np.ndarray) and "numeric_imputer" in context:
        # Handle numpy arrays with missing values
        if np.isnan(X_test).any():
            X_test = context["numeric_imputer"].transform(X_test)

    y_pred = model.predict(X_test)

    # Use task from context (set by model block) or fall back to block params
    task = context.get("task") or block.params.get("task", "classification")

    logger.info(f"Computing metrics for task: {task}")

    if task == "classification":
        # Calculate all classification metrics
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
        recall = recall_score(y_test, y_pred, average='weighted', zero_division=0)
        f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)

        result = {
            "accuracy": float(accuracy),
            "precision": float(precision),
            "recall": float(recall),
            "f1_score": float(f1)
        }

        logger.info(f"Accuracy:  {accuracy:.4f}")
        logger.info(f"Precision: {precision:.4f}")
        logger.info(f"Recall:    {recall:.4f}")
        logger.info(f"F1 Score:  {f1:.4f}")
    else:
        # Calculate all regression metrics
        mse = mean_squared_error(y_test, y_pred)
        rmse = mse ** 0.5
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)

        result = {
            "mse": float(mse),
            "rmse": float(rmse),
            "mae": float(mae),
            "r2_score": float(r2)
        }

        logger.info(f"MSE:  {mse:.4f}")
        logger.info(f"RMSE: {rmse:.4f}")
        logger.info(f"MAE:  {mae:.4f}")
        logger.info(f"R2:   {r2:.4f}")

    # Decode predictions back to original labels if label encoder was used
    label_encoder = context.get("label_encoder")
    if label_encoder is not None:
        try:
            y_pred_display = label_encoder.inverse_transform(y_pred).tolist()
            y_actual_display = label_encoder.inverse_transform(y_test).tolist()
        except Exception:
            y_pred_display = y_pred.tolist()
            y_actual_display = y_test.tolist() if hasattr(y_test, 'tolist') else list(y_test)
    else:
        y_pred_display = y_pred.tolist()
        y_actual_display = y_test.tolist() if hasattr(y_test, 'tolist') else list(y_test)

    # Store predictions and actual values for comparison
    context["y_pred"] = y_pred_display
    context["y_actual"] = y_actual_display
    context["metrics"] = result

    return context
