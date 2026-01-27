from orchestrator.executor import BlockExecutor
from orchestrator.dispatcher import execute_block
from utils.logger import logger


def run_pipeline(blocks):
    executor = BlockExecutor(blocks)
    executor.build_graph()

    context = {}
    execution_order = executor.get_execution_order()

    logger.info(f"Execution order: {execution_order}")

    for block_id in execution_order:
        block = executor.block_map[block_id]
        logger.info(f"Executing block: {block_id} (type: {block.type})")
        execute_block(block, context)
        logger.info(f"Completed block: {block_id}")

    return context
