"""
Model factory supporting 20+ ML algorithms for academic and research use.
"""

from sklearn.ensemble import (
    RandomForestClassifier, RandomForestRegressor,
    GradientBoostingClassifier, GradientBoostingRegressor,
    AdaBoostClassifier, AdaBoostRegressor,
    ExtraTreesClassifier, ExtraTreesRegressor,
    BaggingClassifier, BaggingRegressor
)
from sklearn.linear_model import (
    LogisticRegression, LinearRegression,
    Ridge, RidgeClassifier,
    Lasso, ElasticNet,
    SGDClassifier, SGDRegressor,
    BayesianRidge, Perceptron,
    PassiveAggressiveClassifier, PassiveAggressiveRegressor
)
from sklearn.svm import SVC, SVR, LinearSVC, LinearSVR
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.naive_bayes import GaussianNB, MultinomialNB, BernoulliNB
from sklearn.neural_network import MLPClassifier, MLPRegressor
from sklearn.discriminant_analysis import (
    LinearDiscriminantAnalysis, QuadraticDiscriminantAnalysis
)
from sklearn.gaussian_process import GaussianProcessClassifier, GaussianProcessRegressor

from utils.logger import logger


# ==================== Model Registry ====================

MODEL_REGISTRY = {
    # --- Ensemble Methods ---
    "random_forest": {
        "name": "Random Forest",
        "classification": RandomForestClassifier,
        "regression": RandomForestRegressor,
        "default_params": {"n_estimators": 100, "max_depth": None, "min_samples_split": 2, "min_samples_leaf": 1},
        "category": "ensemble"
    },
    "gradient_boosting": {
        "name": "Gradient Boosting",
        "classification": GradientBoostingClassifier,
        "regression": GradientBoostingRegressor,
        "default_params": {"n_estimators": 100, "learning_rate": 0.1, "max_depth": 3, "subsample": 1.0},
        "category": "ensemble"
    },
    "adaboost": {
        "name": "AdaBoost",
        "classification": AdaBoostClassifier,
        "regression": AdaBoostRegressor,
        "default_params": {"n_estimators": 50, "learning_rate": 1.0},
        "category": "ensemble"
    },
    "extra_trees": {
        "name": "Extra Trees",
        "classification": ExtraTreesClassifier,
        "regression": ExtraTreesRegressor,
        "default_params": {"n_estimators": 100, "max_depth": None, "min_samples_split": 2},
        "category": "ensemble"
    },
    "bagging": {
        "name": "Bagging",
        "classification": BaggingClassifier,
        "regression": BaggingRegressor,
        "default_params": {"n_estimators": 10, "max_samples": 1.0, "max_features": 1.0},
        "category": "ensemble"
    },

    # --- Tree Methods ---
    "decision_tree": {
        "name": "Decision Tree",
        "classification": DecisionTreeClassifier,
        "regression": DecisionTreeRegressor,
        "default_params": {"max_depth": None, "min_samples_split": 2, "min_samples_leaf": 1, "criterion": "gini"},
        "category": "tree"
    },

    # --- Linear Models ---
    "logistic_regression": {
        "name": "Logistic Regression",
        "classification": LogisticRegression,
        "regression": None,
        "default_params": {"C": 1.0, "max_iter": 1000, "solver": "lbfgs", "penalty": "l2"},
        "category": "linear"
    },
    "linear_regression": {
        "name": "Linear Regression",
        "classification": None,
        "regression": LinearRegression,
        "default_params": {"fit_intercept": True},
        "category": "linear"
    },
    "ridge": {
        "name": "Ridge",
        "classification": RidgeClassifier,
        "regression": Ridge,
        "default_params": {"alpha": 1.0},
        "category": "linear"
    },
    "lasso": {
        "name": "Lasso",
        "classification": None,
        "regression": Lasso,
        "default_params": {"alpha": 1.0, "max_iter": 1000},
        "category": "linear"
    },
    "elastic_net": {
        "name": "ElasticNet",
        "classification": None,
        "regression": ElasticNet,
        "default_params": {"alpha": 1.0, "l1_ratio": 0.5, "max_iter": 1000},
        "category": "linear"
    },
    "sgd": {
        "name": "SGD (Stochastic Gradient Descent)",
        "classification": SGDClassifier,
        "regression": SGDRegressor,
        "default_params": {"max_iter": 1000, "learning_rate": "optimal", "alpha": 0.0001},
        "category": "linear"
    },
    "bayesian_ridge": {
        "name": "Bayesian Ridge",
        "classification": None,
        "regression": BayesianRidge,
        "default_params": {"n_iter": 300, "alpha_1": 1e-6, "alpha_2": 1e-6},
        "category": "linear"
    },
    "perceptron": {
        "name": "Perceptron",
        "classification": Perceptron,
        "regression": None,
        "default_params": {"max_iter": 1000, "alpha": 0.0001},
        "category": "linear"
    },
    "passive_aggressive": {
        "name": "Passive Aggressive",
        "classification": PassiveAggressiveClassifier,
        "regression": PassiveAggressiveRegressor,
        "default_params": {"C": 1.0, "max_iter": 1000},
        "category": "linear"
    },

    # --- Support Vector Machines ---
    "svm": {
        "name": "Support Vector Machine",
        "classification": SVC,
        "regression": SVR,
        "default_params": {"C": 1.0, "kernel": "rbf", "gamma": "scale"},
        "category": "svm"
    },
    "linear_svm": {
        "name": "Linear SVM",
        "classification": LinearSVC,
        "regression": LinearSVR,
        "default_params": {"C": 1.0, "max_iter": 1000},
        "category": "svm"
    },

    # --- Nearest Neighbors ---
    "knn": {
        "name": "K-Nearest Neighbors",
        "classification": KNeighborsClassifier,
        "regression": KNeighborsRegressor,
        "default_params": {"n_neighbors": 5, "weights": "uniform", "metric": "minkowski", "p": 2},
        "category": "neighbors"
    },

    # --- Naive Bayes ---
    "gaussian_nb": {
        "name": "Gaussian Naive Bayes",
        "classification": GaussianNB,
        "regression": None,
        "default_params": {"var_smoothing": 1e-9},
        "category": "naive_bayes"
    },
    "bernoulli_nb": {
        "name": "Bernoulli Naive Bayes",
        "classification": BernoulliNB,
        "regression": None,
        "default_params": {"alpha": 1.0},
        "category": "naive_bayes"
    },

    # --- Neural Networks ---
    "mlp": {
        "name": "Multi-Layer Perceptron",
        "classification": MLPClassifier,
        "regression": MLPRegressor,
        "default_params": {
            "hidden_layer_sizes": [100],
            "activation": "relu",
            "solver": "adam",
            "learning_rate": "constant",
            "learning_rate_init": 0.001,
            "max_iter": 200,
            "alpha": 0.0001
        },
        "category": "neural_network"
    },

    # --- Discriminant Analysis ---
    "lda": {
        "name": "Linear Discriminant Analysis",
        "classification": LinearDiscriminantAnalysis,
        "regression": None,
        "default_params": {"solver": "svd"},
        "category": "discriminant"
    },
    "qda": {
        "name": "Quadratic Discriminant Analysis",
        "classification": QuadraticDiscriminantAnalysis,
        "regression": None,
        "default_params": {"reg_param": 0.0},
        "category": "discriminant"
    },

    # --- Gaussian Process ---
    "gaussian_process": {
        "name": "Gaussian Process",
        "classification": GaussianProcessClassifier,
        "regression": GaussianProcessRegressor,
        "default_params": {"n_restarts_optimizer": 0},
        "category": "gaussian_process"
    },
}


