import { useState, useRef } from "react";
import type { Node } from "reactflow";
import { uploadDataset } from "../services/api";

interface Props {
  node: Node | null;
  onUpdate: (updatedNode: Node) => void;
  onDelete: (nodeId: string) => void;
}

const BLOCK_INFO: Record<string, { icon: string; description: string; color: string }> = {
  dataset: {
    icon: "📁",
    description: "Load and configure your dataset",
    color: "#3b82f6"
  },
  split: {
    icon: "✂️",
    description: "Split data into train/test sets",
    color: "#8b5cf6"
  },
  model: {
    icon: "🤖",
    description: "Configure your ML model",
    color: "#10b981"
  },
  trainer: {
    icon: "🎯",
    description: "Train the model on your data",
    color: "#f59e0b"
  },
  metrics: {
    icon: "📊",
    description: "Evaluate model performance",
    color: "#ef4444"
  }
};

const styles = {
  container: {
    width: "320px",
    height: "100vh",
    borderLeft: "1px solid #e0e0e0",
    background: "#fff",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden"
  },
  emptyState: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    padding: "40px 20px",
    textAlign: "center" as const,
    color: "#6b7280"
  },
  emptyIcon: {
    fontSize: "48px",
    marginBottom: "16px",
    opacity: 0.5
  },
  header: {
    padding: "20px",
    borderBottom: "1px solid #e5e7eb"
  },
  headerTop: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "8px"
  },
  headerIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px"
  },
  headerTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 600,
    color: "#1a1a2e"
  },
  headerSubtitle: {
    fontSize: "13px",
    color: "#6b7280",
    margin: 0
  },
  blockId: {
    fontSize: "11px",
    color: "#9ca3af",
    fontFamily: "monospace",
    background: "#f3f4f6",
    padding: "2px 6px",
    borderRadius: "4px",
    marginTop: "8px",
    display: "inline-block"
  },
  content: {
    flex: 1,
    padding: "20px",
    overflowY: "auto" as const
  },
  section: {
    marginBottom: "24px"
  },
  sectionTitle: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    marginBottom: "12px"
  },
  formGroup: {
    marginBottom: "16px"
  },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: 500,
    color: "#374151",
    marginBottom: "6px"
  },
  labelHint: {
    fontSize: "11px",
    color: "#9ca3af",
    fontWeight: 400,
    marginLeft: "4px"
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    background: "#fff",
    color: "#1f2937",
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
    boxSizing: "border-box" as const
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    background: "#fff",
    color: "#1f2937",
    outline: "none",
    cursor: "pointer",
    boxSizing: "border-box" as const
  },
  checkboxGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 12px",
    background: "#f9fafb",
    borderRadius: "8px",
    cursor: "pointer"
  },
  checkbox: {
    width: "18px",
    height: "18px",
    cursor: "pointer"
  },
  checkboxLabel: {
    fontSize: "14px",
    color: "#374151",
    cursor: "pointer"
  },
  rangeContainer: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  rangeInput: {
    flex: 1,
    height: "6px",
    borderRadius: "3px",
    cursor: "pointer"
  },
  rangeValue: {
    minWidth: "50px",
    padding: "6px 10px",
    background: "#f3f4f6",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: 500,
    textAlign: "center" as const,
    color: "#374151"
  },
  footer: {
    padding: "16px 20px",
    borderTop: "1px solid #e5e7eb",
    background: "#fafafa"
  },
  deleteButton: {
    width: "100%",
    padding: "10px 16px",
    fontSize: "14px",
    fontWeight: 500,
    color: "#dc2626",
    background: "#fff",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.15s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px"
  },
  infoCard: {
    background: "#f0f9ff",
    border: "1px solid #bae6fd",
    borderRadius: "8px",
    padding: "12px",
    fontSize: "13px",
    color: "#0369a1",
    lineHeight: 1.5
  },
  dropZone: {
    border: "2px dashed #d1d5db",
    borderRadius: "12px",
    padding: "24px 16px",
    textAlign: "center" as const,
    cursor: "pointer",
    transition: "all 0.15s",
    background: "#fafafa"
  },
  dropZoneActive: {
    borderColor: "#3b82f6",
    background: "#eff6ff"
  },
  dropZoneIcon: {
    fontSize: "32px",
    marginBottom: "8px"
  },
  dropZoneText: {
    fontSize: "14px",
    color: "#374151",
    marginBottom: "4px"
  },
  dropZoneHint: {
    fontSize: "12px",
    color: "#9ca3af"
  },
  fileInfo: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "16px"
  },
  fileInfoHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "12px"
  },
  fileInfoIcon: {
    fontSize: "24px"
  },
  fileInfoName: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#166534",
    wordBreak: "break-all" as const
  },
  fileInfoStats: {
    display: "flex",
    gap: "16px",
    fontSize: "12px",
    color: "#15803d"
  },
  uploadingState: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    padding: "24px",
    gap: "12px"
  },
  spinner: {
    width: "24px",
    height: "24px",
    border: "3px solid #e5e7eb",
    borderTopColor: "#3b82f6",
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
  }
};

