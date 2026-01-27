from sklearn.metrics import accuracy_score, mean_squared_error
from utils.logger import logger


def execute_metrics_block(block, context):
    model = context["model"]
    X_test = context["X_test"]
    y_test = context["y_test"]

    y_pred = model.predict(X_test)

    # Use task from context (set by model block) or fall back to block params
    task = context.get("task") or block.params.get("task", "classification")

    logger.info(f"Computing metrics for task: {task}")

    if task == "classification":
        score = accuracy_score(y_test, y_pred)
        result = {
            "accuracy": float(score)
        }
        logger.info(f"Accuracy: {score:.4f}")
    else:
        mse = mean_squared_error(y_test, y_pred)
        result = {
            "mse": float(mse)
        }
        logger.info(f"MSE: {mse:.4f}")

    context["y_pred"] = y_pred.tolist()
    context["metrics"] = result

    return context
