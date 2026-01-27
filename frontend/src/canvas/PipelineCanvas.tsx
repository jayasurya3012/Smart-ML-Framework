import { useState } from "react";
import ReactFlow, { Background, Controls, addEdge } from "reactflow";
import type { Node, Edge, Connection } from "reactflow";
import "reactflow/dist/style.css";
import BlockConfigPanel from "../panels/BlockConfigPanel";

type BlockType = "dataset" | "split" | "model" | "trainer" | "metrics";

export default function PipelineCanvas() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const onNodeClick = (_: any, node: Node) => {
    setSelectedNode(node);
  };

  const onConnect = (connection: Connection) => {
    setEdges((eds) => addEdge(connection, eds));
  };

  const updateNode = (updatedNode: Node) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === updatedNode.id ? updatedNode : n))
    );
    setSelectedNode(updatedNode);
  };

  const addBlock = (type: BlockType) => {
    const id = `${type}_${nodes.length + 1}`;

    const newNode: Node = {
      id,
      type: "default",
      position: {
        x: 100,
        y: 100 + nodes.length * 80
      },
      data: {
        label: type.toUpperCase(),
        blockType: type,
        params: {}
      }
    };

    setNodes((nds) => [...nds, newNode]);
  };

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh" }}>
      {/* LEFT: Canvas + Palette */}
      <div style={{ flex: 1, position: "relative" }}>
        {/* 🔹 BLOCK PALETTE */}
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            zIndex: 10,
            background: "#fff",
            padding: "10px",
            borderRadius: "6px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            display: "flex",
            gap: "6px"
          }}
        >
          <button onClick={() => addBlock("dataset")}>Dataset</button>
          <button onClick={() => addBlock("split")}>Split</button>
          <button onClick={() => addBlock("model")}>Model</button>
          <button onClick={() => addBlock("trainer")}>Trainer</button>
          <button onClick={() => addBlock("metrics")}>Metrics</button>
        </div>

        {/* 🔹 CANVAS */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      {/* RIGHT: Config Panel */}
      <BlockConfigPanel node={selectedNode} onUpdate={updateNode} />
    </div>
  );
}
