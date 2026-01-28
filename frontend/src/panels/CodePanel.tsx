import { useState, useEffect, useCallback } from "react";
import type { Node, Edge } from "reactflow";

interface Props {
  nodes: Node[];
  edges: Edge[];
  onUpdateNodes: (updater: (nodes: Node[]) => Node[]) => void;
}

const styles = {
  container: {
    width: "420px",
    height: "100vh",
    borderLeft: "1px solid #e0e0e0",
    background: "#1e1e2e",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden"
  },
  header: {
    padding: "16px 20px",
    borderBottom: "1px solid #313244",
    background: "#1e1e2e"
  },
  headerTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 600,
    color: "#cdd6f4",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  headerSubtitle: {
    fontSize: "12px",
    color: "#6c7086",
    marginTop: "4px"
  },
  toolbar: {
    display: "flex",
    gap: "8px",
    padding: "10px 20px",
    borderBottom: "1px solid #313244",
    background: "#181825",
    alignItems: "center"
  },
  toolbarButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: 500,
    color: "#cdd6f4",
    background: "#313244",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.15s"
  },
  syncBadge: {
    fontSize: "11px",
    padding: "3px 8px",
    borderRadius: "10px",
    fontWeight: 500
  },
  codeContainer: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column" as const
  },
  textarea: {
    flex: 1,
    width: "100%",
    padding: "16px 20px",
    fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
    fontSize: "13px",
    lineHeight: "1.6",
    color: "#cdd6f4",
    background: "#1e1e2e",
    border: "none",
    outline: "none",
    resize: "none" as const,
    whiteSpace: "pre" as const,
    overflowX: "auto" as const
  },
  emptyState: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "#6c7086",
    textAlign: "center" as const,
    padding: "40px"
  },
  emptyIcon: {
    fontSize: "48px",
    marginBottom: "16px",
    opacity: 0.5
  },
  statusBar: {
    padding: "8px 20px",
    borderTop: "1px solid #313244",
    background: "#181825",
    fontSize: "11px",
    color: "#6c7086",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  }
};

