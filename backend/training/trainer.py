import joblib
import os
import uuid
from datetime import datetime
from utils.logger import logger

# Directory for saved models
MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
os.makedirs(MODELS_DIR, exist_ok=True)


def execute_trainer_block(block, context):
    model = context["model"]

    X_train = context["X_train"]
    y_train = context["y_train"]

    logger.info(f"Training model with {len(X_train)} samples...")
    model.fit(X_train, y_train)
    logger.info("Training complete!")

    # Save model to file
    model_id = str(uuid.uuid4())[:8]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    model_filename = f"model_{timestamp}_{model_id}.joblib"
    model_path = os.path.join(MODELS_DIR, model_filename)

    # Save model and metadata
    model_data = {
        "model": model,
        "feature_names": context.get("feature_names", []),
        "target_name": context.get("target_name", "target"),
        "task": context.get("task", "classification"),
        "trained_at": datetime.now().isoformat(),
        "n_samples": len(X_train),
        "n_features": X_train.shape[1] if hasattr(X_train, "shape") else len(X_train[0])
    }

    joblib.dump(model_data, model_path)
    logger.info(f"Model saved to: {model_path}")

    context["model"] = model
    context["model_path"] = model_path
    context["model_id"] = model_id
    context["model_filename"] = model_filename

    return context
