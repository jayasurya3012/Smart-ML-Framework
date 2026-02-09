import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  updateSession,
  downloadDataset
} from "../services/api";
import type { Session } from "../services/api";

import BlockNode from "./BlockNode";
import BlockConfigPanel from "../panels/BlockConfigPanel";
import SessionPanel from "../panels/SessionPanel";
import OutputPanel from "../panels/OutputPanel";
import ChatPanel from "../panels/ChatPanel";
import DataInspectorPanel from "../panels/DataInspectorPanel";

/* -------------------- Types -------------------- */

type BuiltinBlockType = "dataset" | "data_cleaner" | "dataset_merge" | "split" | "feature_pipeline" | "model" | "voting_ensemble" | "trainer" | "metrics";
type BlockType = BuiltinBlockType | string;

type BlockNodeData = {
  label: string;
  blockType: BlockType;
  params: Record<string, any>;
  customDef?: CustomBlockDef;
};

type CustomBlockDef = {
  id: string;
  name: string;
  type_key: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  param_schema: Array<{
    name: string;
    type: string;
    default: any;
    description: string;
    options?: string[];
  }>;
  code: string;
  created_at: string;
};

type BlockCategoryItem = {
  type: string;
  icon: string;
  label: string;
  customDef?: CustomBlockDef;
};

type BlockCategory = {
  label: string;
  icon: string;
  items: BlockCategoryItem[];
};

type ComparisonItem = {
  actual: number | string;
  predicted: number | string;
};

type PipelineResult = {
  status: "success" | "error";
  metrics?: Record<string, number>;
  predictions_preview?: number[];
  comparison_preview?: ComparisonItem[];
  logs?: string[];
  error?: string;
  model_id?: string;
  model_filename?: string;
};

type PanelView = "config" | "output" | "sessions" | "chat";

/* -------------------- Node Types -------------------- */

const nodeTypes = {
  block: BlockNode
};

/* -------------------- Component -------------------- */