export default function BlockConfigPanel({ node, onUpdate, onDelete }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!node) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🔧</div>
          <div style={{ fontSize: "14px", fontWeight: 500, marginBottom: "8px" }}>
            No Block Selected
          </div>
          <div style={{ fontSize: "13px" }}>
            Click on a block in the canvas to configure its parameters
          </div>
        </div>
      </div>
    );
  }

  const blockType = node.data.blockType as string;
  const params = node.data.params || {};
  const blockInfo = BLOCK_INFO[blockType] || {
    icon: "📦",
    description: "Configure block parameters",
    color: "#6b7280"
  };

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

  const updateMultipleParams = (updates: Record<string, any>) => {
    onUpdate({
      ...node,
      data: {
        ...node.data,
        params: {
          ...params,
          ...updates
        }
      }
    });
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setUploadError("Only CSV files are supported");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const response = await uploadDataset(file);

      updateMultipleParams({
        file_path: response.file_path,
        filename: response.filename,
        columns: response.columns,
        rows: response.rows,
        target: response.suggested_target || ""
      });
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <div
            style={{
              ...styles.headerIcon,
              background: `${blockInfo.color}15`
            }}
          >
            {blockInfo.icon}
          </div>
          <div>
            <h3 style={styles.headerTitle}>
              {blockType.charAt(0).toUpperCase() + blockType.slice(1)} Block
            </h3>
            <p style={styles.headerSubtitle}>{blockInfo.description}</p>
          </div>
        </div>
        <span style={styles.blockId}>ID: {node.id}</span>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Dataset Block */}
        {blockType === "dataset" && (
          <>
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Upload Dataset</div>

              {/* File Info (if uploaded) */}
              {params.filename && !isUploading && (
                <div style={styles.fileInfo}>
                  <div style={styles.fileInfoHeader}>
                    <span style={styles.fileInfoIcon}>✅</span>
                    <span style={styles.fileInfoName}>{params.filename}</span>
                  </div>
                  <div style={styles.fileInfoStats}>
                    <span>📊 {params.rows?.toLocaleString()} rows</span>
                    <span>📋 {params.columns?.length} columns</span>
                  </div>
                </div>
              )}

              {/* Upload Zone */}
              {isUploading ? (
                <div style={styles.uploadingState}>
                  <div style={styles.spinner} />
                  <div style={{ fontSize: "14px", color: "#6b7280" }}>
                    Uploading...
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    ...styles.dropZone,
                    ...(isDragging ? styles.dropZoneActive : {})
                  }}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div style={styles.dropZoneIcon}>
                    {params.filename ? "🔄" : "📤"}
                  </div>
                  <div style={styles.dropZoneText}>
                    {params.filename ? "Upload a different file" : "Drop CSV file here"}
                  </div>
                  <div style={styles.dropZoneHint}>
                    or click to browse
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    style={{ display: "none" }}
                    onChange={handleFileSelect}
                  />
                </div>
              )}

              {/* Upload Error */}
              {uploadError && (
                <div style={{
                  marginTop: "12px",
                  padding: "10px 12px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  fontSize: "13px",
                  color: "#dc2626"
                }}>
                  {uploadError}
                </div>
              )}
            </div>

            {/* Target Column Selection */}
            {params.columns && params.columns.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>Target Column</div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Select the column to predict
                    <span style={styles.labelHint}>(required)</span>
                  </label>
                  <select
                    style={styles.select}
                    value={params.target || ""}
                    onChange={(e) => updateParam("target", e.target.value)}
                  >
                    <option value="">-- Select column --</option>
                    {params.columns.map((col: string) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.infoCard}>
                  <strong>Tip:</strong> The target column is the variable you want to predict.
                  All other columns will be used as features.
                </div>
              </div>
            )}

            {/* Manual Path Input (fallback) */}
            {!params.filename && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>Or Enter Path Manually</div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    File Path
                  </label>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="/path/to/your/data.csv"
                    value={params.file_path || ""}
                    onChange={(e) => updateParam("file_path", e.target.value)}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Target Column
                  </label>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="e.g., label, target, y"
                    value={params.target || ""}
                    onChange={(e) => updateParam("target", e.target.value)}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Split Block */}
        {blockType === "split" && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Split Configuration</div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Test Size
                <span style={styles.labelHint}>({((params.test_size ?? 0.2) * 100).toFixed(0)}% for testing)</span>
              </label>
              <div style={styles.rangeContainer}>
                <input
                  type="range"
                  min="0.1"
                  max="0.5"
                  step="0.05"
                  style={styles.rangeInput}
                  value={params.test_size ?? 0.2}
                  onChange={(e) => updateParam("test_size", parseFloat(e.target.value))}
                />
                <div style={styles.rangeValue}>
                  {((params.test_size ?? 0.2) * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label
                style={styles.checkboxGroup}
                onClick={() => updateParam("stratify", !(params.stratify ?? true))}
              >
                <input
                  type="checkbox"
                  style={styles.checkbox}
                  checked={params.stratify ?? true}
                  onChange={(e) => updateParam("stratify", e.target.checked)}
                />
                <span style={styles.checkboxLabel}>Stratified Split</span>
              </label>
            </div>

            <div style={styles.infoCard}>
              <strong>Stratified split</strong> maintains the same class distribution
              in both train and test sets. Recommended for classification tasks.
            </div>
          </div>
        )}

        {/* Model Block */}
        {blockType === "model" && (
          <>
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Model Type</div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Task</label>
                <select
                  style={styles.select}
                  value={params.task ?? "classification"}
                  onChange={(e) => updateParam("task", e.target.value)}
                >
                  <option value="classification">Classification</option>
                  <option value="regression">Regression</option>
                </select>
              </div>
            </div>

            <div style={styles.section}>
              <div style={styles.sectionTitle}>Hyperparameters</div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Number of Trees
                  <span style={styles.labelHint}>(n_estimators)</span>
                </label>
                <input
                  type="number"
                  style={styles.input}
                  min="10"
                  max="1000"
                  value={params.n_estimators ?? 100}
                  onChange={(e) => updateParam("n_estimators", parseInt(e.target.value) || 100)}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Max Depth
                  <span style={styles.labelHint}>(tree depth limit)</span>
                </label>
                <input
                  type="number"
                  style={styles.input}
                  min="1"
                  max="50"
                  placeholder="None (unlimited)"
                  value={params.max_depth ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateParam("max_depth", val ? parseInt(val) : null);
                  }}
                />
              </div>

              <div style={styles.infoCard}>
                <strong>Random Forest</strong> is an ensemble method that combines
                multiple decision trees for better accuracy and reduced overfitting.
              </div>
            </div>
          </>
        )}

        {/* Trainer Block */}
        {blockType === "trainer" && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Training Configuration</div>

            <div style={styles.infoCard}>
              The trainer block fits the model to your training data.
              No additional configuration is needed for Random Forest models.
            </div>
          </div>
        )}

        {/* Metrics Block */}
        {blockType === "metrics" && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Evaluation Metrics</div>

            <div style={styles.infoCard}>
              <p style={{ margin: "0 0 8px 0" }}>
                <strong>For Classification:</strong> Accuracy score
              </p>
              <p style={{ margin: 0 }}>
                <strong>For Regression:</strong> Mean Squared Error (MSE)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <button
          style={styles.deleteButton}
          onClick={() => onDelete(node.id)}
          onMouseOver={(e) => {
            e.currentTarget.style.background = "#fef2f2";
            e.currentTarget.style.borderColor = "#f87171";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "#fff";
            e.currentTarget.style.borderColor = "#fecaca";
          }}
        >
          <span>🗑️</span>
          Delete Block
        </button>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
