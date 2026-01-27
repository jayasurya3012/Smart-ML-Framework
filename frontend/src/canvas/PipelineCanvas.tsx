import { useState, useCallback, useEffect, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState
} from "reactflow";
import type { Node, Edge, Connection } from "reactflow";
import "reactflow/dist/style.css";

import { serializePipeline } from "../utils/serializePipeline";
import {
  runPipeline,
  getLatestSession,
  createSession,
  updateSession
} from "../services/api";
import type { Session } from "../services/api";

import BlockNode from "./BlockNode";
import BlockConfigPanel from "../panels/BlockConfigPanel";
import ResultsPanel from "../panels/ResultsPanel";
import SessionPanel from "../panels/SessionPanel";

/* -------------------- Types -------------------- */

type BlockType = "dataset" | "split" | "model" | "trainer" | "metrics";

type BlockNodeData = {
  label: string;
  blockType: BlockType;
  params: Record<string, any>;
};

type PipelineResult = {
  status: "success" | "error";
  metrics?: Record<string, number>;
  predictions_preview?: number[];
  logs?: string[];
  error?: string;
};

type PanelView = "config" | "results" | "sessions";

/* -------------------- Node Types -------------------- */

const nodeTypes = {
  block: BlockNode
};

/* -------------------- Component -------------------- */

