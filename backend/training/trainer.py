def execute_trainer_block(block, context):
    model = context["model"]

    X_train = context["X_train"]
    y_train = context["y_train"]

    model.fit(X_train, y_train)

    context["model"] = model
    return context
