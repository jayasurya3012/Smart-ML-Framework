import { useState, useEffect, useCallback } from "react";
import type { Node, Edge } from "reactflow";
import { getModelDownloadUrl } from "../services/api";

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

interface Props {
  nodes: Node[];
  edges: Edge[];
  result: PipelineResult | null;
  isRunning: boolean;
  onUpdateNodes: (updater: (nodes: Node[]) => Node[]) => void;
}

type TabType = "results" | "code";

const styles = {
  container: {
    width: "420px",
    height: "100vh",
    borderLeft: "1px solid #e0e0e0",
    background: "#fff",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden"
  },
  tabs: {
    display: "flex",
    borderBottom: "1px solid #e5e7eb",
    background: "#f9fafb"
  },
  tab: {
    flex: 1,
    padding: "14px 20px",
    fontSize: "14px",
    fontWeight: 500,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "all 0.15s",
    borderBottom: "2px solid transparent",
    color: "#6b7280"
  },
  tabActive: {
    color: "#3b82f6",
    borderBottomColor: "#3b82f6",
    background: "#fff"
  },
  content: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column" as const
  },
  // Results styles
  resultsContainer: {
    flex: 1,
    overflow: "auto",
    padding: "20px"
  },
  runningState: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    gap: "16px"
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid #e5e7eb",
    borderTopColor: "#3b82f6",
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
  },
  successBanner: {
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "#fff",
    padding: "16px 20px",
    borderRadius: "12px",
    marginBottom: "20px"
  },
  errorBanner: {
    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    color: "#fff",
    padding: "16px 20px",
    borderRadius: "12px",
    marginBottom: "20px"
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginBottom: "20px"
  },
  metricCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "14px"
  },
  metricLabel: {
    fontSize: "12px",
    color: "#64748b",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    marginBottom: "4px"
  },
  metricValue: {
    fontSize: "24px",
    fontWeight: 700,
    color: "#0f172a"
  },
  predictionsSection: {
    marginTop: "16px"
  },
  sectionTitle: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#374151",
    marginBottom: "10px"
  },
  predictionChips: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "8px"
  },
  predictionChip: {
    background: "#e0e7ff",
    color: "#3730a3",
    padding: "6px 12px",
    borderRadius: "16px",
    fontSize: "13px",
    fontWeight: 500
  },
  comparisonTable: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "13px"
  },
  tableHeader: {
    background: "#f8fafc",
    borderBottom: "2px solid #e2e8f0"
  },
  tableHeaderCell: {
    padding: "10px 12px",
    textAlign: "left" as const,
    fontWeight: 600,
    color: "#475569",
    fontSize: "12px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px"
  },
  tableRow: {
    borderBottom: "1px solid #f1f5f9"
  },
  tableRowMatch: {
    background: "#f0fdf4"
  },
  tableRowMismatch: {
    background: "#fef2f2"
  },
  tableCell: {
    padding: "10px 12px",
    color: "#334155"
  },
  indexCell: {
    color: "#94a3b8",
    fontWeight: 500,
    width: "40px"
  },
  matchBadge: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "10px",
    fontSize: "11px",
    fontWeight: 600
  },
  exportSection: {
    marginTop: "20px",
    padding: "16px",
    background: "linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%)",
    border: "1px solid #a7f3d0",
    borderRadius: "12px"
  },
  exportTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#065f46",
    marginBottom: "8px",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  exportInfo: {
    fontSize: "12px",
    color: "#047857",
    marginBottom: "12px"
  },
  exportButtons: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap" as const
  },
  exportButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 16px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#fff",
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    textDecoration: "none",
    boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)"
  },
  deployButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 16px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#fff",
    background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)"
  },
  apiEndpoint: {
    marginTop: "12px",
    padding: "10px 12px",
    background: "#1e1e2e",
    borderRadius: "6px",
    fontFamily: "'Fira Code', monospace",
    fontSize: "11px",
    color: "#a6e3a1",
    overflowX: "auto" as const
  },
  emptyState: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "#6b7280",
    textAlign: "center" as const,
    padding: "40px"
  },
  emptyIcon: {
    fontSize: "48px",
    marginBottom: "16px",
    opacity: 0.5
  },
  // Code styles
  codeContainer: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column" as const,
    background: "#1e1e2e"
  },
  codeToolbar: {
    display: "flex",
    gap: "8px",
    padding: "10px 16px",
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
    cursor: "pointer"
  },
  syncBadge: {
    fontSize: "10px",
    padding: "2px 8px",
    borderRadius: "10px",
    fontWeight: 500,
    marginLeft: "8px"
  },
  textarea: {
    flex: 1,
    width: "100%",
    padding: "16px",
    fontFamily: "'Fira Code', 'Consolas', monospace",
    fontSize: "12px",
    lineHeight: "1.6",
    color: "#cdd6f4",
    background: "#1e1e2e",
    border: "none",
    outline: "none",
    resize: "none" as const,
    whiteSpace: "pre" as const,
    overflow: "auto"
  },
  statusBar: {
    padding: "6px 16px",
    borderTop: "1px solid #313244",
    background: "#181825",
    fontSize: "10px",
    color: "#6c7086",
    display: "flex",
    justifyContent: "space-between"
  }
};