export default function PipelineCanvas() {
  /* React Flow state */
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<BlockNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node<BlockNodeData> | null>(null);

  /* Session state */
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState<string>("New Pipeline");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  /* Panel state */
  const [panelView, setPanelView] = useState<PanelView>("results");

  /* Results state */
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  /* Load latest session on mount */
  useEffect(() => {
    const loadLatestSession = async () => {
      try {
        const response = await getLatestSession();
        if (response.session) {
          loadSession(response.session);
        }
      } catch (err) {
        console.error("Failed to load latest session:", err);
      } finally {
        isInitialLoadRef.current = false;
      }
    };

    loadLatestSession();
  }, []);

  /* Auto-save when nodes or edges change */
  useEffect(() => {
    // Skip auto-save during initial load
    if (isInitialLoadRef.current) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save by 1 second
    saveTimeoutRef.current = setTimeout(() => {
      saveSession();
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [nodes, edges]);

  /* Save session */
  const saveSession = async () => {
    if (nodes.length === 0 && edges.length === 0 && !currentSessionId) {
      return; // Don't create empty sessions
    }

    setIsSaving(true);

    const sessionData = {
      nodes: nodes.map(n => ({
        id: n.id,
        type: n.type || "block",
        position: n.position,
        data: n.data
      })),
      edges: edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || null,
        targetHandle: e.targetHandle || null
      }))
    };

    try {
      if (currentSessionId) {
        await updateSession(currentSessionId, undefined, sessionData);
      } else {
        const newSession = await createSession(null, sessionData);
        setCurrentSessionId(newSession.id);
        setSessionName(newSession.name);
      }
      setLastSaved(new Date());
    } catch (err) {
      console.error("Failed to save session:", err);
    } finally {
      setIsSaving(false);
    }
  };

  /* Load session */
  const loadSession = (session: Session) => {
    isInitialLoadRef.current = true;

    setCurrentSessionId(session.id);
    setSessionName(session.name);

    // Restore nodes
    const restoredNodes = session.data.nodes.map(n => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data
    }));
    setNodes(restoredNodes);

    // Restore edges
    const restoredEdges = session.data.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle
    }));
    setEdges(restoredEdges);

    setSelectedNode(null);
    setResult(null);
    setPanelView("results");

    // Allow auto-save after a short delay
    setTimeout(() => {
      isInitialLoadRef.current = false;
    }, 500);
  };

  /* Create new session */
  const createNewSession = () => {
    isInitialLoadRef.current = true;

    setCurrentSessionId(null);
    setSessionName("New Pipeline");
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setResult(null);
    setPanelView("results");

    setTimeout(() => {
      isInitialLoadRef.current = false;
    }, 500);
  };

  /* Edge creation */
  const onConnect = (connection: Connection) => {
    setEdges((eds) => addEdge(connection, eds));
  };

  /* Node selection */
  const onNodeClick = (_: any, node: Node<BlockNodeData>) => {
    setSelectedNode(node);
    setPanelView("config");
  };

  /* Update node params */
  const updateNode = (updatedNode: Node<BlockNodeData>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === updatedNode.id ? updatedNode : n))
    );
    setSelectedNode(updatedNode);
  };

  /* Add block */
  const addBlock = (type: BlockType) => {
    const id = `${type}_${Date.now()}`;

    let params: Record<string, any> = {};

    if (type === "model") {
      params = {
        task: "classification",
        n_estimators: 100,
        max_depth: 10
      };
    }

    if (type === "split") {
      params = { test_size: 0.2 };
    }

    if (type === "trainer") {
      params = { fit_params: {} };
    }

    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "block",
        position: { x: 100, y: 100 + nds.length * 120 },
        data: {
          label: type.toUpperCase(),
          blockType: type,
          params
        }
      }
    ]);
  };

  /* Delete block */
  const deleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) =>
      eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
    );
    setSelectedNode(null);
    setPanelView("results");
  };

  /* Run pipeline */
  const run = useCallback(async () => {
    if (nodes.length === 0) {
      alert("Add at least one block before running the pipeline.");
      return;
    }

    const pipeline = serializePipeline(nodes, edges);
    const datasetBlock = pipeline.find((b) => b.type === "dataset");

    if (!datasetBlock) {
      alert("Pipeline must contain a Dataset block.");
      return;
    }

    if (!datasetBlock.params?.file_path || !datasetBlock.params?.target) {
      alert("Dataset block requires file_path and target.");
      return;
    }

    try {
      setIsRunning(true);
      setResult(null);
      setSelectedNode(null);
      setPanelView("results");

      const response = await runPipeline(pipeline);

      setResult({
        status: "success",
        metrics: response.metrics,
        predictions_preview: response.predictions_preview,
        logs: response.logs
      });
    } catch (err: any) {
      setResult({
        status: "error",
        error: err.message || "Pipeline execution failed"
      });
    } finally {
      setIsRunning(false);
    }
  }, [nodes, edges]);

  /* Format last saved time */
  const formatLastSaved = () => {
    if (!lastSaved) return null;
    const diff = Date.now() - lastSaved.getTime();
    if (diff < 5000) return "Saved just now";
    if (diff < 60000) return `Saved ${Math.floor(diff / 1000)}s ago`;
    return `Saved ${Math.floor(diff / 60000)}m ago`;
  };

  /* -------------------- Render -------------------- */

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh" }}>
      {/* LEFT: Canvas */}
      <div style={{ flex: 1, position: "relative" }}>
        {/* Top Toolbar */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            right: 12,
            zIndex: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px"
          }}
        >
          {/* Left: Block Palette */}
          <div
            style={{
              background: "#fff",
              padding: "12px 16px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.12)"
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#6b7280", marginRight: "4px" }}>
              Add:
            </span>
            {[
              { type: "dataset" as BlockType, icon: "📁", label: "Dataset" },
              { type: "split" as BlockType, icon: "✂️", label: "Split" },
              { type: "model" as BlockType, icon: "🤖", label: "Model" },
              { type: "trainer" as BlockType, icon: "🎯", label: "Trainer" },
              { type: "metrics" as BlockType, icon: "📊", label: "Metrics" }
            ].map(({ type, icon, label }) => (
              <button
                key={type}
                onClick={() => addBlock(type)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 12px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#374151",
                  background: "#f3f4f6",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.15s"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "#e5e7eb";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "#f3f4f6";
                }}
              >
                <span>{icon}</span>
                {label}
              </button>
            ))}

            <div style={{ width: "1px", height: "28px", background: "#e5e7eb", margin: "0 8px" }} />

            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: isRunning ? "#9ca3af" : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "#fff",
                padding: "10px 20px",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "14px",
                border: "none",
                cursor: isRunning ? "not-allowed" : "pointer",
                boxShadow: isRunning ? "none" : "0 2px 8px rgba(16, 185, 129, 0.4)",
                transition: "all 0.15s"
              }}
              onClick={run}
              disabled={isRunning}
            >
              {isRunning ? "Running..." : "▶ Run"}
            </button>
          </div>

          {/* Right: Session Info & History */}
          <div
            style={{
              background: "#fff",
              padding: "10px 16px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.12)"
            }}
          >
            {/* Session name and save status */}
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a2e" }}>
                {sessionName}
              </div>
              <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                {isSaving ? "Saving..." : formatLastSaved() || "Not saved yet"}
              </div>
            </div>

            <div style={{ width: "1px", height: "28px", background: "#e5e7eb" }} />

            {/* History button */}
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 12px",
                fontSize: "13px",
                fontWeight: 500,
                color: panelView === "sessions" ? "#3b82f6" : "#374151",
                background: panelView === "sessions" ? "#eff6ff" : "#f3f4f6",
                border: `1px solid ${panelView === "sessions" ? "#bfdbfe" : "#e5e7eb"}`,
                borderRadius: "8px",
                cursor: "pointer"
              }}
              onClick={() => setPanelView(panelView === "sessions" ? "results" : "sessions")}
            >
              <span>📚</span>
              History
            </button>

            {/* Results button */}
            {result && (
              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 12px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: result.status === "success" ? "#059669" : "#dc2626",
                  background: result.status === "success" ? "#ecfdf5" : "#fef2f2",
                  border: `1px solid ${result.status === "success" ? "#a7f3d0" : "#fecaca"}`,
                  borderRadius: "8px",
                  cursor: "pointer"
                }}
                onClick={() => {
                  setSelectedNode(null);
                  setPanelView("results");
                }}
              >
                {result.status === "success" ? "✓ Results" : "⚠ Error"}
              </button>
            )}
          </div>
        </div>

        {/* React Flow */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={() => {
            setSelectedNode(null);
            if (panelView === "config") {
              setPanelView("results");
            }
          }}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          nodesDraggable
          nodesConnectable
          elementsSelectable
          deleteKeyCode={["Backspace", "Delete"]}
          defaultEdgeOptions={{
            style: { strokeWidth: 2, stroke: "#94a3b8" },
            type: "smoothstep"
          }}
        >
          <Background color="#e5e7eb" gap={20} />
          <Controls />
        </ReactFlow>
      </div>

      {/* RIGHT: Panel */}
      {panelView === "config" && selectedNode ? (
        <BlockConfigPanel
          node={selectedNode}
          onUpdate={updateNode}
          onDelete={deleteNode}
        />
      ) : panelView === "sessions" ? (
        <SessionPanel
          currentSessionId={currentSessionId}
          onLoadSession={loadSession}
          onNewSession={createNewSession}
        />
      ) : (
        <ResultsPanel result={result} isRunning={isRunning} />
      )}
    </div>
  );
}
