from sklearn.model_selection import train_test_split
import numpy as np
import logging

logger = logging.getLogger("ml-copilot")

def execute_split_block(block, context):
    df = context["df"]
    target = context["target"]

    X = df.drop(columns=[target])
    y = df[target]

    test_size = block.params.get("test_size", 0.2)
    stratify = block.params.get("stratify", False)

    n_classes = y.nunique()
    test_samples = int(np.ceil(test_size * len(y)))

    use_stratify = stratify and test_samples >= n_classes

    if stratify and not use_stratify:
        logger.warning(
            "Stratified split disabled: not enough samples per class"
        )

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        stratify=y if use_stratify else None,
        random_state=42
    )

    context.update({
        "X_train": X_train,
        "X_test": X_test,
        "y_train": y_train,
        "y_test": y_test
    })