function generatePythonCode(nodes: Node[], edges: Edge[]): string {
  if (nodes.length === 0) return "";

  const inputsMap: Record<string, string[]> = {};
  for (const edge of edges) {
    if (!inputsMap[edge.target]) inputsMap[edge.target] = [];
    inputsMap[edge.target].push(edge.source);
  }

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const visited = new Set<string>();
  const sorted: Node[] = [];

  function visit(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    for (const inputId of inputsMap[nodeId] || []) visit(inputId);
    const node = nodeMap.get(nodeId);
    if (node) sorted.push(node);
  }

  nodes.forEach(n => visit(n.id));

  const lines: string[] = [];
  lines.push("# ==========================================");
  lines.push("# ML Pipeline - Auto-generated Python Code");
  lines.push("# Edit CONFIG values to update blocks");
  lines.push("# ==========================================");
  lines.push("");
  lines.push("import pandas as pd");
  lines.push("from sklearn.model_selection import train_test_split");
  lines.push("from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor");
  lines.push("from sklearn.ensemble import VotingClassifier, VotingRegressor");
  lines.push("from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score");
  lines.push("from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score");
  lines.push("");

  let taskType = "classification";

  for (const node of sorted) {
    const { blockType, params } = node.data;

    switch (blockType) {
      case "dataset": {
        lines.push("# === DATASET CONFIG ===");
        lines.push(`FILE_PATH = "${params?.file_path || "path/to/data.csv"}"`);
        lines.push(`TARGET_COLUMN = "${params?.target || "target"}"`);
        lines.push("");
        lines.push("df = pd.read_csv(FILE_PATH)");
        lines.push("X = df.drop(columns=[TARGET_COLUMN])");
        lines.push("y = df[TARGET_COLUMN]");
        lines.push('print(f"Loaded {len(df)} rows")');
        lines.push("");
        break;
      }
      case "split": {
        lines.push("# === SPLIT CONFIG ===");
        lines.push(`TEST_SIZE = ${params?.test_size ?? 0.2}`);
        lines.push("");
        lines.push("X_train, X_test, y_train, y_test = train_test_split(");
        lines.push("    X, y, test_size=TEST_SIZE, random_state=42)");
        lines.push("");
        break;
      }
      case "dataset_merge": {
        const strategy = params?.strategy || "concat";
        lines.push("# === MERGE DATASETS ===");
        if (strategy === "concat") {
          lines.push("# Concatenate multiple DataFrames vertically");
          lines.push("# df = pd.concat([df1, df2, ...], ignore_index=True)");
          lines.push("# X = df.drop(columns=[TARGET_COLUMN])");
          lines.push("# y = df[TARGET_COLUMN]");
        } else {
          const joinKey = params?.join_key || "id";
          lines.push(`JOIN_KEY = "${joinKey}"`);
          lines.push("# Merge DataFrames on key column");
          lines.push("# df = pd.merge(df1, df2, on=JOIN_KEY, how='inner')");
          lines.push("# X = df.drop(columns=[TARGET_COLUMN])");
          lines.push("# y = df[TARGET_COLUMN]");
        }
        lines.push("");
        break;
      }
      case "feature_pipeline": {
        lines.push("# === FEATURE PREPROCESSING ===");
        lines.push("from sklearn.preprocessing import StandardScaler, OneHotEncoder");
        lines.push("from sklearn.compose import ColumnTransformer");
        lines.push("");
        lines.push("num_cols = X_train.select_dtypes(include='number').columns");
        lines.push("cat_cols = X_train.select_dtypes(exclude='number').columns");
        lines.push("preprocessor = ColumnTransformer([");
        lines.push("    ('num', StandardScaler(), num_cols),");
        lines.push("    ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), cat_cols)");
        lines.push("])");
        lines.push("X_train = preprocessor.fit_transform(X_train)");
        lines.push("X_test = preprocessor.transform(X_test)");
        lines.push("");
        break;
      }
      case "model": {
        taskType = params?.task || "classification";
        const algo = params?.algorithm || "random_forest";
        const cls = taskType === "classification" ? "RandomForestClassifier" : "RandomForestRegressor";
        lines.push("# === MODEL CONFIG ===");
        lines.push(`TASK_TYPE = "${taskType}"`);
        lines.push(`ALGORITHM = "${algo}"`);
        lines.push(`N_ESTIMATORS = ${params?.n_estimators ?? 100}`);
        lines.push(`MAX_DEPTH = ${params?.max_depth ?? 10}`);
        lines.push("");
        lines.push(`model = ${cls}(`);
        lines.push("    n_estimators=N_ESTIMATORS,");
        lines.push("    max_depth=MAX_DEPTH,");
        lines.push("    random_state=42)");
        lines.push("");
        break;
      }
      case "voting_ensemble": {
        taskType = params?.task || "classification";
        const algos: string[] = params?.algorithms || ["random_forest", "gradient_boosting", "knn"];
        const voting = params?.voting || "hard";
        lines.push("# === VOTING ENSEMBLE CONFIG ===");
        lines.push(`TASK_TYPE = "${taskType}"`);
        lines.push(`VOTING = "${voting}"`);
        lines.push("");
        lines.push("# Define estimators for ensemble");
        lines.push("estimators = [");
        for (const algo of algos) {
          lines.push(`    ("${algo}", ...),  # Configure ${algo.replace(/_/g, " ")}`);
        }
        lines.push("]");
        lines.push("");
        if (taskType === "classification") {
          lines.push(`model = VotingClassifier(estimators=estimators, voting=VOTING)`);
        } else {
          lines.push("model = VotingRegressor(estimators=estimators)");
        }
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
        if (taskType === "classification") {
          lines.push("print(f'Accuracy: {accuracy_score(y_test, y_pred):.4f}')");
        } else {
          lines.push("print(f'R2: {r2_score(y_test, y_pred):.4f}')");
        }
        lines.push("");
        break;
      }
    }
  }

  return lines.join("\n");
}

