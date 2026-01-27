import { Handle, Position, NodeResizer } from "reactflow";

const BLOCK_STYLES: Record<string, { icon: string; color: string; bgColor: string }> = {
  dataset: {
    icon: "📁",
    color: "#3b82f6",
    bgColor: "#eff6ff"
  },
  split: {
    icon: "✂️",
    color: "#8b5cf6",
    bgColor: "#f5f3ff"
  },
  model: {
    icon: "🤖",
    color: "#10b981",
    bgColor: "#ecfdf5"
  },
  trainer: {
    icon: "🎯",
    color: "#f59e0b",
    bgColor: "#fffbeb"
  },
  metrics: {
    icon: "📊",
    color: "#ef4444",
    bgColor: "#fef2f2"
  }
};

export default function BlockNode({ data, selected }: any) {
  const blockType = data.blockType || "dataset";
  const style = BLOCK_STYLES[blockType] || BLOCK_STYLES.dataset;

  return (
    <div
      style={{
        minWidth: "140px",
        position: "relative"
      }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={140}
        minHeight={60}
        lineStyle={{ borderColor: style.color }}
        handleStyle={{ backgroundColor: style.color, borderColor: style.color }}
      />

      {/* Main Block */}
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          border: `2px solid ${selected ? style.color : "#e5e7eb"}`,
          boxShadow: selected
            ? `0 0 0 3px ${style.color}20, 0 4px 12px rgba(0,0,0,0.1)`
            : "0 2px 8px rgba(0,0,0,0.08)",
          overflow: "hidden",
          transition: "all 0.15s ease"
        }}
      >
        {/* Header */}
        <div
          style={{
            background: style.bgColor,
            padding: "10px 14px",
            borderBottom: `1px solid ${style.color}30`,
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <span style={{ fontSize: "16px" }}>{style.icon}</span>
          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: style.color,
              textTransform: "uppercase",
              letterSpacing: "0.5px"
            }}
          >
            {blockType}
          </span>
        </div>

        {/* Content */}
        <div
          style={{
            padding: "10px 14px",
            fontSize: "12px",
            color: "#6b7280"
          }}
        >
          {blockType === "dataset" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span style={{ color: "#9ca3af" }}>
                {data.params?.file_path
                  ? data.params.file_path.split("/").pop()?.slice(0, 20) || "File"
                  : "No file set"}
              </span>
              {data.params?.target && (
                <span style={{ fontSize: "11px" }}>
                  Target: <strong style={{ color: "#374151" }}>{data.params.target}</strong>
                </span>
              )}
            </div>
          )}
          {blockType === "split" && (
            <span>Test: {((data.params?.test_size ?? 0.2) * 100).toFixed(0)}%</span>
          )}
          {blockType === "model" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span>
                {data.params?.task === "regression" ? "Regression" : "Classification"}
              </span>
              <span style={{ fontSize: "11px" }}>
                Trees: {data.params?.n_estimators ?? 100}
              </span>
            </div>
          )}
          {blockType === "trainer" && <span>Fit model</span>}
          {blockType === "metrics" && <span>Evaluate</span>}
        </div>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: "12px",
          height: "12px",
          background: "#fff",
          border: `2px solid ${style.color}`,
          top: "-6px"
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          width: "12px",
          height: "12px",
          background: style.color,
          border: `2px solid ${style.color}`,
          bottom: "-6px"
        }}
      />
    </div>
  );
}
