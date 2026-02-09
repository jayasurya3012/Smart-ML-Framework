import { useState, useRef } from "react";
import type { Node } from "reactflow";
import { uploadDataset, downloadDataset } from "../services/api";
import type { FileOption } from "../services/api";

interface Props {
  node: Node | null;
  onUpdate: (updatedNode: Node) => void;
  onDelete: (nodeId: string) => void;
  onInspect?: (filePath: string) => void;
}

const BLOCK_INFO: Record<string, { icon: string; description: string; color: string }> = {
  dataset: {
    icon: "📁",
    description: "Load and configure your dataset",
    color: "#3b82f6"
  },
  data_cleaner: {
    icon: "🧹",
    description: "Clean data: handle missing values & outliers",
    color: "#14b8a6"
  },
  split: {
    icon: "✂️",
    description: "Split data into train/test sets",
    color: "#8b5cf6"
  },
  feature_pipeline: {
    icon: "⚙️",
    description: "Preprocess and transform features",
    color: "#06b6d4"
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
  },
  voting_ensemble: {
    icon: "🗳️",
    description: "Combine multiple algorithms via voting",
    color: "#d946ef"
  },
  dataset_merge: {
    icon: "🔀",
    description: "Merge multiple datasets together",
    color: "#0ea5e9"
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

export default function BlockConfigPanel({ node, onUpdate, onDelete, onInspect }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // URL download state
  const [urlInput, setUrlInput] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [fileSelection, setFileSelection] = useState<{
    available_files: FileOption[];
    url: string;
  } | null>(null);

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
  const customDef = node.data.customDef as any;
  const blockInfo = BLOCK_INFO[blockType] || (customDef
    ? {
        icon: customDef.icon || "🧩",
        description: customDef.description || "Custom block",
        color: customDef.color || "#6366f1"
      }
    : {
        icon: "📦",
        description: "Configure block parameters",
        color: "#6b7280"
      });

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
        target: response.suggested_target || "",
        suggested_task: response.suggested_task || "classification",
        column_analysis: response.column_analysis
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

  const handleUrlDownload = async (url?: string, selectedFile?: string) => {
    const targetUrl = url || urlInput.trim();
    if (!targetUrl) return;

    setIsDownloading(true);
    setDownloadError(null);
    setFileSelection(null);

    try {
      const response = await downloadDataset({
        url: targetUrl,
        selected_file: selectedFile
      });

      if (response.status === "select_file") {
        setFileSelection({
          available_files: response.available_files || [],
          url: targetUrl
        });
      } else {
        updateMultipleParams({
          file_path: response.file_path,
          filename: response.filename,
          columns: response.columns,
          rows: response.rows,
          target: response.suggested_target || "",
          suggested_task: response.suggested_task || "classification",
          column_analysis: response.column_analysis
        });
        setFileSelection(null);
        setUrlInput("");
      }
    } catch (err: any) {
      setDownloadError(err.message || "Download failed");
    } finally {
      setIsDownloading(false);
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
              {customDef?.name || (blockType.charAt(0).toUpperCase() + blockType.slice(1))} Block
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
                  {/* Auto-detected task type */}
                  {params.suggested_task && (
                    <div style={{
                      marginTop: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}>
                      <span style={{
                        padding: "4px 10px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: 600,
                        background: params.suggested_task === "classification" ? "#dbeafe" : "#fef3c7",
                        color: params.suggested_task === "classification" ? "#1e40af" : "#92400e"
                      }}>
                        {params.suggested_task === "classification" ? "🎯 Classification" : "📈 Regression"}
                      </span>
                      <span style={{ fontSize: "11px", color: "#6b7280" }}>Auto-detected</span>
                    </div>
                  )}
                  {/* Column analysis */}
                  {params.column_analysis && (
                    <div style={{
                      marginTop: "8px",
                      fontSize: "11px",
                      color: "#6b7280",
                      display: "flex",
                      flexWrap: "wrap" as const,
                      gap: "8px"
                    }}>
                      {params.column_analysis.numeric?.length > 0 && (
                        <span>🔢 {params.column_analysis.numeric.length} numeric</span>
                      )}
                      {params.column_analysis.categorical?.length > 0 && (
                        <span>🏷️ {params.column_analysis.categorical.length} categorical</span>
                      )}
                      {params.column_analysis.total_missing > 0 && (
                        <span style={{ color: "#f59e0b" }}>⚠️ {params.column_analysis.total_missing} missing</span>
                      )}
                    </div>
                  )}
                  {/* Inspect Button */}
                  {onInspect && params.file_path && (
                    <button
                      onClick={() => onInspect(params.file_path)}
                      style={{
                        marginTop: "12px",
                        width: "100%",
                        padding: "10px 16px",
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#fff",
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px"
                      }}
                    >
                      <span>🔍</span>
                      Inspect Data & Code
                    </button>
                  )}
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

            {/* Download from URL */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Or Download from URL</div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Dataset URL
                  <span style={styles.labelHint}>(Kaggle, GitHub, direct CSV)</span>
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    style={{ ...styles.input, flex: 1 }}
                    placeholder="https://... or user/dataset-name"
                    value={urlInput}
                    onChange={(e) => { setUrlInput(e.target.value); setDownloadError(null); }}
                    onKeyDown={(e) => e.key === "Enter" && handleUrlDownload()}
                    disabled={isDownloading}
                  />
                  <button
                    onClick={() => handleUrlDownload()}
                    disabled={isDownloading || !urlInput.trim()}
                    style={{
                      padding: "10px 16px",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#fff",
                      background: isDownloading || !urlInput.trim() ? "#9ca3af" : "#3b82f6",
                      border: "none",
                      borderRadius: "8px",
                      cursor: isDownloading || !urlInput.trim() ? "not-allowed" : "pointer",
                      whiteSpace: "nowrap" as const
                    }}
                  >
                    {isDownloading ? "..." : "Fetch"}
                  </button>
                </div>
              </div>

              {/* Downloading spinner */}
              {isDownloading && (
                <div style={styles.uploadingState}>
                  <div style={styles.spinner} />
                  <div style={{ fontSize: "14px", color: "#6b7280" }}>
                    Downloading dataset...
                  </div>
                </div>
              )}

              {/* File selection (multi-file datasets) */}
              {fileSelection && (
                <div style={{
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: "12px",
                  padding: "16px",
                  marginTop: "12px"
                }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#92400e", marginBottom: "8px" }}>
                    Multiple CSV files found. Select one:
                  </div>
                  {fileSelection.available_files.map((file) => (
                    <button
                      key={file.name}
                      onClick={() => handleUrlDownload(fileSelection.url, file.name)}
                      disabled={isDownloading}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "10px 12px",
                        marginBottom: "6px",
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "#374151",
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        cursor: isDownloading ? "not-allowed" : "pointer",
                        textAlign: "left" as const
                      }}
                    >
                      {file.name} ({file.size_kb} KB)
                    </button>
                  ))}
                </div>
              )}

              {/* Download error */}
              {downloadError && (
                <div style={{
                  marginTop: "12px",
                  padding: "10px 12px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  fontSize: "13px",
                  color: "#dc2626"
                }}>
                  {downloadError}
                </div>
              )}

              <div style={{ ...styles.infoCard, marginTop: "12px" }}>
                <strong>Supported URLs:</strong>
                <ul style={{ margin: "4px 0 0 16px", padding: 0, fontSize: "12px" }}>
                  <li>Kaggle: <code>user/dataset-name</code> or full kaggle.com URL</li>
                  <li>Direct CSV: any URL ending in .csv</li>
                  <li>GitHub raw files</li>
                  <li>ZIP archives containing CSVs</li>
                </ul>
              </div>
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

        {/* Data Cleaner Block */}
        {blockType === "data_cleaner" && (
          <>
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Missing Value Strategy</div>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Strategy
                  <span style={styles.labelHint}>(how to handle missing values)</span>
                </label>
                <select
                  style={styles.select}
                  value={params.strategy ?? "impute_median"}
                  onChange={(e) => updateParam("strategy", e.target.value)}
                >
                  <optgroup label="Imputation">
                    <option value="impute_median">Impute with Median (recommended)</option>
                    <option value="impute_mean">Impute with Mean</option>
                    <option value="impute_mode">Impute with Mode (most frequent)</option>
                    <option value="impute_constant">Impute with Constant Value</option>
                  </optgroup>
                  <optgroup label="Removal">
                    <option value="drop_rows">Drop Rows with Missing Values</option>
                    <option value="drop_cols">Drop Columns with High Missing Rate</option>
                  </optgroup>
                  <optgroup label="Time Series">
                    <option value="forward_fill">Forward Fill</option>
                    <option value="backward_fill">Backward Fill</option>
                  </optgroup>
                </select>
              </div>

              {/* Constant value input */}
              {params.strategy === "impute_constant" && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Constant Value
                    <span style={styles.labelHint}>(value to fill missing cells)</span>
                  </label>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="0"
                    value={params.constant_value ?? 0}
                    onChange={(e) => updateParam("constant_value", e.target.value)}
                  />
                </div>
              )}

              {/* Missing threshold for drop_cols */}
              {params.strategy === "drop_cols" && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Missing Threshold
                    <span style={styles.labelHint}>(drop columns with more than this % missing)</span>
                  </label>
                  <div style={styles.rangeContainer}>
                    <input
                      type="range"
                      min="0.1"
                      max="0.9"
                      step="0.1"
                      style={styles.rangeInput}
                      value={params.missing_threshold ?? 0.5}
                      onChange={(e) => updateParam("missing_threshold", parseFloat(e.target.value))}
                    />
                    <div style={styles.rangeValue}>
                      {((params.missing_threshold ?? 0.5) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={styles.section}>
              <div style={styles.sectionTitle}>Outlier Handling</div>
              <div style={styles.formGroup}>
                <label
                  style={{
                    ...styles.checkboxGroup,
                    cursor: "pointer",
                    padding: "12px",
                    background: params.handle_outliers ? "#f0fdfa" : "#f9fafb",
                    borderRadius: "8px",
                    border: params.handle_outliers ? "2px solid #14b8a6" : "1px solid #e5e7eb"
                  }}
                  onClick={() => updateParam("handle_outliers", !params.handle_outliers)}
                >
                  <input
                    type="checkbox"
                    checked={!!params.handle_outliers}
                    onChange={(e) => updateParam("handle_outliers", e.target.checked)}
                  />
                  <div>
                    <div style={{ fontWeight: 600, color: "#1f2937" }}>
                      Handle Outliers
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                      Cap extreme values to reduce noise
                    </div>
                  </div>
                </label>
              </div>

              {params.handle_outliers && (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Outlier Detection Method</label>
                    <select
                      style={styles.select}
                      value={params.outlier_method ?? "iqr"}
                      onChange={(e) => updateParam("outlier_method", e.target.value)}
                    >
                      <option value="iqr">IQR (Interquartile Range)</option>
                      <option value="zscore">Z-Score</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Threshold
                      <span style={styles.labelHint}>
                        ({params.outlier_method === "zscore" ? "standard deviations" : "IQR multiplier"})
                      </span>
                    </label>
                    <input
                      type="number"
                      style={styles.input}
                      min="0.5"
                      max="5"
                      step="0.5"
                      value={params.outlier_threshold ?? 1.5}
                      onChange={(e) => updateParam("outlier_threshold", parseFloat(e.target.value) || 1.5)}
                    />
                  </div>
                </>
              )}
            </div>

            <div style={styles.section}>
              <div style={{
                ...styles.infoCard,
                background: "#f0fdfa",
                borderColor: "#5eead4"
              }}>
                <strong>Data Cleaning</strong> handles missing values and outliers before training.
                <ul style={{ margin: "8px 0 0 16px", padding: 0, fontSize: "12px" }}>
                  <li><strong>Median imputation</strong> is robust to outliers</li>
                  <li><strong>Mean imputation</strong> preserves the overall average</li>
                  <li><strong>Mode imputation</strong> works for categorical data</li>
                  <li><strong>IQR method</strong> caps values outside 1.5x interquartile range</li>
                </ul>
              </div>
            </div>
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

        {/* Feature Pipeline Block */}
        {blockType === "feature_pipeline" && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Feature Preprocessing</div>

            <div style={styles.infoCard}>
              <p style={{ margin: "0 0 8px 0" }}>
                This block automatically preprocesses your data:
              </p>
              <p style={{ margin: "0 0 4px 0" }}>
                <strong>Numeric features</strong> — StandardScaler (zero mean, unit variance)
              </p>
              <p style={{ margin: 0 }}>
                <strong>Categorical features</strong> — OneHotEncoder (binary columns per category)
              </p>
            </div>
          </div>
        )}

        {/* Model Block */}
        {blockType === "model" && (
          <>
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Task Type</div>
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
              <div style={styles.sectionTitle}>Algorithm</div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Select Algorithm</label>
                <select
                  style={styles.select}
                  value={params.algorithm ?? "random_forest"}
                  onChange={(e) => updateParam("algorithm", e.target.value)}
                >
                  {/* Ensemble */}
                  <optgroup label="Ensemble Methods">
                    <option value="random_forest">Random Forest</option>
                    <option value="gradient_boosting">Gradient Boosting</option>
                    <option value="adaboost">AdaBoost</option>
                    <option value="extra_trees">Extra Trees</option>
                    <option value="bagging">Bagging</option>
                  </optgroup>
                  {/* Tree */}
                  <optgroup label="Tree Methods">
                    <option value="decision_tree">Decision Tree</option>
                  </optgroup>
                  {/* Linear */}
                  <optgroup label="Linear Models">
                    {(params.task ?? "classification") === "classification" && (
                      <option value="logistic_regression">Logistic Regression</option>
                    )}
                    {(params.task ?? "classification") === "regression" && (
                      <option value="linear_regression">Linear Regression</option>
                    )}
                    <option value="ridge">Ridge</option>
                    {(params.task ?? "classification") === "regression" && (
                      <>
                        <option value="lasso">Lasso</option>
                        <option value="elastic_net">ElasticNet</option>
                        <option value="bayesian_ridge">Bayesian Ridge</option>
                      </>
                    )}
                    <option value="sgd">SGD</option>
                    {(params.task ?? "classification") === "classification" && (
                      <>
                        <option value="perceptron">Perceptron</option>
                      </>
                    )}
                    <option value="passive_aggressive">Passive Aggressive</option>
                  </optgroup>
                  {/* SVM */}
                  <optgroup label="Support Vector Machines">
                    <option value="svm">SVM (RBF kernel)</option>
                    <option value="linear_svm">Linear SVM</option>
                  </optgroup>
                  {/* Neighbors */}
                  <optgroup label="Nearest Neighbors">
                    <option value="knn">K-Nearest Neighbors</option>
                  </optgroup>
                  {/* Naive Bayes */}
                  {(params.task ?? "classification") === "classification" && (
                    <optgroup label="Naive Bayes">
                      <option value="gaussian_nb">Gaussian NB</option>
                      <option value="bernoulli_nb">Bernoulli NB</option>
                    </optgroup>
                  )}
                  {/* Neural Network */}
                  <optgroup label="Neural Networks">
                    <option value="mlp">Multi-Layer Perceptron</option>
                  </optgroup>
                  {/* Discriminant */}
                  {(params.task ?? "classification") === "classification" && (
                    <optgroup label="Discriminant Analysis">
                      <option value="lda">LDA</option>
                      <option value="qda">QDA</option>
                    </optgroup>
                  )}
                  {/* Gaussian Process */}
                  <optgroup label="Gaussian Process">
                    <option value="gaussian_process">Gaussian Process</option>
                  </optgroup>
                </select>
              </div>
            </div>

            <div style={styles.section}>
              <div style={styles.sectionTitle}>Hyperparameters</div>

              {/* Ensemble / Tree params */}
              {["random_forest", "gradient_boosting", "adaboost", "extra_trees", "bagging"].includes(params.algorithm ?? "random_forest") && (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      n_estimators
                      <span style={styles.labelHint}>(number of estimators)</span>
                    </label>
                    <input type="number" style={styles.input} min="10" max="2000"
                      value={params.n_estimators ?? 100}
                      onChange={(e) => updateParam("n_estimators", parseInt(e.target.value) || 100)} />
                  </div>
                </>
              )}

              {["random_forest", "gradient_boosting", "extra_trees", "decision_tree"].includes(params.algorithm ?? "random_forest") && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    max_depth
                    <span style={styles.labelHint}>(tree depth limit)</span>
                  </label>
                  <input type="number" style={styles.input} min="1" max="100"
                    placeholder="None (unlimited)"
                    value={params.max_depth ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateParam("max_depth", val ? parseInt(val) : null);
                    }} />
                </div>
              )}

              {["gradient_boosting", "adaboost"].includes(params.algorithm ?? "") && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    learning_rate
                    <span style={styles.labelHint}>(step size shrinkage)</span>
                  </label>
                  <input type="number" style={styles.input} min="0.001" max="10" step="0.01"
                    value={params.learning_rate ?? 0.1}
                    onChange={(e) => updateParam("learning_rate", parseFloat(e.target.value) || 0.1)} />
                </div>
              )}

              {["gradient_boosting"].includes(params.algorithm ?? "") && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    subsample
                    <span style={styles.labelHint}>(fraction of samples per tree)</span>
                  </label>
                  <input type="number" style={styles.input} min="0.1" max="1.0" step="0.1"
                    value={params.subsample ?? 1.0}
                    onChange={(e) => updateParam("subsample", parseFloat(e.target.value) || 1.0)} />
                </div>
              )}

              {/* Linear model params */}
              {["logistic_regression", "svm", "linear_svm", "passive_aggressive"].includes(params.algorithm ?? "") && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    C
                    <span style={styles.labelHint}>(regularization strength)</span>
                  </label>
                  <input type="number" style={styles.input} min="0.001" max="1000" step="0.1"
                    value={params.C ?? 1.0}
                    onChange={(e) => updateParam("C", parseFloat(e.target.value) || 1.0)} />
                </div>
              )}

              {["ridge", "lasso", "elastic_net", "sgd"].includes(params.algorithm ?? "") && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    alpha
                    <span style={styles.labelHint}>(regularization parameter)</span>
                  </label>
                  <input type="number" style={styles.input} min="0.0001" max="100" step="0.01"
                    value={params.alpha ?? 1.0}
                    onChange={(e) => updateParam("alpha", parseFloat(e.target.value) || 1.0)} />
                </div>
              )}

              {["elastic_net"].includes(params.algorithm ?? "") && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    l1_ratio
                    <span style={styles.labelHint}>(0=Ridge, 1=Lasso)</span>
                  </label>
                  <input type="number" style={styles.input} min="0" max="1" step="0.1"
                    value={params.l1_ratio ?? 0.5}
                    onChange={(e) => updateParam("l1_ratio", parseFloat(e.target.value) || 0.5)} />
                </div>
              )}

              {/* SVM params */}
              {["svm"].includes(params.algorithm ?? "") && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    kernel
                    <span style={styles.labelHint}>(kernel function)</span>
                  </label>
                  <select style={styles.select}
                    value={params.kernel ?? "rbf"}
                    onChange={(e) => updateParam("kernel", e.target.value)}>
                    <option value="rbf">RBF (Gaussian)</option>
                    <option value="linear">Linear</option>
                    <option value="poly">Polynomial</option>
                    <option value="sigmoid">Sigmoid</option>
                  </select>
                </div>
              )}

              {/* KNN params */}
              {["knn"].includes(params.algorithm ?? "") && (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      n_neighbors
                      <span style={styles.labelHint}>(K value)</span>
                    </label>
                    <input type="number" style={styles.input} min="1" max="100"
                      value={params.n_neighbors ?? 5}
                      onChange={(e) => updateParam("n_neighbors", parseInt(e.target.value) || 5)} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      weights
                      <span style={styles.labelHint}>(weight function)</span>
                    </label>
                    <select style={styles.select}
                      value={params.weights ?? "uniform"}
                      onChange={(e) => updateParam("weights", e.target.value)}>
                      <option value="uniform">Uniform</option>
                      <option value="distance">Distance-weighted</option>
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      metric
                      <span style={styles.labelHint}>(distance metric)</span>
                    </label>
                    <select style={styles.select}
                      value={params.metric ?? "minkowski"}
                      onChange={(e) => updateParam("metric", e.target.value)}>
                      <option value="minkowski">Minkowski</option>
                      <option value="euclidean">Euclidean</option>
                      <option value="manhattan">Manhattan</option>
                      <option value="chebyshev">Chebyshev</option>
                    </select>
                  </div>
                </>
              )}

              {/* MLP params */}
              {["mlp"].includes(params.algorithm ?? "") && (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      hidden_layer_sizes
                      <span style={styles.labelHint}>(comma-separated, e.g. 100,50)</span>
                    </label>
                    <input type="text" style={styles.input}
                      value={params.hidden_layer_sizes ?? "100"}
                      onChange={(e) => updateParam("hidden_layer_sizes", e.target.value)} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      activation
                      <span style={styles.labelHint}>(activation function)</span>
                    </label>
                    <select style={styles.select}
                      value={params.activation ?? "relu"}
                      onChange={(e) => updateParam("activation", e.target.value)}>
                      <option value="relu">ReLU</option>
                      <option value="tanh">Tanh</option>
                      <option value="logistic">Sigmoid</option>
                      <option value="identity">Identity</option>
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      solver
                      <span style={styles.labelHint}>(weight optimizer)</span>
                    </label>
                    <select style={styles.select}
                      value={params.solver ?? "adam"}
                      onChange={(e) => updateParam("solver", e.target.value)}>
                      <option value="adam">Adam</option>
                      <option value="sgd">SGD</option>
                      <option value="lbfgs">L-BFGS</option>
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      learning_rate_init
                      <span style={styles.labelHint}>(initial learning rate)</span>
                    </label>
                    <input type="number" style={styles.input} min="0.0001" max="1" step="0.001"
                      value={params.learning_rate_init ?? 0.001}
                      onChange={(e) => updateParam("learning_rate_init", parseFloat(e.target.value) || 0.001)} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      max_iter
                      <span style={styles.labelHint}>(maximum epochs)</span>
                    </label>
                    <input type="number" style={styles.input} min="50" max="5000"
                      value={params.max_iter ?? 200}
                      onChange={(e) => updateParam("max_iter", parseInt(e.target.value) || 200)} />
                  </div>
                </>
              )}

              {/* Max iter for linear models */}
              {["logistic_regression", "sgd", "lasso", "elastic_net", "linear_svm", "perceptron", "passive_aggressive"].includes(params.algorithm ?? "") && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    max_iter
                    <span style={styles.labelHint}>(maximum iterations)</span>
                  </label>
                  <input type="number" style={styles.input} min="100" max="10000"
                    value={params.max_iter ?? 1000}
                    onChange={(e) => updateParam("max_iter", parseInt(e.target.value) || 1000)} />
                </div>
              )}

              {/* Decision Tree criterion */}
              {["decision_tree"].includes(params.algorithm ?? "") && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    criterion
                    <span style={styles.labelHint}>(split quality measure)</span>
                  </label>
                  <select style={styles.select}
                    value={params.criterion ?? ((params.task ?? "classification") === "classification" ? "gini" : "squared_error")}
                    onChange={(e) => updateParam("criterion", e.target.value)}>
                    {(params.task ?? "classification") === "classification" ? (
                      <>
                        <option value="gini">Gini</option>
                        <option value="entropy">Entropy</option>
                        <option value="log_loss">Log Loss</option>
                      </>
                    ) : (
                      <>
                        <option value="squared_error">Squared Error</option>
                        <option value="absolute_error">Absolute Error</option>
                        <option value="friedman_mse">Friedman MSE</option>
                      </>
                    )}
                  </select>
                </div>
              )}

              {/* Algorithm description */}
              <div style={styles.infoCard}>
                {(() => {
                  const algo = params.algorithm ?? "random_forest";
                  const descriptions: Record<string, string> = {
                    random_forest: "Random Forest combines multiple decision trees for robust predictions with reduced overfitting.",
                    gradient_boosting: "Gradient Boosting builds trees sequentially, each correcting errors of the previous. High accuracy but slower.",
                    adaboost: "AdaBoost focuses on hard-to-classify samples by adjusting weights iteratively.",
                    extra_trees: "Extra Trees uses random splits for faster training with similar accuracy to Random Forest.",
                    bagging: "Bagging reduces variance by training on random subsets and averaging predictions.",
                    decision_tree: "Decision Tree is simple and interpretable but prone to overfitting. Good for understanding feature importance.",
                    logistic_regression: "Logistic Regression is a fast, interpretable linear model for classification tasks.",
                    linear_regression: "Linear Regression models a linear relationship between features and a continuous target.",
                    ridge: "Ridge adds L2 regularization to prevent overfitting in linear models.",
                    lasso: "Lasso adds L1 regularization which can zero out features, performing feature selection.",
                    elastic_net: "ElasticNet combines L1 and L2 regularization. Good when features are correlated.",
                    sgd: "SGD uses stochastic gradient descent for efficient training on large datasets.",
                    bayesian_ridge: "Bayesian Ridge estimates regularization parameters automatically using Bayesian inference.",
                    perceptron: "Perceptron is the simplest neural network — a single-layer linear classifier.",
                    passive_aggressive: "Passive Aggressive is an online learning algorithm that updates only on mistakes.",
                    svm: "SVM finds the optimal decision boundary using kernel functions. Effective in high dimensions.",
                    linear_svm: "Linear SVM is faster than kernel SVM and works well for linearly separable data.",
                    knn: "K-Nearest Neighbors classifies based on the majority vote of K closest training samples.",
                    gaussian_nb: "Gaussian NB assumes features follow normal distribution. Very fast with decent accuracy.",
                    bernoulli_nb: "Bernoulli NB works with binary features. Good for text classification.",
                    mlp: "Multi-Layer Perceptron is a feedforward neural network. Powerful but requires more tuning.",
                    lda: "LDA finds linear combinations of features that separate classes. Also useful for dimensionality reduction.",
                    qda: "QDA is like LDA but allows quadratic decision boundaries. Better for non-linear class separation.",
                    gaussian_process: "Gaussian Process provides probabilistic predictions with uncertainty estimates. Best for small datasets."
                  };
                  return <span><strong>{(descriptions[algo] || "Configure your model parameters.").split(" ")[0]}</strong> {(descriptions[algo] || "Configure your model parameters.").split(" ").slice(1).join(" ")}</span>;
                })()}
              </div>
            </div>
          </>
        )}

        {/* Voting Ensemble Block */}
        {blockType === "voting_ensemble" && (
          <>
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Task Type</div>
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

            {(params.task ?? "classification") === "classification" && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>Voting Strategy</div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Voting</label>
                  <select
                    style={styles.select}
                    value={params.voting ?? "hard"}
                    onChange={(e) => updateParam("voting", e.target.value)}
                  >
                    <option value="hard">Hard (Majority Vote)</option>
                    <option value="soft">Soft (Probability Average)</option>
                  </select>
                </div>
              </div>
            )}

            <div style={styles.section}>
              <div style={styles.sectionTitle}>Select Algorithms (min 2)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {[
                  { key: "random_forest", label: "Random Forest", both: true },
                  { key: "gradient_boosting", label: "Gradient Boosting", both: true },
                  { key: "adaboost", label: "AdaBoost", both: true },
                  { key: "extra_trees", label: "Extra Trees", both: true },
                  { key: "decision_tree", label: "Decision Tree", both: true },
                  { key: "knn", label: "K-Nearest Neighbors", both: true },
                  { key: "svm", label: "SVM", both: true },
                  { key: "logistic_regression", label: "Logistic Regression", both: false, classOnly: true },
                  { key: "ridge", label: "Ridge", both: true },
                  { key: "gaussian_nb", label: "Gaussian Naive Bayes", both: false, classOnly: true },
                  { key: "mlp", label: "Multi-Layer Perceptron", both: true },
                  { key: "lda", label: "Linear Discriminant Analysis", both: false, classOnly: true },
                ]
                  .filter((item) => {
                    const t = params.task ?? "classification";
                    if (t === "regression" && item.classOnly) return false;
                    return true;
                  })
                  .map(({ key, label }) => {
                    const algos: string[] = params.algorithms || [];
                    const checked = algos.includes(key);
                    return (
                      <div
                        key={key}
                        onClick={() => {
                          const current: string[] = [...(params.algorithms || [])];
                          if (checked) {
                            updateParam("algorithms", current.filter((a) => a !== key));
                          } else {
                            updateParam("algorithms", [...current, key]);
                          }
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "10px 12px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          background: checked ? "#fdf4ff" : "#f9fafb",
                          border: checked ? "1px solid #d946ef" : "1px solid #e5e7eb",
                          transition: "all 0.15s"
                        }}
                      >
                        <div style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "4px",
                          border: checked ? "2px solid #d946ef" : "2px solid #d1d5db",
                          background: checked ? "#d946ef" : "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: "12px",
                          fontWeight: 700,
                          flexShrink: 0
                        }}>
                          {checked ? "+" : ""}
                        </div>
                        <span style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>{label}</span>
                      </div>
                    );
                  })}
              </div>
              <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "8px" }}>
                {(params.algorithms || []).length} selected
                {(params.algorithms || []).length < 2 && (
                  <span style={{ color: "#ef4444", marginLeft: "8px" }}>
                    (need at least 2)
                  </span>
                )}
              </div>
            </div>

            <div style={styles.section}>
              <div style={styles.infoCard}>
                <p style={{ margin: "0 0 8px 0" }}>
                  <strong>Voting Ensemble</strong> combines predictions from multiple algorithms to improve robustness.
                </p>
                <p style={{ margin: "0 0 4px 0" }}>
                  <strong>Hard voting</strong> — each model votes for a class; the majority wins.
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Soft voting</strong> — class probabilities are averaged for a smoother prediction.
                </p>
              </div>
            </div>
          </>
        )}

        {/* Dataset Merge Block */}
        {blockType === "dataset_merge" && (
          <>
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Merge Strategy</div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Strategy</label>
                <select
                  style={styles.select}
                  value={params.strategy ?? "concat"}
                  onChange={(e) => updateParam("strategy", e.target.value)}
                >
                  <option value="concat">Concatenate (Stack Rows)</option>
                  <option value="join">Join (Merge on Key Column)</option>
                </select>
              </div>
            </div>

            {params.strategy === "join" && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>Join Configuration</div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Join Key Column</label>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="e.g., patient_id, user_id"
                    value={params.join_key || ""}
                    onChange={(e) => updateParam("join_key", e.target.value)}
                  />
                  <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>
                    Column name present in all datasets to merge on
                  </div>
                </div>
              </div>
            )}

            <div style={styles.section}>
              <div style={styles.infoCard}>
                <p style={{ margin: "0 0 8px 0" }}>
                  <strong>Concatenate:</strong> Stacks datasets vertically (same columns required). Use this to combine multiple CSV files with the same structure.
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Join:</strong> Merges datasets horizontally on a shared key column. Use this to combine feature sets from different sources.
                </p>
              </div>
            </div>

            <div style={styles.section}>
              <div style={{ ...styles.infoCard, borderLeft: "3px solid #f59e0b", background: "#fffbeb" }}>
                Connect 2 or more Dataset blocks as inputs to this Merge block.
              </div>
            </div>
          </>
        )}

        {/* Trainer Block */}
        {blockType === "trainer" && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Training Configuration</div>

            {/* Auto-tune toggle */}
            <div style={styles.formGroup}>
              <label
                style={{
                  ...styles.checkboxGroup,
                  cursor: "pointer",
                  padding: "12px",
                  background: params.auto_tune ? "#dbeafe" : "#f9fafb",
                  borderRadius: "8px",
                  border: params.auto_tune ? "2px solid #3b82f6" : "1px solid #e5e7eb"
                }}
                onClick={() => updateParam("auto_tune", !params.auto_tune)}
              >
                <input
                  type="checkbox"
                  checked={!!params.auto_tune}
                  onChange={(e) => updateParam("auto_tune", e.target.checked)}
                />
                <div>
                  <div style={{ fontWeight: 600, color: "#1f2937" }}>
                    ⚡ Auto-Tune Hyperparameters
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                    Automatically find optimal model settings using cross-validation
                  </div>
                </div>
              </label>
            </div>

            {/* CV folds selection (shown when auto_tune is enabled) */}
            {params.auto_tune && (
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Cross-Validation Folds
                  <span style={styles.labelHint}>(more = slower but more reliable)</span>
                </label>
                <select
                  style={styles.select}
                  value={params.cv_folds || 3}
                  onChange={(e) => updateParam("cv_folds", parseInt(e.target.value))}
                >
                  <option value={3}>3-fold CV (fast)</option>
                  <option value={5}>5-fold CV (balanced)</option>
                  <option value={10}>10-fold CV (thorough)</option>
                </select>
              </div>
            )}

            <div style={styles.infoCard}>
              {params.auto_tune ? (
                <>
                  <strong>Auto-Tune Enabled:</strong> Will search for the best hyperparameters
                  using {params.cv_folds || 3}-fold cross-validation. This may take longer but
                  typically improves model performance.
                </>
              ) : (
                <>
                  The trainer block fits the model using the parameters set in the Model block.
                  Enable auto-tune to automatically optimize hyperparameters.
                </>
              )}
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

        {/* Custom Block -- dynamic param rendering */}
        {customDef && customDef.param_schema && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Parameters</div>

            {customDef.param_schema.map((p: any) => (
              <div key={p.name} style={{ marginBottom: "14px" }}>
                <label style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: "4px"
                }}>
                  {p.name.replace(/_/g, " ")}
                  {p.description && (
                    <span style={{ fontWeight: 400, color: "#9ca3af", marginLeft: "6px" }}>
                      {p.description}
                    </span>
                  )}
                </label>

                {p.type === "boolean" ? (
                  <label style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "13px",
                    color: "#374151",
                    cursor: "pointer"
                  }}>
                    <input
                      type="checkbox"
                      checked={!!params[p.name]}
                      onChange={(e) => updateParam(p.name, e.target.checked)}
                    />
                    {params[p.name] ? "Enabled" : "Disabled"}
                  </label>
                ) : p.type === "select" && Array.isArray(p.options) ? (
                  <select
                    value={params[p.name] ?? p.default ?? ""}
                    onChange={(e) => updateParam(p.name, e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #d1d5db",
                      fontSize: "13px"
                    }}
                  >
                    {p.options.map((opt: string) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : p.type === "number" ? (
                  <input
                    type="number"
                    value={params[p.name] ?? p.default ?? ""}
                    onChange={(e) => updateParam(p.name, parseFloat(e.target.value) || 0)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #d1d5db",
                      fontSize: "13px",
                      boxSizing: "border-box"
                    }}
                  />
                ) : (
                  <input
                    type="text"
                    value={params[p.name] ?? p.default ?? ""}
                    onChange={(e) => updateParam(p.name, e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #d1d5db",
                      fontSize: "13px",
                      boxSizing: "border-box"
                    }}
                  />
                )}
              </div>
            ))}

            {customDef.description && (
              <div style={{
                ...styles.infoCard,
                marginTop: "12px",
                fontSize: "11px",
                color: "#6b7280"
              }}>
                {customDef.description}
              </div>
            )}
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
