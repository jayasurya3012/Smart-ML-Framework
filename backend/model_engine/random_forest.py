from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from utils.logger import logger


def execute_model_block(block, context):
    task = block.params.get("task", "classification")
    n_estimators = block.params.get("n_estimators", 100)
    max_depth = block.params.get("max_depth", None)

    logger.info(f"Creating model: task={task}, n_estimators={n_estimators}, max_depth={max_depth}")

    if task == "classification":
        model = RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            random_state=42
        )
    else:
        model = RandomForestRegressor(
            n_estimators=n_estimators,
            max_depth=max_depth,
            random_state=42
        )

    context["model"] = model
    context["task"] = task  # Store task for metrics block
    return context
