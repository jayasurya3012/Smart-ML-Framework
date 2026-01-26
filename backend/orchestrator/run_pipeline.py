from backend.orchestrator.executor import BlockExecutor
from backend.orchestrator.dispatcher import execute_block


def run_pipeline(blocks):
    executor = BlockExecutor(blocks)
    executor.build_graph()

    context = {}

    for block_id in executor.get_execution_order():
        block = executor.block_map[block_id]
        execute_block(block, context)

    return context
