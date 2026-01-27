import type { Node, Edge } from "reactflow";

export interface SerializedBlock {
  id: string;
  type: string;
  params: Record<string, any>;
  inputs: string[];
}

export function serializePipeline(nodes: Node[], edges: Edge[]): SerializedBlock[] {
  // Build a map of nodeId -> list of input node IDs (from edges)
  const inputsMap: Record<string, string[]> = {};

  for (const edge of edges) {
    // edge.source is the upstream block, edge.target is the downstream block
    // So edge.target receives input from edge.source
    if (!inputsMap[edge.target]) {
      inputsMap[edge.target] = [];
    }
    inputsMap[edge.target].push(edge.source);
  }

  return nodes.map((node) => ({
    id: node.id,
    type: node.data.blockType,
    params: node.data.params || {},
    inputs: inputsMap[node.id] || []
  }));
}
