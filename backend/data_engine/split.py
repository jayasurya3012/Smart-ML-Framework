from sklearn.model_selection import train_test_split

def execute_split_block(block, context):
    test_size = block.params.get("test_size", 0.2)
    random_state = block.params.get("random_state", 42)

    X = context["X"]
    y = context["y"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=test_size,
        random_state=random_state
    )

    context["X_train"] = X_train
    context["X_test"] = X_test
    context["y_train"] = y_train
    context["y_test"] = y_test

    return context
