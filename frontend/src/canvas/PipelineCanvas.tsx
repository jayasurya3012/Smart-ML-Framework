import { useState } from "react";
import ReactFlow, { Background, Controls, addEdge } from "reactflow";
import type { Node, Edge, Connection } from "reactflow";
import "reactflow/dist/style.css";

type BlockType = "dataset" | "split" | "model" | "trainer" | "metrics";

export default function PipelineCanvas() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const onConnect = (connection: Connection) => {
    setEdges((eds) => addEdge(connection, eds));
  };

  // 🔹 ADD BLOCK FUNCTION
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
        params: {} // we’ll use this later
      }
    };

    setNodes((nds) => [...nds, newNode]);
  };

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
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
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