function generatePythonCode(nodes: Node[], edges: Edge[]): string {
  if (nodes.length === 0) {
    return "";
  }

  // Build input map from edges
  const inputsMap: Record<string, string[]> = {};
  for (const edge of edges) {
    if (!inputsMap[edge.target]) {
      inputsMap[edge.target] = [];
    }
    inputsMap[edge.target].push(edge.source);
  }

  // Sort nodes by dependency
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const visited = new Set<string>();
  const sorted: Node[] = [];

  function visit(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const inputs = inputsMap[nodeId] || [];
    for (const inputId of inputs) {
      visit(inputId);
    }
    const node = nodeMap.get(nodeId);
    if (node) sorted.push(node);
  }

  for (const node of nodes) {
    visit(node.id);
  }

  const lines: string[] = [];

  // Header
  lines.push("# ==========================================");
  lines.push("# ML Pipeline - Auto-generated Python Code");
  lines.push("# Edit values below to update the pipeline");
  lines.push("# ==========================================");
  lines.push("");
  lines.push("import pandas as pd");
  lines.push("from sklearn.model_selection import train_test_split");
  lines.push("from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor");
  lines.push("from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score");
  lines.push("from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score");
  lines.push("");

  let taskType = "classification";

  for (const node of sorted) {
    const { blockType, params } = node.data;

    switch (blockType) {
      case "dataset": {
        const filePath = params?.file_path || "path/to/data.csv";
        const target = params?.target || "target";
        lines.push("# === DATASET CONFIG ===");
        lines.push(`FILE_PATH = "${filePath}"`);
        lines.push(`TARGET_COLUMN = "${target}"`);
        lines.push("");
        lines.push("df = pd.read_csv(FILE_PATH)");
        lines.push("X = df.drop(columns=[TARGET_COLUMN])");
        lines.push("y = df[TARGET_COLUMN]");
        lines.push(`print(f"Loaded {len(df)} rows, {len(X.columns)} features")`);
        lines.push("");
        break;
      }

      case "split": {
        const testSize = params?.test_size ?? 0.2;
        lines.push("# === SPLIT CONFIG ===");
        lines.push(`TEST_SIZE = ${testSize}`);
        lines.push("");
        lines.push("X_train, X_test, y_train, y_test = train_test_split(");
        lines.push("    X, y, test_size=TEST_SIZE, random_state=42");
        lines.push(")");
        lines.push(`print(f"Train: {len(X_train)}, Test: {len(X_test)}")`);
        lines.push("");
        break;
      }

      case "model": {
        taskType = params?.task || "classification";
        const nEstimators = params?.n_estimators ?? 100;
        const maxDepth = params?.max_depth ?? 10;
        const modelClass = taskType === "classification" ? "RandomForestClassifier" : "RandomForestRegressor";

        lines.push("# === MODEL CONFIG ===");
        lines.push(`TASK_TYPE = "${taskType}"`);
        lines.push(`N_ESTIMATORS = ${nEstimators}`);
        lines.push(`MAX_DEPTH = ${maxDepth}`);
        lines.push("");
        lines.push(`model = ${modelClass}(`);
        lines.push("    n_estimators=N_ESTIMATORS,");
        lines.push("    max_depth=MAX_DEPTH,");
        lines.push("    random_state=42,");
        lines.push("    n_jobs=-1");
        lines.push(")");
        lines.push("");
        break;
      }

      case "trainer": {
        lines.push("# === TRAINING ===");
        lines.push("model.fit(X_train, y_train)");
        lines.push('print("Training complete!")');
        lines.push("");
        break;
      }

      case "metrics": {
        lines.push("# === EVALUATION ===");
        lines.push("y_pred = model.predict(X_test)");
        lines.push("");
        if (taskType === "classification") {
          lines.push("accuracy = accuracy_score(y_test, y_pred)");
          lines.push("precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)");
          lines.push("recall = recall_score(y_test, y_pred, average='weighted', zero_division=0)");
          lines.push("f1 = f1_score(y_test, y_pred, average='weighted', zero_division=0)");
          lines.push("");
          lines.push('print(f"Accuracy:  {accuracy:.4f}")');
          lines.push('print(f"Precision: {precision:.4f}")');
          lines.push('print(f"Recall:    {recall:.4f}")');
          lines.push('print(f"F1 Score:  {f1:.4f}")');
        } else {
          lines.push("mse = mean_squared_error(y_test, y_pred)");
          lines.push("mae = mean_absolute_error(y_test, y_pred)");
          lines.push("r2 = r2_score(y_test, y_pred)");
          lines.push("");
          lines.push('print(f"MSE: {mse:.4f}")');
          lines.push('print(f"MAE: {mae:.4f}")');
          lines.push('print(f"R2:  {r2:.4f}")');
        }
        lines.push("");
        break;
      }
    }
  }

  return lines.join("\n");
}

// Parse code and extract config values
function parseCodeToConfig(code: string): Record<string, Record<string, any>> {
  const config: Record<string, Record<string, any>> = {
    dataset: {},
    split: {},
    model: {}
  };

  // Parse FILE_PATH
  const filePathMatch = code.match(/FILE_PATH\s*=\s*["']([^"']+)["']/);
  if (filePathMatch) {
    config.dataset.file_path = filePathMatch[1];
  }

  // Parse TARGET_COLUMN
  const targetMatch = code.match(/TARGET_COLUMN\s*=\s*["']([^"']+)["']/);
  if (targetMatch) {
    config.dataset.target = targetMatch[1];
  }

  // Parse TEST_SIZE
  const testSizeMatch = code.match(/TEST_SIZE\s*=\s*([\d.]+)/);
  if (testSizeMatch) {
    config.split.test_size = parseFloat(testSizeMatch[1]);
  }

  // Parse TASK_TYPE
  const taskMatch = code.match(/TASK_TYPE\s*=\s*["']([^"']+)["']/);
  if (taskMatch) {
    config.model.task = taskMatch[1];
  }

  // Parse N_ESTIMATORS
  const nEstimatorsMatch = code.match(/N_ESTIMATORS\s*=\s*(\d+)/);
  if (nEstimatorsMatch) {
    config.model.n_estimators = parseInt(nEstimatorsMatch[1]);
  }

  // Parse MAX_DEPTH
  const maxDepthMatch = code.match(/MAX_DEPTH\s*=\s*(\d+)/);
  if (maxDepthMatch) {
    config.model.max_depth = parseInt(maxDepthMatch[1]);
  }

  return config;
}