function parseCodeToConfig(code: string): Record<string, Record<string, any>> {
  const config: Record<string, Record<string, any>> = { dataset: {}, split: {}, model: {} };

  const filePathMatch = code.match(/FILE_PATH\s*=\s*["']([^"']+)["']/);
  if (filePathMatch) config.dataset.file_path = filePathMatch[1];

  const targetMatch = code.match(/TARGET_COLUMN\s*=\s*["']([^"']+)["']/);
  if (targetMatch) config.dataset.target = targetMatch[1];

  const testSizeMatch = code.match(/TEST_SIZE\s*=\s*([\d.]+)/);
  if (testSizeMatch) config.split.test_size = parseFloat(testSizeMatch[1]);

  const taskMatch = code.match(/TASK_TYPE\s*=\s*["']([^"']+)["']/);
  if (taskMatch) config.model.task = taskMatch[1];

  const nEstMatch = code.match(/N_ESTIMATORS\s*=\s*(\d+)/);
  if (nEstMatch) config.model.n_estimators = parseInt(nEstMatch[1]);

  const maxDepthMatch = code.match(/MAX_DEPTH\s*=\s*(\d+)/);
  if (maxDepthMatch) config.model.max_depth = parseInt(maxDepthMatch[1]);

  return config;
}

const METRIC_LABELS: Record<string, string> = {
  accuracy: "Accuracy",
  precision: "Precision",
  recall: "Recall",
  f1_score: "F1 Score",
  mse: "Mean Squared Error",
  rmse: "Root MSE",
  mae: "Mean Absolute Error",
  r2_score: "R² Score"
};

const METRIC_COLORS: Record<string, string> = {
  accuracy: "#10b981",
  precision: "#3b82f6",
  recall: "#8b5cf6",
  f1_score: "#f59e0b",
  r2_score: "#10b981",
  mse: "#ef4444",
  rmse: "#ef4444",
  mae: "#f97316"
};

