from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

def execute_feature_block(block, context):
    X_train = context["X_train"]
    X_test = context["X_test"]

    num_cols = X_train.select_dtypes(include="number").columns
    cat_cols = X_train.select_dtypes(exclude="number").columns

    numeric_pipe = Pipeline([
        ("scaler", StandardScaler())
    ])

    categorical_pipe = Pipeline([
        ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False))
    ])

    transformers = []
    if len(num_cols) > 0:
        transformers.append(("num", numeric_pipe, num_cols))
    if len(cat_cols) > 0:
        transformers.append(("cat", categorical_pipe, cat_cols))

    if not transformers:
        return context

    transformer = ColumnTransformer(transformers)

    X_train_t = transformer.fit_transform(X_train)
    X_test_t = transformer.transform(X_test)

    # Overwrite X_train / X_test so downstream blocks (trainer, metrics) use preprocessed data
    context["X_train"] = X_train_t
    context["X_test"] = X_test_t
    context["feature_pipeline"] = transformer

    return context
