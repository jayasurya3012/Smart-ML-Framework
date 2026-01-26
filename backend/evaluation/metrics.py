from sklearn.metrics import accuracy_score, f1_score

def execute_metrics_block(block, context):
    model = context["trained_model"]
    X_test = context["X_test_t"]
    y_test = context["y_test"]

    preds = model.predict(X_test)

    metrics = {
        "accuracy": accuracy_score(y_test, preds),
        "f1": f1_score(y_test, preds, average="weighted")
    }

    context["metrics"] = metrics
