import joblib
import os
import uuid
import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.preprocessing import StandardScaler, OneHotEncoder, LabelEncoder
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from utils.logger import logger

# Directory for saved models
MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
os.makedirs(MODELS_DIR, exist_ok=True)


def _auto_preprocess(X_train, X_test, context):
    """Auto-preprocess data: handle missing values, encode categoricals, scale numerics."""
    if not isinstance(X_train, pd.DataFrame):
        # Already a numpy array — check for NaN and impute if needed
        if np.isnan(X_train).any():
            logger.info("Imputing missing values in numeric array...")
            imputer = SimpleImputer(strategy="median")
            X_train = imputer.fit_transform(X_train)
            X_test = imputer.transform(X_test)
            context["numeric_imputer"] = imputer
        return X_train, X_test

    cat_cols = X_train.select_dtypes(exclude="number").columns.tolist()
    num_cols = X_train.select_dtypes(include="number").columns.tolist()

    # Check if we have any missing values or categorical columns that need processing
    has_missing = X_train.isnull().any().any()
    needs_processing = cat_cols or has_missing

    if not needs_processing:
        # All numeric with no missing values, no preprocessing needed
        return X_train, X_test

    logger.info(f"Auto-preprocessing: {len(cat_cols)} categorical cols, {len(num_cols)} numeric cols")
    if has_missing:
        missing_count = X_train.isnull().sum().sum()
        logger.info(f"Handling {missing_count} missing values...")

    transformers = []

    # Numeric columns: impute missing values (median) then scale
    if num_cols:
        numeric_pipeline = Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler())
        ])
        transformers.append(("num", numeric_pipeline, num_cols))

    # Categorical columns: impute missing (most frequent) then one-hot encode
    if cat_cols:
        categorical_pipeline = Pipeline([
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False))
        ])
        transformers.append(("cat", categorical_pipeline, cat_cols))

    transformer = ColumnTransformer(transformers)
    X_train = transformer.fit_transform(X_train)
    X_test = transformer.transform(X_test)

    context["feature_pipeline"] = transformer
    context["X_train"] = X_train
    context["X_test"] = X_test

    logger.info(f"Auto-preprocessing complete: {X_train.shape[1]} features after transform")
    return X_train, X_test


def execute_trainer_block(block, context):
    model = context["model"]

    X_train = context["X_train"]
    y_train = context["y_train"]

    # Get training options from block params
    auto_tune = block.params.get("auto_tune", False)
    cv_folds = block.params.get("cv_folds", 3)

    # Auto-preprocess if no feature_pipeline was used and data has non-numeric columns
    if "feature_pipeline" not in context:
        X_test = context.get("X_test")
        X_train, X_test = _auto_preprocess(X_train, X_test, context)

    # Encode target if it's non-numeric (string labels)
    if isinstance(y_train, pd.Series) and y_train.dtype == "object":
        logger.info("Encoding string target labels...")
        le = LabelEncoder()
        y_train = le.fit_transform(y_train)
        context["y_train"] = y_train
        context["y_test"] = le.transform(context["y_test"])
        context["label_encoder"] = le

    # Auto-tune if enabled
    if auto_tune:
        from model_engine.random_forest import tune_model
        algorithm = context.get("algorithm", "random_forest")
        task = context.get("task", "classification")

        logger.info(f"Auto-tuning {algorithm} with {cv_folds}-fold CV...")
        model, best_params, best_score = tune_model(
            model, X_train, y_train, algorithm, task, cv=cv_folds
        )
        context["model"] = model
        context["best_params"] = best_params
        context["cv_score"] = best_score

        if best_params:
            logger.info(f"Best hyperparameters found: {best_params}")
            logger.info(f"CV Score: {best_score:.4f}")
    else:
        logger.info(f"Training model with {X_train.shape[0] if hasattr(X_train, 'shape') else len(X_train)} samples...")
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
        "algorithm": context.get("algorithm", "random_forest"),
        "trained_at": datetime.now().isoformat(),
        "n_samples": X_train.shape[0] if hasattr(X_train, "shape") else len(X_train),
        "n_features": X_train.shape[1] if hasattr(X_train, "shape") else len(X_train[0]),
        "auto_tuned": auto_tune,
        "best_params": context.get("best_params"),
        "cv_score": context.get("cv_score")
    }

    # Save preprocessors if available
    if "feature_pipeline" in context:
        model_data["feature_pipeline"] = context["feature_pipeline"]
    if "label_encoder" in context:
        model_data["label_encoder"] = context["label_encoder"]
    if "numeric_imputer" in context:
        model_data["numeric_imputer"] = context["numeric_imputer"]

    joblib.dump(model_data, model_path)
    logger.info(f"Model saved to: {model_path}")

    context["model"] = model
    context["model_path"] = model_path
    context["model_id"] = model_id
    context["model_filename"] = model_filename

    return context
