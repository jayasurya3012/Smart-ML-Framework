from backend.data_engine.dataset import execute_dataset_block
from backend.data_engine.split import execute_split_block
from backend.data_engine.features import execute_feature_block
from backend.model_engine.random_forest import execute_model_block
from backend.training.trainer import execute_trainer_block
from backend.evaluation.metrics import execute_metrics_block


BLOCK_EXECUTORS = {
    "dataset": execute_dataset_block,
    "split": execute_split_block,
    "feature_pipeline": execute_feature_block,
    "model": execute_model_block,
    "trainer": execute_trainer_block,
    "metrics": execute_metrics_block
}

def execute_block(block, context):
    BLOCK_EXECUTORS[block.type](block, context)
