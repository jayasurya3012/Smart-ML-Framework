"""
Voting Ensemble block executor.
Creates a VotingClassifier or VotingRegressor from multiple algorithms.
"""
import inspect
from sklearn.ensemble import VotingClassifier, VotingRegressor
from model_engine.random_forest import MODEL_REGISTRY
from utils.logger import logger


def execute_voting_block(block, context):
    """Create a voting ensemble from selected algorithms."""
    task = block.params.get("task", "classification")
    algorithms = block.params.get("algorithms", ["random_forest", "gradient_boosting", "knn"])
    voting = block.params.get("voting", "hard")  # "hard" or "soft" for classification

    logger.info(f"Creating voting ensemble: task={task}, algorithms={algorithms}, voting={voting}")

    estimators = []
    for algo_key in algorithms:
        model_info = MODEL_REGISTRY.get(algo_key)
        if not model_info:
            logger.warning(f"Unknown algorithm '{algo_key}' in ensemble, skipping")
            continue

        model_class = model_info.get(task)
        if model_class is None:
            logger.warning(f"Algorithm '{algo_key}' does not support {task}, skipping")
            continue

        # Use default params for each sub-estimator
        default_params = dict(model_info.get("default_params", {}))

        # Filter params to valid constructor args
        try:
            valid_params = set(inspect.signature(model_class.__init__).parameters.keys())
            valid_params.discard("self")
            filtered_params = {k: v for k, v in default_params.items() if k in valid_params}
        except (ValueError, TypeError):
            filtered_params = default_params

        # Add random_state if supported
        if "random_state" in valid_params:
            filtered_params.setdefault("random_state", 42)

        try:
            estimator = model_class(**filtered_params)
            estimators.append((algo_key, estimator))
            logger.info(f"  Added estimator: {algo_key} ({model_class.__name__})")
        except Exception as e:
            logger.warning(f"Failed to create estimator '{algo_key}': {e}")

    if len(estimators) < 2:
        raise ValueError(
            f"Voting ensemble requires at least 2 valid estimators, got {len(estimators)}. "
            f"Check that selected algorithms support the '{task}' task."
        )

    # Create the voting ensemble
    if task == "classification":
        # For "soft" voting, all estimators must support predict_proba
        if voting == "soft":
            for name, est in estimators:
                if not hasattr(est, "predict_proba"):
                    logger.warning(
                        f"Estimator '{name}' lacks predict_proba, falling back to 'hard' voting"
                    )
                    voting = "hard"
                    break

        ensemble = VotingClassifier(estimators=estimators, voting=voting)
    else:
        # VotingRegressor always averages predictions
        ensemble = VotingRegressor(estimators=estimators)

    context["model"] = ensemble
    context["task"] = task
    context["algorithm"] = f"voting_ensemble({','.join(algorithms)})"

    logger.info(
        f"Created voting ensemble with {len(estimators)} estimators: "
        f"{[e[0] for e in estimators]}"
    )
    return context
