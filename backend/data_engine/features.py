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
        ("encoder", OneHotEncoder(handle_unknown="ignore"))
    ])

    transformer = ColumnTransformer([
        ("num", numeric_pipe, num_cols),
        ("cat", categorical_pipe, cat_cols)
    ])

    X_train_t = transformer.fit_transform(X_train)
    X_test_t = transformer.transform(X_test)

    context.update({
        "X_train_t": X_train_t,
        "X_test_t": X_test_t,
        "feature_pipeline": transformer
    })