def get_available_models(task: str = "classification") -> list:
    """Return list of available models for a given task."""
    models = []
    for key, info in MODEL_REGISTRY.items():
        if info.get(task) is not None:
            models.append({
                "key": key,
                "name": info["name"],
                "category": info["category"],
                "default_params": info["default_params"]
            })
    return models


def execute_model_block(block, context):
    """Create a model instance based on block parameters."""
    task = block.params.get("task", "classification")
    algorithm = block.params.get("algorithm", "random_forest")

    logger.info(f"Creating model: algorithm={algorithm}, task={task}")

    # Look up model in registry
    model_info = MODEL_REGISTRY.get(algorithm)

    if not model_info:
        logger.warning(f"Unknown algorithm '{algorithm}', falling back to random_forest")
        model_info = MODEL_REGISTRY["random_forest"]

    model_class = model_info.get(task)

    if model_class is None:
        # Algorithm doesn't support this task, try to find a fallback
        logger.warning(f"Algorithm '{algorithm}' does not support {task}, falling back")
        if task == "classification":
            model_class = RandomForestClassifier
        else:
            model_class = RandomForestRegressor

    # Build params - start with defaults, override with user-provided
    default_params = dict(model_info.get("default_params", {}))

    # Apply user overrides from block params
    user_params = {}
    skip_keys = {"task", "algorithm"}
    for k, v in block.params.items():
        if k not in skip_keys and v is not None:
            user_params[k] = v

    # Merge: defaults + user overrides
    final_params = {**default_params, **user_params}

    # Handle special parameter conversions
    if "hidden_layer_sizes" in final_params:
        val = final_params["hidden_layer_sizes"]
        if isinstance(val, str):
            final_params["hidden_layer_sizes"] = tuple(int(x.strip()) for x in val.split(","))
        elif isinstance(val, list):
            final_params["hidden_layer_sizes"] = tuple(val)

    if "max_depth" in final_params and final_params["max_depth"] in (0, "None", "none", ""):
        final_params["max_depth"] = None

    # Filter params to only those the model constructor accepts
    import inspect
    try:
        valid_params = set(inspect.signature(model_class.__init__).parameters.keys())
        valid_params.discard("self")
        filtered_params = {k: v for k, v in final_params.items() if k in valid_params}
    except (ValueError, TypeError):
        filtered_params = final_params

    # Add random_state if supported
    if "random_state" in (valid_params if 'valid_params' in dir() else set()):
        filtered_params.setdefault("random_state", 42)

    logger.info(f"Model params: {filtered_params}")

    try:
        model = model_class(**filtered_params)
    except Exception as e:
        logger.error(f"Failed to create model with params {filtered_params}: {e}")
        # Fallback to defaults
        model = model_class(**model_info.get("default_params", {}))

    context["model"] = model
    context["task"] = task
    context["algorithm"] = algorithm
    return context


