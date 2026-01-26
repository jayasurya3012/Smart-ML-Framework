import pandas as pd

def execute_dataset_block(block, context):
    file_path = block.params["file_path"]
    target = block.params["target"]

    df = pd.read_csv(file_path)

    context["df"] = df
    context["target"] = target
