import type  { Node } from "reactflow";

interface Props {
  node: Node | null;
  onUpdate: (updatedNode: Node) => void;
}

export default function BlockConfigPanel({ node, onUpdate }: Props) {
  if (!node) {
    return (
      <div style={{ padding: "12px", color: "#666" }}>
        Select a block to configure
      </div>
    );
  }

  const params = node.data.params || {};

  const updateParam = (key: string, value: any) => {
    onUpdate({
      ...node,
      data: {
        ...node.data,
        params: {
          ...params,
          [key]: value
        }
      }
    });
  };

  return (
    <div
      style={{
        width: "300px",
        height: "100vh",
        borderLeft: "1px solid #ddd",
        padding: "12px",
        background: "#fafafa"
      }}
    >
      <h3>{node.data.blockType.toUpperCase()} Block</h3>

      {node.data.blockType === "dataset" && (
        <>
          <label>File Path</label>
          <input
            type="text"
            value={params.file_path || ""}
            onChange={(e) => updateParam("file_path", e.target.value)}
          />

          <label>Target Column</label>
          <input
            type="text"
            value={params.target || ""}
            onChange={(e) => updateParam("target", e.target.value)}
          />
        </>
      )}

      {node.data.blockType === "split" && (
        <>
          <label>Test Size</label>
          <input
            type="number"
            step="0.1"
            value={params.test_size ?? 0.2}
            onChange={(e) =>
              updateParam("test_size", parseFloat(e.target.value))
            }
          />

          <label>
            <input
              type="checkbox"
              checked={params.stratify ?? true}
              onChange={(e) => updateParam("stratify", e.target.checked)}
            />
            Stratify
          </label>
        </>
      )}

      {node.data.blockType === "model" && (
        <>
          <label>n_estimators</label>
          <input
            type="number"
            value={params.hyperparams?.n_estimators ?? 100}
            onChange={(e) =>
              updateParam("hyperparams", {
                ...params.hyperparams,
                n_estimators: parseInt(e.target.value)
              })
            }
          />

          <label>max_depth</label>
          <input
            type="number"
            value={params.hyperparams?.max_depth ?? 10}
            onChange={(e) =>
              updateParam("hyperparams", {
                ...params.hyperparams,
                max_depth: parseInt(e.target.value)
              })
            }
          />
        </>
      )}
    </div>
  );
}