export default function PipelineCanvas() {
  const location = useLocation();
  const navigate = useNavigate();

  /* React Flow state */
  const [nodes, setNodes, onNodesChange] = useNodesState<BlockNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node<BlockNodeData> | null>(null);

  /* Session state */
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState<string>("New Pipeline");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true);

  /* Panel state */
  const [panelView, setPanelView] = useState<PanelView>("output");

  /* Results state */
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  /* Track if pipeline is being built step-by-step */
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildStep, setBuildStep] = useState(0);
  const [buildTotal, setBuildTotal] = useState(0);

  /* Custom blocks state */
  const [customBlocks, setCustomBlocks] = useState<CustomBlockDef[]>([]);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createDescription, setCreateDescription] = useState("");
  const [createHints, setCreateHints] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<CustomBlockDef | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  /* Chat state (persisted across panel switches) */
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant" | "system"; content: string }>>([
    {
      role: "assistant",
      content: "Hi! I'm your ML assistant. I can help you build pipelines, analyze data, download datasets, and suggest models. What would you like to do?"
    }
  ]);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);

  /* Data Inspector state */
  const [inspectorFilePath, setInspectorFilePath] = useState<string | null>(null);

  /* Fetch custom blocks on mount */
  useEffect(() => {
    fetch("http://localhost:8000/llm/custom-blocks")
      .then((r) => r.json())
      .then((data) => setCustomBlocks(Array.isArray(data) ? data : []))
      .catch(() => setCustomBlocks([]));
  }, []);

  /* Close dropdown on click-outside */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as HTMLElement)) {
        setOpenCategory(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* Load initial state from analysis flow or latest session */
  useEffect(() => {
    const state = location.state as any;

    // Clear navigation state so refresh doesn't re-apply
    if (state) {
      window.history.replaceState({}, document.title);
    }

    // "Model Your Own ML" → fresh empty canvas
    if (state?.freshStart) {
      isInitialLoadRef.current = true;
      setNodes([]);
      setEdges([]);
      setCurrentSessionId(null);
      setSessionName("New Pipeline");
      setTimeout(() => { isInitialLoadRef.current = false; }, 300);
      return;
    }

    // Navigated from analysis page → build pipeline step by step
    if (state?.initialNodes && state?.initialEdges) {
      isInitialLoadRef.current = true;
      setSessionName("AI-Assisted Pipeline");
      animatePipelineBuild(state.initialNodes, state.initialEdges);
      return;
    }

    // Default: load latest session
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

  /* Animate pipeline blocks appearing one by one */
  const animatePipelineBuild = (
    targetNodes: any[],
    targetEdges: any[]
  ) => {
    setIsBuilding(true);
    setBuildTotal(targetNodes.length);
    setBuildStep(0);
    setNodes([]);
    setEdges([]);

    let step = 0;

    const addNext = () => {
      if (step >= targetNodes.length) {
        // All blocks placed — done
        setIsBuilding(false);
        isInitialLoadRef.current = false;
        return;
      }

      const node = targetNodes[step];
      step++;
      setBuildStep(step);

      // Add the node
      setNodes((prev) => [...prev, node]);

      // Add any edge that targets this node (source already placed)
      const newEdges = targetEdges.filter(
        (e: any) =>
          e.target === node.id &&
          targetNodes.slice(0, step).some((n: any) => n.id === e.source)
      );
      if (newEdges.length > 0) {
        setEdges((prev) => [...prev, ...newEdges]);
      }

      setTimeout(addNext, 700);
    };

    // Start after a brief pause
    setTimeout(addNext, 500);
  };

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
        sourceHandle: e.sourceHandle || undefined,
        targetHandle: e.targetHandle || undefined
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
      data: n.data as BlockNodeData
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
    setPanelView("output");

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
    setPanelView("output");

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
  const addBlock = (type: BlockType, customDef?: CustomBlockDef) => {
    const id = `${type}_${Date.now()}`;

    let params: Record<string, any> = {};

    if (type === "model") {
      params = {
        task: "classification",
        algorithm: "random_forest",
        n_estimators: 100,
        max_depth: 10
      };
    } else if (type === "split") {
      params = { test_size: 0.2 };
    } else if (type === "trainer") {
      params = { fit_params: {} };
    } else if (type === "voting_ensemble") {
      params = {
        task: "classification",
        algorithms: ["random_forest", "gradient_boosting", "knn"],
        voting: "hard"
      };
    } else if (type === "dataset_merge") {
      params = { strategy: "concat", join_key: "" };
    } else if (customDef) {
      // Build default params from custom block's param_schema
      for (const p of customDef.param_schema || []) {
        params[p.name] = p.default ?? "";
      }
    }

    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "block",
        position: { x: 100, y: 100 + nds.length * 120 },
        data: {
          label: (customDef?.name || type).toUpperCase(),
          blockType: type,
          params,
          ...(customDef ? { customDef } : {})
        }
      }
    ]);

    setOpenCategory(null);
  };

  /* Generate custom block via LLM */
  const generateCustomBlock = async () => {
    if (!createDescription.trim()) return;
    setIsGenerating(true);
    setGeneratedPreview(null);
    try {
      const res = await fetch("http://localhost:8000/llm/generate-block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: createDescription,
          param_hints: createHints || undefined
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error (${res.status})`);
      }
      const block: CustomBlockDef = await res.json();
      setGeneratedPreview(block);
      // Refresh the custom blocks list
      setCustomBlocks((prev) => [...prev, block]);
    } catch (err: any) {
      alert("Failed to generate block: " + (err.message || "Unknown error"));
    } finally {
      setIsGenerating(false);
    }
  };

  /* Delete a custom block (kept for future use) */
  const _deleteCustomBlock = async (blockId: string) => {
    try {
      await fetch(`http://localhost:8000/llm/custom-blocks/${blockId}`, { method: "DELETE" });
      setCustomBlocks((prev) => prev.filter((b) => b.id !== blockId));
    } catch {
      // ignore
    }
  };
  void _deleteCustomBlock; // Suppress unused warning

  /* Download dataset from URL (triggered by chat) */
  const handleDownloadDataset = async (url: string) => {
    try {
      const response = await downloadDataset({ url });

      if (response.status === "success") {
        // Add a dataset block with the downloaded file configured
        const id = `dataset_${Date.now()}`;
        setNodes((nds) => [
          ...nds,
          {
            id,
            type: "block",
            position: { x: 400, y: 100 + nds.length * 120 },
            data: {
              label: "DATASET",
              blockType: "dataset" as BlockType,
              params: {
                file_path: response.file_path,
                filename: response.filename,
                columns: response.columns,
                rows: response.rows,
                target: response.suggested_target || "",
                suggested_task: response.suggested_task || "classification",
                column_analysis: response.column_analysis
              }
            }
          }
        ]);
      }
      // For multi-file case from chat, the user can use the config panel
    } catch (err: any) {
      console.error("Dataset download failed:", err);
    }
  };

  /* Build a complete pipeline with auto-connections */
  const buildPipeline = (blocks: Array<{ type: string; params?: Record<string, any> }>) => {
    if (blocks.length === 0) return;

    const newNodes: Node<BlockNodeData>[] = [];
    const newEdges: Edge[] = [];
    const startY = 100 + nodes.length * 120;

    // Create nodes for each block
    blocks.forEach((block, index) => {
      const id = `${block.type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${index}`;
      newNodes.push({
        id,
        type: "block",
        position: { x: 400, y: startY + index * 120 },
        data: {
          label: block.type.toUpperCase().replace(/_/g, " "),
          blockType: block.type as BlockType,
          params: block.params || {}
        }
      });

      // Create edge to connect to previous block
      if (index > 0) {
        const prevId = newNodes[index - 1].id;
        newEdges.push({
          id: `edge_${prevId}_${id}`,
          source: prevId,
          target: id,
          type: "smoothstep",
          animated: true
        });
      }
    });

    // Add all nodes and edges at once
    setNodes((nds) => [...nds, ...newNodes]);
    setEdges((eds) => [...eds, ...newEdges]);
  };

  /* Build category structure */
  const BLOCK_CATEGORIES: BlockCategory[] = [
    {
      label: "Data",
      icon: "📁",
      items: [
        { type: "dataset", icon: "📁", label: "Dataset" },
        { type: "data_cleaner", icon: "🧹", label: "Clean Data" },
        { type: "dataset_merge", icon: "🔀", label: "Merge" }
      ]
    },
    {
      label: "Processing",
      icon: "⚙️",
      items: [
        { type: "split", icon: "✂️", label: "Split" },
        { type: "feature_pipeline", icon: "⚙️", label: "Preprocess" }
      ]
    },
    {
      label: "Models",
      icon: "🤖",
      items: [
        { type: "model", icon: "🤖", label: "Model" },
        { type: "voting_ensemble", icon: "🗳️", label: "Ensemble" }
      ]
    },
    {
      label: "Training",
      icon: "🎯",
      items: [
        { type: "trainer", icon: "🎯", label: "Trainer" },
        { type: "metrics", icon: "📊", label: "Metrics" }
      ]
    },
    ...(customBlocks.length > 0
      ? [{
          label: "Custom",
          icon: "🧩",
          items: customBlocks.map((cb) => ({
            type: cb.type_key,
            icon: cb.icon || "🧩",
            label: cb.name,
            customDef: cb
          }))
        }]
      : [])
  ];

  /* Delete block */
  const deleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) =>
      eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
    );
    setSelectedNode(null);
    setPanelView("output");
  };

  /* Run pipeline */
  const run = useCallback(async () => {
    if (nodes.length === 0) {
      alert("Add at least one block before running the pipeline.");
      return;
    }

    const pipeline = serializePipeline(nodes, edges);

    if (pipeline.length === 0) {
      alert("No connected blocks found. Connect blocks with edges before running.");
      return;
    }

    const datasetBlocks = pipeline.filter((b) => b.type === "dataset");

    if (datasetBlocks.length === 0) {
      alert("Pipeline must contain at least one Dataset block.");
      return;
    }

    for (const dsBlock of datasetBlocks) {
      if (!dsBlock.params?.file_path || !dsBlock.params?.target) {
        alert(`Dataset block '${dsBlock.id}' requires file_path and target.`);
        return;
      }
    }

    try {
      setIsRunning(true);
      setResult(null);
      setSelectedNode(null);
      setPanelView("output");

      const response = await runPipeline(pipeline);

      setResult({
        status: "success",
        metrics: response.metrics,
        predictions_preview: response.predictions_preview,
        comparison_preview: response.comparison_preview,
        logs: response.logs,
        model_id: response.model_id,
        model_filename: response.model_filename
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
          {/* Left: Block Palette with Category Dropdowns */}
          <div
            ref={toolbarRef}
            style={{
              background: "#fff",
              padding: "12px 16px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.12)"
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#6b7280", marginRight: "4px" }}>
              Add:
            </span>

            {BLOCK_CATEGORIES.map((cat) => (
              <div key={cat.label} style={{ position: "relative" }}>
                <button
                  onClick={() => setOpenCategory(openCategory === cat.label ? null : cat.label)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 12px",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: openCategory === cat.label ? "#1a1a2e" : "#374151",
                    background: openCategory === cat.label ? "#e5e7eb" : "#f3f4f6",
                    border: `1px solid ${openCategory === cat.label ? "#d1d5db" : "#e5e7eb"}`,
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.15s"
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = "#e5e7eb"; }}
                  onMouseOut={(e) => {
                    if (openCategory !== cat.label) e.currentTarget.style.background = "#f3f4f6";
                  }}
                >
                  <span>{cat.icon}</span>
                  {cat.label}
                  <span style={{ fontSize: "10px", color: "#9ca3af" }}>
                    {openCategory === cat.label ? "▲" : "▼"}
                  </span>
                </button>

                {/* Dropdown */}
                {openCategory === cat.label && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      left: 0,
                      background: "#fff",
                      borderRadius: "10px",
                      border: "1px solid #e5e7eb",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      minWidth: "160px",
                      zIndex: 50,
                      overflow: "hidden"
                    }}
                  >
                    {cat.items.map((item) => (
                      <button
                        key={item.type}
                        onClick={() => addBlock(item.type, item.customDef)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          width: "100%",
                          padding: "10px 14px",
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "#374151",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "background 0.1s"
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = "#f3f4f6"; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <span style={{ fontSize: "16px" }}>{item.icon}</span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* + Create Block button */}
            <button
              onClick={() => {
                setOpenCategory(null);
                setShowCreateModal(true);
                setCreateDescription("");
                setCreateHints("");
                setGeneratedPreview(null);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 12px",
                fontSize: "13px",
                fontWeight: 500,
                color: "#6366f1",
                background: "#eef2ff",
                border: "1px solid #c7d2fe",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.15s"
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = "#e0e7ff"; }}
              onMouseOut={(e) => { e.currentTarget.style.background = "#eef2ff"; }}
            >
              + Create
            </button>

            <div style={{ width: "1px", height: "28px", background: "#e5e7eb", margin: "0 4px" }} />

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
            {/* Home button */}
            <button
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
                cursor: "pointer"
              }}
              onClick={() => navigate("/")}
            >
              Home
            </button>

            <div style={{ width: "1px", height: "28px", background: "#e5e7eb" }} />

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

            {/* AI Assistant button */}
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 12px",
                fontSize: "13px",
                fontWeight: 500,
                color: panelView === "chat" ? "#7c3aed" : "#374151",
                background: panelView === "chat" ? "linear-gradient(135deg, #ede9fe 0%, #f3e8ff 100%)" : "#f3f4f6",
                border: `1px solid ${panelView === "chat" ? "#c4b5fd" : "#e5e7eb"}`,
                borderRadius: "8px",
                cursor: "pointer"
              }}
              onClick={() => setPanelView(panelView === "chat" ? "output" : "chat")}
            >
              <span>*</span>
              AI Assistant
            </button>

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
              onClick={() => setPanelView(panelView === "sessions" ? "output" : "sessions")}
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
                  setPanelView("output");
                }}
              >
                {result.status === "success" ? "✓ Results" : "⚠ Error"}
              </button>
            )}
          </div>
        </div>

        {/* Building overlay */}
        {isBuilding && (
          <div style={{
            position: "absolute",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 20,
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "#fff",
            padding: "14px 28px",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            boxShadow: "0 8px 32px rgba(102, 126, 234, 0.4)",
            fontSize: "14px",
            fontWeight: 600
          }}>
            <div style={{
              width: "20px",
              height: "20px",
              border: "3px solid rgba(255,255,255,0.3)",
              borderTopColor: "#fff",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite"
            }} />
            AI is building your pipeline... Step {buildStep} of {buildTotal}
            <div style={{
              width: "80px",
              height: "6px",
              background: "rgba(255,255,255,0.2)",
              borderRadius: "3px",
              overflow: "hidden"
            }}>
              <div style={{
                width: `${buildTotal > 0 ? (buildStep / buildTotal) * 100 : 0}%`,
                height: "100%",
                background: "#fff",
                borderRadius: "3px",
                transition: "width 0.4s ease"
              }} />
            </div>
          </div>
        )}

        {/* React Flow */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={(_, edge) => {
            // Delete edge on click
            setEdges((eds) => eds.filter((e) => e.id !== edge.id));
          }}
          onPaneClick={() => {
            setSelectedNode(null);
            if (panelView === "config") {
              setPanelView("output");
            }
          }}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          nodesDraggable
          nodesConnectable
          elementsSelectable
          edgesFocusable
          deleteKeyCode={["Backspace", "Delete"]}
          defaultEdgeOptions={{
            style: { strokeWidth: 2, stroke: "#94a3b8" },
            type: "smoothstep",
            interactionWidth: 20
          }}
        >
          <Background color="#e5e7eb" gap={20} />
          <Controls />
        </ReactFlow>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>

      {/* Data Inspector Panel */}
      {inspectorFilePath && (
        <DataInspectorPanel
          filePath={inspectorFilePath}
          onClose={() => setInspectorFilePath(null)}
          onDataChanged={() => {
            // Refresh the dataset node that was inspected
            const datasetNode = nodes.find(
              (n) => n.data.blockType === "dataset" && n.data.params?.file_path === inspectorFilePath
            );
            if (datasetNode) {
              // Reload the dataset info to get updated columns/rows
              fetch(`http://localhost:8000/inspector/stats`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ file_path: inspectorFilePath })
              })
                .then((res) => res.json())
                .then((stats) => {
                  setNodes((nds) =>
                    nds.map((n) =>
                      n.id === datasetNode.id
                        ? {
                            ...n,
                            data: {
                              ...n.data,
                              params: {
                                ...n.data.params,
                                columns: stats.df_columns || stats.column_stats?.map((c: any) => c.name) || n.data.params.columns,
                                rows: stats.rows || n.data.params.rows
                              }
                            }
                          }
                        : n
                    )
                  );
                })
                .catch(() => {
                  // Ignore refresh errors
                });
            }
          }}
        />
      )}

      {/* Create Custom Block Modal */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              width: "520px",
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              padding: "28px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#1a1a2e" }}>
                  Create Custom Block
                </div>
                <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>
                  Describe what you want the block to do and AI will generate it
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "#9ca3af",
                  padding: "4px"
                }}
              >
                x
              </button>
            </div>

            {/* Description */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                What should this block do?
              </label>
              <textarea
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="e.g., A block that applies PCA dimensionality reduction to the features, keeping the top N components..."
                rows={4}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "13px",
                  resize: "vertical",
                  fontFamily: "inherit",
                  boxSizing: "border-box"
                }}
              />
            </div>

            {/* Parameter hints */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                Parameter hints (optional)
              </label>
              <input
                type="text"
                value={createHints}
                onChange={(e) => setCreateHints(e.target.value)}
                placeholder="e.g., n_components (number, default 5)"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "13px",
                  boxSizing: "border-box"
                }}
              />
            </div>

            {/* Generate button */}
            <button
              onClick={generateCustomBlock}
              disabled={isGenerating || !createDescription.trim()}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "none",
                fontWeight: 600,
                fontSize: "14px",
                cursor: isGenerating ? "not-allowed" : "pointer",
                color: "#fff",
                background: isGenerating
                  ? "#9ca3af"
                  : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                boxShadow: isGenerating ? "none" : "0 2px 8px rgba(99,102,241,0.4)",
                marginBottom: "20px"
              }}
            >
              {isGenerating ? "Generating..." : "Generate Block with AI"}
            </button>

            {/* Preview */}
            {generatedPreview && (
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  padding: "16px"
                }}
              >
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#1e1b4b", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "20px" }}>{generatedPreview.icon}</span>
                  {generatedPreview.name}
                  <span style={{
                    fontSize: "11px",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    background: generatedPreview.color + "20",
                    color: generatedPreview.color,
                    fontWeight: 500
                  }}>
                    {generatedPreview.type_key}
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "12px" }}>
                  {generatedPreview.description}
                </div>

                {generatedPreview.param_schema?.length > 0 && (
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Parameters:</div>
                    {generatedPreview.param_schema.map((p) => (
                      <div key={p.name} style={{ fontSize: "11px", color: "#6b7280", padding: "2px 0" }}>
                        <strong>{p.name}</strong> ({p.type}) - {p.description}
                        {p.default !== undefined && <span style={{ color: "#9ca3af" }}> [default: {String(p.default)}]</span>}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => {
                      addBlock(generatedPreview.type_key, generatedPreview);
                      setShowCreateModal(false);
                    }}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "8px",
                      border: "none",
                      fontWeight: 600,
                      fontSize: "13px",
                      cursor: "pointer",
                      color: "#fff",
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                    }}
                  >
                    Add to Canvas
                  </button>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      fontWeight: 500,
                      fontSize: "13px",
                      cursor: "pointer",
                      color: "#6b7280",
                      background: "#fff"
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RIGHT: Panel */}
      {panelView === "config" && selectedNode ? (
        <BlockConfigPanel
          node={selectedNode}
          onUpdate={updateNode}
          onDelete={deleteNode}
          onInspect={(filePath) => setInspectorFilePath(filePath)}
        />
      ) : panelView === "sessions" ? (
        <SessionPanel
          currentSessionId={currentSessionId}
          onLoadSession={loadSession}
          onNewSession={createNewSession}
        />
      ) : panelView === "chat" ? (
        <ChatPanel
          nodes={nodes}
          edges={edges}
          onAddBlock={(type, params) => {
            const id = `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            setNodes((nds) => [
              ...nds,
              {
                id,
                type: "block",
                position: { x: 400, y: 100 + nds.length * 120 },
                data: {
                  label: type.toUpperCase().replace(/_/g, " "),
                  blockType: type as BlockType,
                  params: params || {}
                }
              }
            ]);
          }}
          onBuildPipeline={buildPipeline}
          onRunPipeline={run}
          onDownloadDataset={handleDownloadDataset}
          datasetFilePath={
            nodes.find((n) => n.data.blockType === "dataset")?.data.params?.file_path
          }
          targetColumn={
            nodes.find((n) => n.data.blockType === "dataset")?.data.params?.target
          }
          messages={chatMessages}
          setMessages={setChatMessages}
          chatSessionId={chatSessionId}
          setChatSessionId={setChatSessionId}
        />
      ) : (
        <OutputPanel
          nodes={nodes}
          edges={edges}
          result={result}
          isRunning={isRunning}
          onUpdateNodes={(updater) => setNodes(updater as any)}
        />
      )}
    </div>
  );
}
