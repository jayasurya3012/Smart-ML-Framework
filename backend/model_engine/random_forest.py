from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor

def execute_model_block(block, context):
    task = block.params["task"]

    if task == "classification":
        model = RandomForestClassifier(**block.params["hyperparams"])
    else:
        model = RandomForestRegressor(**block.params["hyperparams"])

    context["model"] = model