export default function CodePanel({ nodes, edges, onUpdateNodes }: Props) {
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"synced" | "modified" | "error">("synced");
  const [lastGeneratedCode, setLastGeneratedCode] = useState("");

  // Generate code from nodes
  useEffect(() => {
    const generated = generatePythonCode(nodes, edges);
    setLastGeneratedCode(generated);
    setCode(generated);
    setSyncStatus("synced");
  }, [nodes, edges]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setSyncStatus("modified");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleApplyChanges = useCallback(() => {
    try {
      const config = parseCodeToConfig(code);

      onUpdateNodes((currentNodes) =>
        currentNodes.map((node) => {
          const blockType = node.data.blockType;

          if (blockType === "dataset" && Object.keys(config.dataset).length > 0) {
            return {
              ...node,
              data: {
                ...node.data,
                params: { ...node.data.params, ...config.dataset }
              }
            };
          }

          if (blockType === "split" && Object.keys(config.split).length > 0) {
            return {
              ...node,
              data: {
                ...node.data,
                params: { ...node.data.params, ...config.split }
              }
            };
          }

          if (blockType === "model" && Object.keys(config.model).length > 0) {
            return {
              ...node,
              data: {
                ...node.data,
                params: { ...node.data.params, ...config.model }
              }
            };
          }

          return node;
        })
      );

      setSyncStatus("synced");
    } catch (err) {
      console.error("Failed to parse code:", err);
      setSyncStatus("error");
    }
  }, [code, onUpdateNodes]);

  const handleReset = () => {
    setCode(lastGeneratedCode);
    setSyncStatus("synced");
  };

  if (nodes.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.headerTitle}>
            <span>{"</>"}</span>
            Generated Code
          </h3>
          <p style={styles.headerSubtitle}>
            Python code for your pipeline
          </p>
        </div>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>{"</>"}</div>
          <div style={{ fontSize: "14px", fontWeight: 500, marginBottom: "8px" }}>
            No blocks yet
          </div>
          <div style={{ fontSize: "13px" }}>
            Add blocks to see generated Python code
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.headerTitle}>
          <span>{"</>"}</span>
          Generated Code
          <span
            style={{
              ...styles.syncBadge,
              background: syncStatus === "synced" ? "#a6e3a1" : syncStatus === "modified" ? "#f9e2af" : "#f38ba8",
              color: "#1e1e2e"
            }}
          >
            {syncStatus === "synced" ? "Synced" : syncStatus === "modified" ? "Modified" : "Error"}
          </span>
        </h3>
        <p style={styles.headerSubtitle}>
          Edit CONFIG values, then click Apply to update blocks
        </p>
      </div>

      <div style={styles.toolbar}>
        <button
          style={{
            ...styles.toolbarButton,
            background: copied ? "#a6e3a1" : "#313244",
            color: copied ? "#1e1e2e" : "#cdd6f4"
          }}
          onClick={handleCopy}
        >
          {copied ? "Copied!" : "Copy"}
        </button>

        {syncStatus === "modified" && (
          <>
            <button
              style={{
                ...styles.toolbarButton,
                background: "#89b4fa",
                color: "#1e1e2e"
              }}
              onClick={handleApplyChanges}
            >
              Apply Changes
            </button>
            <button
              style={{
                ...styles.toolbarButton,
                background: "#45475a"
              }}
              onClick={handleReset}
            >
              Reset
            </button>
          </>
        )}

        <div style={{ marginLeft: "auto", fontSize: "11px", color: "#6c7086" }}>
          Python 3.x
        </div>
      </div>

      <div style={styles.codeContainer}>
        <textarea
          style={styles.textarea}
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          spellCheck={false}
        />
      </div>

      <div style={styles.statusBar}>
        <span>{code.split("\n").length} lines</span>
        <span>
          {syncStatus === "modified" && "Press 'Apply Changes' to sync with blocks"}
          {syncStatus === "synced" && "Code and blocks are in sync"}
          {syncStatus === "error" && "Could not parse code changes"}
        </span>
      </div>
    </div>
  );
}
