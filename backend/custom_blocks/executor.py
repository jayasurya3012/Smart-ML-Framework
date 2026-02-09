"""
Custom Block Executor -- dynamically runs user-defined block code.
The code string is executed with `block` and `context` in scope,
plus common ML imports (pandas, numpy, sklearn).
"""
import pandas as pd
import numpy as np
from utils.logger import logger


# Allowed imports that custom block code can access
ALLOWED_MODULES = {
    "pd": pd,
    "np": np,
    "pandas": pd,
    "numpy": np,
}

# Lazily import sklearn submodules that custom blocks might need
def _get_sklearn_modules():
    modules = {}
    try:
        from sklearn import preprocessing, model_selection, metrics, ensemble, linear_model, tree, neighbors, svm, naive_bayes, neural_network
        modules["preprocessing"] = preprocessing
        modules["model_selection"] = model_selection
        modules["sklearn_metrics"] = metrics
        modules["ensemble"] = ensemble
        modules["linear_model"] = linear_model
        modules["tree"] = tree
        modules["neighbors"] = neighbors
        modules["svm"] = svm
        modules["naive_bayes"] = naive_bayes
        modules["neural_network"] = neural_network
    except ImportError:
        pass
    return modules


def execute_custom_block(block, context, code_str: str):
    """
    Execute a custom block's code string.

    The code receives:
      - `block`: the block object with .params and .inputs
      - `context`: the shared pipeline context dict
      - Common imports: pd, np, sklearn submodules

    The code should modify `context` in-place (e.g., context["X"] = ...).
    """
    # Build the execution namespace
    exec_globals = {
        "__builtins__": {
            # Safe builtins
            "print": print,
            "len": len,
            "range": range,
            "list": list,
            "dict": dict,
            "set": set,
            "tuple": tuple,
            "str": str,
            "int": int,
            "float": float,
            "bool": bool,
            "enumerate": enumerate,
            "zip": zip,
            "map": map,
            "filter": filter,
            "sorted": sorted,
            "min": min,
            "max": max,
            "sum": sum,
            "abs": abs,
            "round": round,
            "isinstance": isinstance,
            "type": type,
            "hasattr": hasattr,
            "getattr": getattr,
            "setattr": setattr,
            "ValueError": ValueError,
            "TypeError": TypeError,
            "KeyError": KeyError,
            "Exception": Exception,
        },
        **ALLOWED_MODULES,
        **_get_sklearn_modules(),
        "block": block,
        "context": context,
        "logger": logger,
    }

    try:
        exec(code_str, exec_globals)
        logger.info(f"Custom block '{block.id}' executed successfully")
    except Exception as e:
        logger.error(f"Custom block '{block.id}' failed: {e}")
        raise ValueError(
            f"Custom block '{block.id}' execution error: {str(e)}"
        )

    return context
