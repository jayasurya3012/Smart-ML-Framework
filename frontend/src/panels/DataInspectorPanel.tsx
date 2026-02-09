import { useState, useEffect } from "react";
import { getDatasetStats, executeCode } from "../services/api";
import type { DatasetStatsResponse } from "../services/api";

interface Props {
  filePath: string;
  onClose: () => void;
  onDataChanged?: () => void;
}

type TabType = "preview" | "statistics" | "notebook";

interface NotebookCell {
  id: string;
  code: string;
  output: string;
  error?: string;
  isRunning: boolean;
  executionTime?: number;
}

const styles = {
  overlay: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000
  },
  container: {
    width: "95vw",
    height: "90vh",
    background: "#fff",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
  },
  header: {
    padding: "16px 24px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
  },
  headerTitle: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    color: "#fff"
  },
  closeButton: {
    padding: "8px 16px",
    background: "rgba(255,255,255,0.2)",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500
  },
  tabs: {
    display: "flex",
    gap: "0",
    borderBottom: "1px solid #e5e7eb",
    background: "#f9fafb"
  },
  tab: {
    padding: "12px 24px",
    background: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500,
    color: "#6b7280",
    transition: "all 0.15s"
  },
  tabActive: {
    color: "#667eea",
    borderBottomColor: "#667eea",
    background: "#fff"
  },
  content: {
    flex: 1,
    overflow: "auto",
    padding: "0"
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
    padding: "20px",
    borderBottom: "1px solid #e5e7eb"
  },
  statCard: {
    background: "#f9fafb",
    borderRadius: "12px",
    padding: "16px",
    textAlign: "center" as const
  },
  statValue: {
    fontSize: "24px",
    fontWeight: 700,
    color: "#1f2937"
  },
  statLabel: {
    fontSize: "12px",
    color: "#6b7280",
    marginTop: "4px"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "13px"
  },
  th: {
    padding: "12px 16px",
    background: "#f3f4f6",
    borderBottom: "1px solid #e5e7eb",
    textAlign: "left" as const,
    fontWeight: 600,
    color: "#374151",
    position: "sticky" as const,
    top: 0
  },
  td: {
    padding: "10px 16px",
    borderBottom: "1px solid #f3f4f6",
    color: "#4b5563"
  },
  tdMissing: {
    background: "#fef2f2",
    color: "#dc2626"
  },
  columnCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "12px"
  },
  columnHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px"
  },
  columnName: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#1f2937"
  },
  badge: {
    padding: "4px 8px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: 500
  },
  statsRow: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "16px",
    fontSize: "12px",
    color: "#6b7280"
  },
  notebook: {
    padding: "20px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
    height: "100%",
    overflow: "auto"
  },
  cell: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    overflow: "hidden"
  },
  cellHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 12px",
    background: "#f9fafb",
    borderBottom: "1px solid #e5e7eb"
  },
  codeArea: {
    width: "100%",
    minHeight: "100px",
    padding: "12px",
    border: "none",
    fontFamily: "monospace",
    fontSize: "13px",
    resize: "vertical" as const,
    outline: "none",
    background: "#1e1e1e",
    color: "#d4d4d4"
  },
  cellOutput: {
    padding: "12px",
    background: "#fafafa",
    borderTop: "1px solid #e5e7eb",
    fontFamily: "monospace",
    fontSize: "12px",
    whiteSpace: "pre-wrap" as const,
    maxHeight: "300px",
    overflow: "auto"
  },
  runButton: {
    padding: "6px 12px",
    background: "#10b981",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
    gap: "4px"
  },
  addCellButton: {
    padding: "12px",
    background: "#f3f4f6",
    border: "2px dashed #d1d5db",
    borderRadius: "12px",
    cursor: "pointer",
    fontSize: "14px",
    color: "#6b7280",
    textAlign: "center" as const
  },
  missingBar: {
    height: "4px",
    background: "#e5e7eb",
    borderRadius: "2px",
    overflow: "hidden",
    marginTop: "8px"
  },
  missingFill: {
    height: "100%",
    background: "#ef4444",
    borderRadius: "2px"
  }
};