# ==================== Hyperparameter Search Grids ====================

PARAM_GRIDS = {
    "random_forest": {
        "n_estimators": [50, 100, 200],
        "max_depth": [5, 10, 20, None],
        "min_samples_split": [2, 5, 10],
        "min_samples_leaf": [1, 2, 4]
    },
    "gradient_boosting": {
        "n_estimators": [50, 100, 200],
        "learning_rate": [0.01, 0.1, 0.2],
        "max_depth": [3, 5, 7],
        "subsample": [0.8, 1.0]
    },
    "logistic_regression": {
        "C": [0.01, 0.1, 1, 10],
        "solver": ["lbfgs", "liblinear"],
        "max_iter": [200, 500, 1000]
    },
    "svm": {
        "C": [0.1, 1, 10],
        "kernel": ["rbf", "linear", "poly"],
        "gamma": ["scale", "auto"]
    },
    "knn": {
        "n_neighbors": [3, 5, 7, 11],
        "weights": ["uniform", "distance"],
        "metric": ["euclidean", "manhattan"]
    },
    "decision_tree": {
        "max_depth": [5, 10, 20, None],
        "min_samples_split": [2, 5, 10],
        "min_samples_leaf": [1, 2, 4]
    },
    "mlp": {
        "hidden_layer_sizes": [(50,), (100,), (100, 50)],
        "activation": ["relu", "tanh"],
        "learning_rate_init": [0.001, 0.01],
        "max_iter": [200, 500]
    },
    "ridge": {
        "alpha": [0.1, 1, 10, 100]
    },
    "lasso": {
        "alpha": [0.01, 0.1, 1, 10]
    },
    "elastic_net": {
        "alpha": [0.1, 1, 10],
        "l1_ratio": [0.2, 0.5, 0.8]
    },
    "extra_trees": {
        "n_estimators": [50, 100, 200],
        "max_depth": [5, 10, 20, None],
        "min_samples_split": [2, 5, 10]
    },
    "adaboost": {
        "n_estimators": [50, 100, 200],
        "learning_rate": [0.01, 0.1, 1.0]
    }
}


def get_param_grid(algorithm: str) -> dict:
    """Get the hyperparameter search grid for an algorithm."""
    return PARAM_GRIDS.get(algorithm, {})


def tune_model(model, X_train, y_train, algorithm: str, task: str, cv: int = 3, n_iter: int = 20):
    """
    Perform hyperparameter tuning using RandomizedSearchCV.
    Returns the best model and best parameters.
    """
    from sklearn.model_selection import RandomizedSearchCV, GridSearchCV
    import numpy as np

    param_grid = get_param_grid(algorithm)

    if not param_grid:
        logger.info(f"No param grid defined for {algorithm}, skipping tuning")
        model.fit(X_train, y_train)
        return model, {}, None

    # Calculate total combinations
    total_combinations = 1
    for values in param_grid.values():
        total_combinations *= len(values)

    # Use GridSearchCV for small search spaces, RandomizedSearchCV for large
    if total_combinations <= 30:
        logger.info(f"Using GridSearchCV with {total_combinations} combinations")
        search = GridSearchCV(
            model,
            param_grid,
            cv=cv,
            scoring="accuracy" if task == "classification" else "neg_mean_squared_error",
            n_jobs=-1,
            verbose=0
        )
    else:
        logger.info(f"Using RandomizedSearchCV with {n_iter} iterations (of {total_combinations} possible)")
        search = RandomizedSearchCV(
            model,
            param_grid,
            n_iter=min(n_iter, total_combinations),
            cv=cv,
            scoring="accuracy" if task == "classification" else "neg_mean_squared_error",
            n_jobs=-1,
            random_state=42,
            verbose=0
        )

    search.fit(X_train, y_train)

    logger.info(f"Best params: {search.best_params_}")
    logger.info(f"Best CV score: {search.best_score_:.4f}")

    return search.best_estimator_, search.best_params_, search.best_score_
