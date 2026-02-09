import { Handle, Position, NodeResizer } from "reactflow";

const BLOCK_STYLES: Record<string, { icon: string; color: string; bgColor: string }> = {
  dataset: {
    icon: "📁",
    color: "#3b82f6",
    bgColor: "#eff6ff"
  },
  data_cleaner: {
    icon: "🧹",
    color: "#14b8a6",
    bgColor: "#f0fdfa"
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
  },
  feature_pipeline: {
    icon: "⚙️",
    color: "#06b6d4",
    bgColor: "#ecfeff"
  },
  voting_ensemble: {
    icon: "🗳️",
    color: "#d946ef",
    bgColor: "#fdf4ff"
  },
  dataset_merge: {
    icon: "🔀",
    color: "#0ea5e9",
    bgColor: "#f0f9ff"
  }
};

export default function BlockNode({ data, selected }: any) {
  const blockType = data.blockType || "dataset";

  // Use BLOCK_STYLES for built-in types, or dynamically build style from customDef
  const style = BLOCK_STYLES[blockType] || (data.customDef
    ? {
        icon: data.customDef.icon || "🧩",
        color: data.customDef.color || "#6366f1",
        bgColor: (data.customDef.color || "#6366f1") + "15"
      }
    : { icon: "🧩", color: "#6366f1", bgColor: "#eef2ff" });

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
            {data.customDef?.name || blockType.replace(/_/g, " ")}
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
                {(data.params?.algorithm || "random_forest").replace(/_/g, " ")}
              </span>
            </div>
          )}
          {blockType === "voting_ensemble" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span>
                {data.params?.task === "regression" ? "Regression" : "Classification"}
              </span>
              <span style={{ fontSize: "11px" }}>
                {(data.params?.algorithms || []).length} algorithms
              </span>
              {data.params?.algorithms?.length > 0 && (
                <span style={{ fontSize: "10px", color: "#9ca3af" }}>
                  {(data.params.algorithms as string[]).slice(0, 3).map((a: string) => a.replace(/_/g, " ")).join(", ")}
                  {data.params.algorithms.length > 3 ? "..." : ""}
                </span>
              )}
            </div>
          )}
          {blockType === "dataset_merge" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span>{data.params?.strategy === "join" ? "Join datasets" : "Concat datasets"}</span>
              {data.params?.strategy === "join" && data.params?.join_key && (
                <span style={{ fontSize: "11px" }}>
                  Key: <strong style={{ color: "#374151" }}>{data.params.join_key}</strong>
                </span>
              )}
            </div>
          )}
          {blockType === "data_cleaner" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span>
                {(data.params?.strategy || "impute_median").replace(/_/g, " ")}
              </span>
              {data.params?.handle_outliers && (
                <span style={{ fontSize: "11px" }}>+ outlier handling</span>
              )}
            </div>
          )}
          {blockType === "feature_pipeline" && <span>Scale + Encode</span>}
          {blockType === "trainer" && <span>Fit model</span>}
          {blockType === "metrics" && <span>Evaluate</span>}
          {/* Custom block content */}
          {!BLOCK_STYLES[blockType] && data.customDef && (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                {data.customDef.description?.slice(0, 40)}
                {data.customDef.description?.length > 40 ? "..." : ""}
              </span>
              {data.params && Object.keys(data.params).length > 0 && (
                <span style={{ fontSize: "10px", color: "#b0b8c4" }}>
                  {Object.entries(data.params).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(", ")}
                </span>
              )}
            </div>
          )}
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
