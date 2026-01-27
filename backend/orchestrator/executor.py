import networkx as nx
from typing import List, Union
from schemas.block_schema import Block
from schemas.pipeline import PipelineBlock


class BlockExecutor:
    def __init__(self, blocks: List[Union[Block, PipelineBlock]]):
        self.blocks = blocks
        self.graph = nx.DiGraph()

        # Map block.id → Block
        self.block_map = {b.id: b for b in blocks}

    def build_graph(self):
        for block in self.blocks:
            self.graph.add_node(block.id)

            # Build edges: input block → this block
            for inp in block.inputs:
                if inp not in self.block_map:
                    raise ValueError(
                        f"Block '{block.id}' references unknown input '{inp}'"
                    )
                self.graph.add_edge(inp, block.id)

        if not nx.is_directed_acyclic_graph(self.graph):
            raise ValueError("Pipeline contains cycles")

    def get_execution_order(self):
        return list(nx.topological_sort(self.graph))
