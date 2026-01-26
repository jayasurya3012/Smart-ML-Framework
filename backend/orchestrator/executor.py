import networkx as nx
from typing import List
from backend.schemas.block_schema import Block

class BlockExecutor:
    def __init__(self, blocks: List[Block]):
        self.blocks = blocks
        self.graph = nx.DiGraph()
        self.block_map = {b.block_id: b for b in blocks}

    def build_graph(self):
        for block in self.blocks:
            self.graph.add_node(block.block_id)
            for inp in block.inputs:
                self.graph.add_edge(inp, block.block_id)

        if not nx.is_directed_acyclic_graph(self.graph):
            raise ValueError("Pipeline contains cycles")

    def get_execution_order(self):
        return list(nx.topological_sort(self.graph))