export default function DataInspectorPanel({ filePath, onClose, onDataChanged }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("preview");
  const [stats, setStats] = useState<DatasetStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cells, setCells] = useState<NotebookCell[]>([
    { id: "1", code: "# Explore your data\nprint(df.head())\nprint(df.info())", output: "", isRunning: false }
  ]);

  useEffect(() => {
    loadStats();
  }, [filePath]);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDatasetStats(filePath);
      setStats(data);
    } catch (err: any) {
      setError(err.message || "Failed to load dataset statistics");
    } finally {
      setLoading(false);
    }
  };

  const runCell = async (cellId: string, saveChanges: boolean = false) => {
    const cell = cells.find((c) => c.id === cellId);
    if (!cell) return;

    setCells((prev) =>
      prev.map((c) => (c.id === cellId ? { ...c, isRunning: true, output: "", error: undefined } : c))
    );

    try {
      const result = await executeCode(filePath, cell.code, saveChanges);

      setCells((prev) =>
        prev.map((c) =>
          c.id === cellId
            ? {
                ...c,
                isRunning: false,
                output: result.output + (result.df_shape ? `\n[DataFrame shape: ${result.df_shape[0]} rows x ${result.df_shape[1]} cols]` : ""),
                error: result.error,
                executionTime: result.execution_time_ms
              }
            : c
        )
      );

      // Refresh stats if changes were saved
      if (saveChanges && result.success) {
        await loadStats();
        onDataChanged?.();
      }
    } catch (err: any) {
      setCells((prev) =>
        prev.map((c) =>
          c.id === cellId
            ? { ...c, isRunning: false, error: err.message }
            : c
        )
      );
    }
  };

  const addCell = () => {
    const newId = String(Date.now());
    setCells((prev) => [
      ...prev,
      { id: newId, code: "", output: "", isRunning: false }
    ]);
  };

  const updateCellCode = (cellId: string, code: string) => {
    setCells((prev) =>
      prev.map((c) => (c.id === cellId ? { ...c, code } : c))
    );
  };

  const deleteCell = (cellId: string) => {
    if (cells.length <= 1) return;
    setCells((prev) => prev.filter((c) => c.id !== cellId));
  };

  const getDtypeBadge = (dtype: string) => {
    if (dtype.includes("int") || dtype.includes("float")) {
      return { bg: "#dbeafe", color: "#1e40af", label: "numeric" };
    }
    if (dtype.includes("object") || dtype.includes("str")) {
      return { bg: "#fef3c7", color: "#92400e", label: "text" };
    }
    if (dtype.includes("bool")) {
      return { bg: "#d1fae5", color: "#065f46", label: "boolean" };
    }
    if (dtype.includes("datetime")) {
      return { bg: "#ede9fe", color: "#5b21b6", label: "datetime" };
    }
    return { bg: "#f3f4f6", color: "#374151", label: dtype };
  };

  const handleKeyDown = (e: React.KeyboardEvent, cellId: string) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      runCell(cellId, false);
    }
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      runCell(cellId, true);
    }
  };

  if (loading) {
    return (
      <div style={styles.overlay}>
        <div style={styles.container}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: "16px" }}>
            <div style={{ width: "40px", height: "40px", border: "4px solid #e5e7eb", borderTopColor: "#667eea", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            <span style={{ color: "#6b7280" }}>Loading dataset...</span>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.overlay}>
        <div style={{ ...styles.container, height: "auto", padding: "40px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>!</div>
          <h3 style={{ margin: "0 0 8px 0", color: "#dc2626" }}>Error Loading Dataset</h3>
          <p style={{ color: "#6b7280", margin: "0 0 24px 0" }}>{error}</p>
          <button onClick={onClose} style={{ ...styles.closeButton, background: "#667eea" }}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <span style={{ fontSize: "24px" }}>🔍</span>
            <div>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>
                Data Inspector
              </h2>
              <span style={{ fontSize: "13px", opacity: 0.9 }}>
                {stats?.filename}
              </span>
            </div>
          </div>
          <button style={styles.closeButton} onClick={onClose}>
            Close
          </button>
        </div>

        {/* Stats Overview */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats?.rows.toLocaleString()}</div>
            <div style={styles.statLabel}>Rows</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats?.columns}</div>
            <div style={styles.statLabel}>Columns</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statValue, color: Object.keys(stats?.missing_summary || {}).length > 0 ? "#f59e0b" : "#10b981" }}>
              {Object.values(stats?.missing_summary || {}).reduce((a, b) => a + b, 0).toLocaleString()}
            </div>
            <div style={styles.statLabel}>Missing Values</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats?.memory_mb} MB</div>
            <div style={styles.statLabel}>Memory</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(activeTab === "preview" ? styles.tabActive : {}) }}
            onClick={() => setActiveTab("preview")}
          >
            Data Preview
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === "statistics" ? styles.tabActive : {}) }}
            onClick={() => setActiveTab("statistics")}
          >
            Column Statistics
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === "notebook" ? styles.tabActive : {}) }}
            onClick={() => setActiveTab("notebook")}
          >
            Code Notebook
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Preview Tab */}
          {activeTab === "preview" && stats && (
            <div style={{ overflow: "auto", height: "100%" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, width: "50px" }}>#</th>
                    {stats.column_stats.map((col) => (
                      <th key={col.name} style={styles.th}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span>{col.name}</span>
                          <span style={{ fontSize: "10px", fontWeight: 400, color: "#9ca3af" }}>
                            {col.dtype}
                            {col.missing > 0 && ` (${col.missing_pct}% missing)`}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.preview.map((row, i) => (
                    <tr key={i}>
                      <td style={{ ...styles.td, color: "#9ca3af", fontSize: "11px" }}>{i + 1}</td>
                      {stats.column_stats.map((col) => {
                        const value = row[col.name];
                        const isMissing = value === null || value === undefined;
                        return (
                          <td
                            key={col.name}
                            style={{
                              ...styles.td,
                              ...(isMissing ? styles.tdMissing : {})
                            }}
                          >
                            {isMissing ? "null" : String(value).slice(0, 50)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === "statistics" && stats && (
            <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
              {stats.column_stats.map((col) => {
                const badge = getDtypeBadge(col.dtype);
                return (
                  <div key={col.name} style={styles.columnCard}>
                    <div style={styles.columnHeader}>
                      <span style={styles.columnName}>{col.name}</span>
                      <span style={{ ...styles.badge, background: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                    </div>

                    {/* Missing value bar */}
                    {col.missing > 0 && (
                      <div style={{ marginBottom: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                          <span style={{ color: "#ef4444" }}>Missing: {col.missing} ({col.missing_pct}%)</span>
                          <span style={{ color: "#6b7280" }}>Present: {col.count}</span>
                        </div>
                        <div style={styles.missingBar}>
                          <div style={{ ...styles.missingFill, width: `${col.missing_pct}%` }} />
                        </div>
                      </div>
                    )}

                    <div style={styles.statsRow}>
                      <span>Unique: <strong>{col.unique}</strong></span>
                      {col.mean !== undefined && col.mean !== null && (
                        <>
                          <span>Mean: <strong>{col.mean}</strong></span>
                          <span>Std: <strong>{col.std}</strong></span>
                        </>
                      )}
                      {col.min !== undefined && col.min !== null && (
                        <>
                          <span>Min: <strong>{col.min}</strong></span>
                          <span>Max: <strong>{col.max}</strong></span>
                        </>
                      )}
                      {col.q50 !== undefined && col.q50 !== null && (
                        <span>Median: <strong>{col.q50}</strong></span>
                      )}
                    </div>

                    {/* Top values for categorical */}
                    {col.top_values && col.top_values.length > 0 && (
                      <div style={{ marginTop: "12px" }}>
                        <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "6px" }}>Top Values:</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {col.top_values.map((v, i) => (
                            <span
                              key={i}
                              style={{
                                padding: "4px 8px",
                                background: "#f3f4f6",
                                borderRadius: "6px",
                                fontSize: "11px",
                                color: "#374151"
                              }}
                            >
                              {v.value} ({v.count})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Notebook Tab */}
          {activeTab === "notebook" && (
            <div style={styles.notebook}>
              <div style={{
                padding: "12px 16px",
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: "8px",
                fontSize: "13px",
                color: "#0369a1",
                marginBottom: "8px"
              }}>
                <strong>Tips:</strong> Use <code>df</code> to access the DataFrame. Press <strong>Ctrl+Enter</strong> to run, <strong>Shift+Enter</strong> to run & save changes.
                Available: <code>df</code>, <code>pd</code>, <code>np</code>, <code>print()</code>
              </div>

              {cells.map((cell, index) => (
                <div key={cell.id} style={styles.cell}>
                  <div style={styles.cellHeader}>
                    <span style={{ fontSize: "12px", color: "#6b7280" }}>
                      In [{index + 1}]
                      {cell.executionTime && (
                        <span style={{ marginLeft: "8px", color: "#9ca3af" }}>
                          ({cell.executionTime.toFixed(0)}ms)
                        </span>
                      )}
                    </span>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        style={{ ...styles.runButton, background: "#3b82f6" }}
                        onClick={() => runCell(cell.id, false)}
                        disabled={cell.isRunning}
                      >
                        {cell.isRunning ? "Running..." : "Run"}
                      </button>
                      <button
                        style={{ ...styles.runButton, background: "#10b981" }}
                        onClick={() => runCell(cell.id, true)}
                        disabled={cell.isRunning}
                        title="Run and save changes to file"
                      >
                        Run & Save
                      </button>
                      {cells.length > 1 && (
                        <button
                          style={{ ...styles.runButton, background: "#ef4444" }}
                          onClick={() => deleteCell(cell.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                  <textarea
                    style={styles.codeArea}
                    value={cell.code}
                    onChange={(e) => updateCellCode(cell.id, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, cell.id)}
                    placeholder="# Write Python code here..."
                    spellCheck={false}
                  />
                  {(cell.output || cell.error) && (
                    <div style={{
                      ...styles.cellOutput,
                      background: cell.error ? "#fef2f2" : "#fafafa",
                      color: cell.error ? "#dc2626" : "#374151"
                    }}>
                      {cell.error || cell.output || "(no output)"}
                    </div>
                  )}
                </div>
              ))}

              <button style={styles.addCellButton} onClick={addCell}>
                + Add Code Cell
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
