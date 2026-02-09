from data_engine.dataset import execute_dataset_block
from data_engine.split import execute_split_block
from data_engine.features import execute_feature_block
from data_engine.merge import execute_merge_block
from data_engine.data_cleaner import execute_data_cleaner_block
from model_engine.random_forest import execute_model_block
from model_engine.voting import execute_voting_block
from training.trainer import execute_trainer_block
from evaluation.metrics import execute_metrics_block
from custom_blocks.manager import manager as block_manager
from custom_blocks.executor import execute_custom_block
from utils.logger import logger


BLOCK_EXECUTORS = {
    "dataset": execute_dataset_block,
    "data_cleaner": execute_data_cleaner_block,
    "dataset_merge": execute_merge_block,
    "split": execute_split_block,
    "feature_pipeline": execute_feature_block,
    "model": execute_model_block,
    "voting_ensemble": execute_voting_block,
    "trainer": execute_trainer_block,
    "metrics": execute_metrics_block
}

# Define required context keys for each block type
BLOCK_REQUIREMENTS = {
    "dataset": [],
    "data_cleaner": ["df"],
    "dataset_merge": ["datasets"],
    "split": ["X", "y"],
    "feature_pipeline": ["X_train", "X_test"],
    "model": [],
    "voting_ensemble": [],
    "trainer": ["model", "X_train", "y_train"],
    "metrics": ["model", "X_test", "y_test"]
}


def execute_block(block, context):
    block_type = block.type

    # Check built-in executors first, then fall back to custom blocks
    is_builtin = block_type in BLOCK_EXECUTORS
    custom_def = None

    if not is_builtin:
        custom_def = block_manager.get_block_by_type(block_type)
        if custom_def is None:
            raise ValueError(f"Unknown block type: {block_type}")

    # Validate required context keys before execution (built-in blocks only)
    required_keys = BLOCK_REQUIREMENTS.get(block_type, [])
    missing_keys = [key for key in required_keys if key not in context]

    if missing_keys:
        raise ValueError(
            f"Block '{block.id}' (type: {block_type}) is missing required inputs: {missing_keys}. "
            f"Ensure upstream blocks are connected and executed first."
        )

    try:
        if is_builtin:
            BLOCK_EXECUTORS[block_type](block, context)
        else:
            execute_custom_block(block, context, custom_def["code"])
    except KeyError as e:
        raise ValueError(
            f"Block '{block.id}' failed: missing context key {e}. "
            f"Check that upstream blocks produce the required outputs."
        )
    except Exception as e:
        logger.error(f"Block '{block.id}' failed with error: {e}")
        raise ValueError(f"Block '{block.id}' (type: {block_type}) failed: {str(e)}")
