import { Node, Edge } from "reactflow";

export function serializePipeline(nodes: Node[], edges: Edge[]) {
  return nodes.map((node) => {
    const inputs = edges
      .filter((e) => e.target === node.id)
      .map((e) => e.source);

    return {
      block_id: node.id,
      type: node.data.label,
      params: node.data.params || {},
      inputs,
      outputs: [node.id + "_out"]
    };
  });
}