function formatMetricValue(key: string, value: number): string {
  const k = key.toLowerCase();
  // Percentage metrics (0-1 scale)
  if (k.includes("accuracy") || k.includes("precision") ||
      k.includes("recall") || k.includes("f1") || k.includes("r2")) {
    return `${(value * 100).toFixed(1)}%`;
  }
  // Error metrics - show fewer decimals for large values
  if (value > 1000) return value.toFixed(0);
  if (value > 100) return value.toFixed(1);
  if (value > 1) return value.toFixed(2);
  return value.toFixed(4);
}

function getMetricLabel(key: string): string {
  return METRIC_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function getMetricColor(key: string): string {
  return METRIC_COLORS[key] || "#64748b";
}

export default function OutputPanel({ nodes, edges, result, isRunning, onUpdateNodes }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("results");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"synced" | "modified">("synced");
  const [lastGenerated, setLastGenerated] = useState("");

  useEffect(() => {
    const generated = generatePythonCode(nodes, edges);
    setLastGenerated(generated);
    setCode(generated);
    setSyncStatus("synced");
  }, [nodes, edges]);

  // Switch to results when pipeline finishes
  useEffect(() => {
    if (result && !isRunning) {
      setActiveTab("results");
    }
  }, [result, isRunning]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyChanges = useCallback(() => {
    const config = parseCodeToConfig(code);
    onUpdateNodes((currentNodes) =>
      currentNodes.map((node) => {
        const bt = node.data.blockType;
        if (bt === "dataset" && Object.keys(config.dataset).length > 0) {
          return { ...node, data: { ...node.data, params: { ...node.data.params, ...config.dataset } } };
        }
        if (bt === "split" && Object.keys(config.split).length > 0) {
          return { ...node, data: { ...node.data, params: { ...node.data.params, ...config.split } } };
        }
        if (bt === "model" && Object.keys(config.model).length > 0) {
          return { ...node, data: { ...node.data, params: { ...node.data.params, ...config.model } } };
        }
        return node;
      })
    );
    setSyncStatus("synced");
  }, [code, onUpdateNodes]);

  return (
    <div style={styles.container}>
      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(activeTab === "results" ? styles.tabActive : {}) }}
          onClick={() => setActiveTab("results")}
        >
          <span>📊</span>
          Results
          {result && (
            <span style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: result.status === "success" ? "#10b981" : "#ef4444"
            }} />
          )}
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === "code" ? styles.tabActive : {}) }}
          onClick={() => setActiveTab("code")}
        >
          <span>{"</>"}</span>
          Code
          {syncStatus === "modified" && (
            <span style={{
              ...styles.syncBadge,
              background: "#f59e0b",
              color: "#fff"
            }}>
              Modified
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {activeTab === "results" ? (
          <div style={styles.resultsContainer}>
            {isRunning ? (
              <div style={styles.runningState}>
                <div style={styles.spinner} />
                <div style={{ fontSize: "14px", fontWeight: 500 }}>Running pipeline...</div>
              </div>
            ) : result ? (
              <>
                {result.status === "success" ? (
                  <div style={styles.successBanner}>
                    <div style={{ fontSize: "16px", fontWeight: 600 }}>Pipeline Complete</div>
                    <div style={{ fontSize: "13px", opacity: 0.9, marginTop: "4px" }}>
                      All blocks executed successfully
                    </div>
                  </div>
                ) : (
                  <div style={styles.errorBanner}>
                    <div style={{ fontSize: "16px", fontWeight: 600 }}>Execution Failed</div>
                    <div style={{ fontSize: "13px", opacity: 0.9, marginTop: "4px" }}>
                      {result.error}
                    </div>
                  </div>
                )}

                {result.metrics && Object.keys(result.metrics).length > 0 && (
                  <>
                    <div style={styles.sectionTitle}>Performance Metrics</div>
                    <div style={styles.metricsGrid}>
                      {Object.entries(result.metrics).map(([key, value]) => (
                        <div key={key} style={{
                          ...styles.metricCard,
                          borderLeft: `4px solid ${getMetricColor(key)}`
                        }}>
                          <div style={styles.metricLabel}>{getMetricLabel(key)}</div>
                          <div style={{
                            ...styles.metricValue,
                            color: getMetricColor(key)
                          }}>
                            {formatMetricValue(key, value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {result.comparison_preview && result.comparison_preview.length > 0 && (
                  <div style={styles.predictionsSection}>
                    <div style={styles.sectionTitle}>
                      Predictions vs Actual ({result.comparison_preview.length} samples)
                    </div>
                    <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                      <table style={styles.comparisonTable}>
                        <thead style={styles.tableHeader}>
                          <tr>
                            <th style={{ ...styles.tableHeaderCell, width: "40px" }}>#</th>
                            <th style={styles.tableHeaderCell}>Actual</th>
                            <th style={styles.tableHeaderCell}>Predicted</th>
                            <th style={{ ...styles.tableHeaderCell, width: "70px" }}>Match</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.comparison_preview.map((item, i) => {
                            const isMatch = String(item.actual) === String(item.predicted) ||
                              (typeof item.actual === "number" && typeof item.predicted === "number" &&
                               Math.abs(item.actual - item.predicted) < 0.01);
                            return (
                              <tr key={i} style={{
                                ...styles.tableRow,
                                ...(isMatch ? styles.tableRowMatch : styles.tableRowMismatch)
                              }}>
                                <td style={{ ...styles.tableCell, ...styles.indexCell }}>{i + 1}</td>
                                <td style={styles.tableCell}>
                                  <strong>{typeof item.actual === "number" ? item.actual.toFixed(2) : item.actual}</strong>
                                </td>
                                <td style={styles.tableCell}>
                                  {typeof item.predicted === "number" ? item.predicted.toFixed(2) : item.predicted}
                                </td>
                                <td style={styles.tableCell}>
                                  <span style={{
                                    ...styles.matchBadge,
                                    background: isMatch ? "#dcfce7" : "#fee2e2",
                                    color: isMatch ? "#166534" : "#991b1b"
                                  }}>
                                    {isMatch ? "✓" : "✗"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Model Export Section */}
                {result.status === "success" && result.model_filename && (
                  <div style={styles.exportSection}>
                    <div style={styles.exportTitle}>
                      <span>📦</span>
                      Model Export & Deployment
                    </div>
                    <div style={styles.exportInfo}>
                      Your trained model has been saved and is ready for export or deployment.
                    </div>
                    <div style={styles.exportButtons}>
                      <a
                        href={getModelDownloadUrl(result.model_filename)}
                        download
                        style={styles.exportButton}
                      >
                        <span>⬇</span>
                        Download Model
                      </a>
                    </div>

                    <div style={{ marginTop: "16px" }}>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "#065f46", marginBottom: "6px" }}>
                        Model File
                      </div>
                      <div style={{
                        padding: "8px 12px",
                        background: "#fff",
                        border: "1px solid #d1fae5",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontFamily: "'Fira Code', monospace",
                        color: "#047857"
                      }}>
                        {result.model_filename}
                      </div>
                    </div>

                    <div style={{ marginTop: "12px" }}>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "#065f46", marginBottom: "6px" }}>
                        Prediction API Endpoint
                      </div>
                      <div style={styles.apiEndpoint}>
                        <div style={{ color: "#89b4fa" }}>POST</div>
                        <div style={{ marginTop: "4px" }}>
                          http://localhost:8000/models/{result.model_filename}/predict
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: "12px" }}>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "#065f46", marginBottom: "6px" }}>
                        Example Request
                      </div>
                      <div style={styles.apiEndpoint}>
                        <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{`{
  "features": [
    {"feature1": 1.0, "feature2": 2.0, ...}
  ]
}`}</pre>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>▶</div>
                <div style={{ fontSize: "14px", fontWeight: 500, marginBottom: "8px" }}>
                  Ready to run
                </div>
                <div style={{ fontSize: "13px" }}>
                  Click "Run" to execute your pipeline
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={styles.codeContainer}>
            <div style={styles.codeToolbar}>
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
                    style={{ ...styles.toolbarButton, background: "#89b4fa", color: "#1e1e2e" }}
                    onClick={handleApplyChanges}
                  >
                    Apply to Blocks
                  </button>
                  <button
                    style={{ ...styles.toolbarButton, background: "#45475a" }}
                    onClick={() => { setCode(lastGenerated); setSyncStatus("synced"); }}
                  >
                    Reset
                  </button>
                </>
              )}
            </div>

            <textarea
              style={styles.textarea}
              value={code}
              onChange={(e) => { setCode(e.target.value); setSyncStatus("modified"); }}
              spellCheck={false}
              placeholder="Add blocks to generate code..."
            />

            <div style={styles.statusBar}>
              <span>{code.split("\n").length} lines</span>
              <span>
                {syncStatus === "modified" ? "Click 'Apply to Blocks' to sync" : "In sync"}
              </span>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
