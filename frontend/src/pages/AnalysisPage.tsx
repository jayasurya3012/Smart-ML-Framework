import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { uploadDataset } from "../services/api";
import type { UploadResponse } from "../services/api";
import {
  runEDAAnalysis,
  getFeatureSuggestions,
  getModelRecommendations
} from "../services/llmApi";
import type {
  EDAResponse,
  EDAInsight,
  FeatureSuggestResponse,
  FeatureSuggestion,
  ModelRecommendResponse,
  ModelRecommendation
} from "../services/llmApi";

type Step = "upload" | "eda" | "features" | "model";

/* ==================== Styles ==================== */

const s = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    fontFamily: "'Inter', 'Segoe UI', sans-serif"
  },
  nav: {
    background: "#fff",
    borderBottom: "1px solid #e5e7eb",
    padding: "16px 40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  logo: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#1e1b4b",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  logoDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #667eea, #764ba2)"
  },
  stepper: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  stepDot: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: 600,
    transition: "all 0.2s"
  },
  stepLine: {
    width: "40px",
    height: "2px",
    background: "#e5e7eb",
    transition: "background 0.2s"
  },
  stepLabel: {
    fontSize: "12px",
    color: "#6b7280",
    marginTop: "4px"
  },
  main: {
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "40px 24px"
  },
  sectionTitle: {
    fontSize: "28px",
    fontWeight: 700,
    color: "#1e1b4b",
    marginBottom: "8px"
  },
  sectionSubtitle: {
    fontSize: "16px",
    color: "#6b7280",
    marginBottom: "32px"
  },

  /* Upload Step */
  uploadArea: {
    border: "2px dashed #d1d5db",
    borderRadius: "16px",
    padding: "60px 40px",
    textAlign: "center" as const,
    cursor: "pointer",
    transition: "all 0.2s",
    background: "#fff",
    marginBottom: "24px"
  },
  uploadAreaActive: {
    borderColor: "#667eea",
    background: "#f5f3ff"
  },
  uploadIcon: {
    fontSize: "48px",
    marginBottom: "16px",
    opacity: 0.6
  },
  uploadText: {
    fontSize: "16px",
    fontWeight: 500,
    color: "#374151",
    marginBottom: "8px"
  },
  uploadSubtext: {
    fontSize: "13px",
    color: "#9ca3af"
  },
  fileInfo: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "24px",
    display: "flex",
    alignItems: "center",
    gap: "16px"
  },
  fileIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    background: "#f0fdf4",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px"
  },
  promptInput: {
    width: "100%",
    padding: "16px 20px",
    fontSize: "15px",
    border: "1px solid #d1d5db",
    borderRadius: "12px",
    outline: "none",
    fontFamily: "inherit",
    transition: "border-color 0.15s",
    boxSizing: "border-box" as const,
    marginBottom: "24px"
  },
  targetSelect: {
    padding: "12px 16px",
    fontSize: "14px",
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    outline: "none",
    background: "#fff",
    minWidth: "200px",
    marginBottom: "24px"
  },
  primaryButton: {
    padding: "14px 32px",
    fontSize: "15px",
    fontWeight: 600,
    color: "#fff",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(102, 126, 234, 0.3)",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px"
  },
  secondaryButton: {
    padding: "14px 32px",
    fontSize: "15px",
    fontWeight: 600,
    color: "#374151",
    background: "#fff",
    border: "1px solid #d1d5db",
    borderRadius: "12px",
    cursor: "pointer"
  },

  /* Loading */
  loadingContainer: {
    textAlign: "center" as const,
    padding: "80px 40px"
  },
  spinner: {
    width: "48px",
    height: "48px",
    border: "4px solid #e5e7eb",
    borderTopColor: "#667eea",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto 20px"
  },
  loadingText: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#374151",
    marginBottom: "8px"
  },
  loadingSubtext: {
    fontSize: "14px",
    color: "#9ca3af"
  },

  /* Insight Cards */
  insightCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "20px",
    marginBottom: "16px",
    transition: "box-shadow 0.2s"
  },
  insightHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "10px"
  },
  insightTitle: {
    fontSize: "16px",
    fontWeight: 600,
    color: "#1e1b4b"
  },
  severityBadge: {
    padding: "4px 12px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase" as const
  },
  insightDescription: {
    fontSize: "14px",
    lineHeight: 1.7,
    color: "#4b5563",
    marginBottom: "12px"
  },
  insightRecommendation: {
    fontSize: "13px",
    color: "#059669",
    padding: "10px 14px",
    background: "#f0fdf4",
    borderRadius: "8px",
    borderLeft: "3px solid #10b981"
  },
  insightColumns: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap" as const,
    marginTop: "10px"
  },
  columnChip: {
    padding: "4px 10px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 500,
    background: "#eff6ff",
    color: "#1e40af",
    border: "1px solid #bfdbfe"
  },

  /* Feature Cards */
  featureCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "20px",
    marginBottom: "16px",
    display: "flex",
    gap: "16px",
    alignItems: "flex-start",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  featureCardSelected: {
    borderColor: "#667eea",
    background: "#f5f3ff",
    boxShadow: "0 0 0 1px #667eea"
  },
  featureCheckbox: {
    width: "22px",
    height: "22px",
    borderRadius: "6px",
    border: "2px solid #d1d5db",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: "2px",
    transition: "all 0.15s"
  },
  featureCheckboxChecked: {
    background: "#667eea",
    borderColor: "#667eea",
    color: "#fff"
  },
  impactBadge: {
    padding: "3px 10px",
    borderRadius: "10px",
    fontSize: "11px",
    fontWeight: 600
  },
  codeBlock: {
    padding: "12px",
    background: "#1e1e2e",
    borderRadius: "8px",
    fontFamily: "'Fira Code', monospace",
    fontSize: "12px",
    color: "#a6e3a1",
    overflow: "auto",
    marginTop: "10px"
  },

  /* Model Cards */
  modelCard: {
    background: "#fff",
    border: "2px solid #e5e7eb",
    borderRadius: "16px",
    padding: "24px",
    marginBottom: "16px",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  modelCardSelected: {
    borderColor: "#667eea",
    boxShadow: "0 0 0 1px #667eea, 0 4px 16px rgba(102, 126, 234, 0.15)"
  },
  modelRank: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "14px",
    flexShrink: 0
  },
  modelName: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#1e1b4b",
    marginBottom: "6px"
  },
  modelRationale: {
    fontSize: "14px",
    color: "#6b7280",
    lineHeight: 1.6,
    marginBottom: "16px"
  },
  prosConsList: {
    fontSize: "13px",
    padding: "0 0 0 16px",
    margin: "0 0 8px 0"
  },
  hyperparamsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: "8px",
    marginTop: "12px"
  },
  hyperparamItem: {
    padding: "8px 12px",
    background: "#f8fafc",
    borderRadius: "8px",
    fontSize: "12px"
  },
  buttonRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "32px"
  },
  dataProfile: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "20px",
    marginBottom: "24px"
  },
  profileGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "16px",
    marginTop: "12px"
  },
  profileStat: {
    textAlign: "center" as const,
    padding: "16px",
    background: "#f8fafc",
    borderRadius: "10px"
  },
  profileStatValue: {
    fontSize: "24px",
    fontWeight: 700,
    color: "#1e1b4b"
  },
  profileStatLabel: {
    fontSize: "12px",
    color: "#9ca3af",
    marginTop: "4px"
  }
};

/* ==================== Helpers ==================== */

function getSeverityStyle(severity: string) {
  switch (severity) {
    case "critical":
      return { background: "#fee2e2", color: "#991b1b" };
    case "warning":
      return { background: "#fef3c7", color: "#92400e" };
    default:
      return { background: "#dbeafe", color: "#1e40af" };
  }
}

function getImpactStyle(impact: string) {
  switch (impact) {
    case "high":
      return { background: "#dcfce7", color: "#166534" };
    case "medium":
      return { background: "#fef9c3", color: "#854d0e" };
    default:
      return { background: "#f3f4f6", color: "#6b7280" };
  }
}

const STEPS: { key: Step; label: string; num: number }[] = [
  { key: "upload", label: "Upload", num: 1 },
  { key: "eda", label: "EDA", num: 2 },
  { key: "features", label: "Features", num: 3 },
  { key: "model", label: "Model", num: 4 }
];

/* ==================== Component ==================== */

export default function AnalysisPage() {
  const navigate = useNavigate();

  /* Step state */
  const [step, setStep] = useState<Step>("upload");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  /* Upload state */
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [taskDescription, setTaskDescription] = useState("");
  const [targetColumn, setTargetColumn] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* EDA state */
  const [edaResults, setEdaResults] = useState<EDAResponse | null>(null);

  /* Feature state */
  const [featureResults, setFeatureResults] = useState<FeatureSuggestResponse | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<Set<number>>(new Set());

  /* Preprocessing options */
  const [scalingMethod, setScalingMethod] = useState<string>("standard");
  const [encodingMethod, setEncodingMethod] = useState<string>("onehot");
  const [missingStrategy, setMissingStrategy] = useState<string>("mean");

  /* Model state */
  const [modelResults, setModelResults] = useState<ModelRecommendResponse | null>(null);
  const [selectedModel, setSelectedModel] = useState<number>(0);

  /* ---- Upload handlers ---- */

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      alert("Please upload a CSV file.");
      return;
    }

    setIsLoading(true);
    setLoadingMessage("Uploading dataset...");

    try {
      const result = await uploadDataset(file);
      setUploadResult(result);
      setTargetColumn(result.suggested_target || result.columns[result.columns.length - 1]);
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  /* ---- Step transitions ---- */

  const startAnalysis = async () => {
    if (!uploadResult || !targetColumn) return;

    setStep("eda");
    setIsLoading(true);
    setLoadingMessage("AI is analyzing your dataset...");

    try {
      const results = await runEDAAnalysis(uploadResult.file_path, targetColumn, "standard");
      setEdaResults(results);
    } catch (err: any) {
      alert("EDA failed: " + err.message);
      setStep("upload");
    } finally {
      setIsLoading(false);
    }
  };

  const goToFeatures = async () => {
    if (!uploadResult) return;

    setStep("features");
    setIsLoading(true);
    setLoadingMessage("AI is suggesting feature improvements...");

    // Infer task type from description
    const taskType = taskDescription.toLowerCase().includes("regress") ? "regression" : "classification";

    try {
      const results = await getFeatureSuggestions(
        uploadResult.file_path,
        targetColumn,
        taskType
      );
      setFeatureResults(results);
      // Pre-select high-impact features
      const highImpact = new Set<number>();
      results.suggestions.forEach((sug, i) => {
        if (sug.estimated_impact === "high") highImpact.add(i);
      });
      setSelectedFeatures(highImpact);
    } catch (err: any) {
      alert("Feature suggestion failed: " + err.message);
      setStep("eda");
    } finally {
      setIsLoading(false);
    }
  };

  const goToModelSelection = async () => {
    if (!uploadResult) return;

    setStep("model");
    setIsLoading(true);
    setLoadingMessage("AI is recommending the best models...");

    const taskType = taskDescription.toLowerCase().includes("regress") ? "regression" : "classification";

    try {
      const results = await getModelRecommendations(
        uploadResult.file_path,
        targetColumn,
        taskType,
        "accuracy"
      );
      setModelResults(results);
      setSelectedModel(0);
    } catch (err: any) {
      alert("Model recommendation failed: " + err.message);
      setStep("features");
    } finally {
      setIsLoading(false);
    }
  };

  const buildPipeline = () => {
    if (!uploadResult || !modelResults) return;

    const selected = modelResults.recommendations[selectedModel];
    const taskType = taskDescription.toLowerCase().includes("regress") ? "regression" : "classification";

    // Determine the algorithm key from the LLM recommendation
    const modelType = selected?.model_type || "random_forest";

    // Build initial pipeline nodes for PipelineCanvas
    const initialNodes = [
      {
        id: "dataset_auto",
        type: "block",
        position: { x: 250, y: 40 },
        data: {
          label: "DATASET",
          blockType: "dataset",
          params: {
            file_path: uploadResult.file_path,
            target: targetColumn
          }
        }
      },
      {
        id: "split_auto",
        type: "block",
        position: { x: 250, y: 180 },
        data: {
          label: "SPLIT",
          blockType: "split",
          params: { test_size: 0.2 }
        }
      },
      {
        id: "preprocess_auto",
        type: "block",
        position: { x: 250, y: 320 },
        data: {
          label: "FEATURE_PIPELINE",
          blockType: "feature_pipeline",
          params: {}
        }
      },
      {
        id: "model_auto",
        type: "block",
        position: { x: 250, y: 460 },
        data: {
          label: "MODEL",
          blockType: "model",
          params: {
            task: taskType,
            algorithm: modelType,
            n_estimators: selected?.hyperparameters?.n_estimators ?? 100,
            max_depth: selected?.hyperparameters?.max_depth ?? 10
          }
        }
      },
      {
        id: "trainer_auto",
        type: "block",
        position: { x: 250, y: 600 },
        data: {
          label: "TRAINER",
          blockType: "trainer",
          params: { fit_params: {} }
        }
      },
      {
        id: "metrics_auto",
        type: "block",
        position: { x: 250, y: 740 },
        data: {
          label: "METRICS",
          blockType: "metrics",
          params: {}
        }
      }
    ];

    const initialEdges = [
      { id: "e_d_s", source: "dataset_auto", target: "split_auto" },
      { id: "e_s_p", source: "split_auto", target: "preprocess_auto" },
      { id: "e_p_m", source: "preprocess_auto", target: "model_auto" },
      { id: "e_m_t", source: "model_auto", target: "trainer_auto" },
      { id: "e_t_me", source: "trainer_auto", target: "metrics_auto" }
    ];

    navigate("/build", {
      state: {
        initialNodes,
        initialEdges,
        analysisContext: {
          taskDescription,
          edaResults,
          featureResults,
          modelResults,
          selectedModel: selected
        }
      }
    });
  };

  /* ---- Step index helper ---- */
  const stepIndex = STEPS.findIndex((st) => st.key === step);

  /* ==================== Render ==================== */

  return (
    <div style={s.page}>
      {/* Navigation */}
      <div style={s.nav}>
        <div style={s.logo} onClick={() => navigate("/")}>
          <div style={s.logoDot} />
          Smart ML Framework
        </div>

        {/* Stepper */}
        <div style={s.stepper}>
          {STEPS.map((st, i) => (
            <div key={st.key} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{
                  ...s.stepDot,
                  background: i <= stepIndex
                    ? "linear-gradient(135deg, #667eea, #764ba2)"
                    : "#e5e7eb",
                  color: i <= stepIndex ? "#fff" : "#9ca3af"
                }}>
                  {i < stepIndex ? "+" : st.num}
                </div>
                <span style={{ ...s.stepLabel, color: i <= stepIndex ? "#667eea" : "#9ca3af" }}>
                  {st.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  ...s.stepLine,
                  background: i < stepIndex ? "#667eea" : "#e5e7eb",
                  marginBottom: "20px"
                }} />
              )}
            </div>
          ))}
        </div>

        <button style={s.secondaryButton} onClick={() => navigate("/")}>
          Back to Home
        </button>
      </div>

      <div style={s.main}>
        {/* ---- STEP: Upload ---- */}
        {step === "upload" && (
          <>
            <h1 style={s.sectionTitle}>Upload Your Dataset</h1>
            <p style={s.sectionSubtitle}>
              Upload a CSV file and describe what you want to achieve.
            </p>

            {!uploadResult ? (
              <>
                <div
                  style={{
                    ...s.uploadArea,
                    ...(dragOver ? s.uploadAreaActive : {})
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  {isLoading ? (
                    <>
                      <div style={s.spinner} />
                      <div style={s.uploadText}>Uploading...</div>
                    </>
                  ) : (
                    <>
                      <div style={s.uploadIcon}>^</div>
                      <div style={s.uploadText}>
                        Drop your CSV file here or click to browse
                      </div>
                      <div style={s.uploadSubtext}>
                        Supports .csv files up to 100MB
                      </div>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
              </>
            ) : (
              <>
                {/* File Info */}
                <div style={s.fileInfo}>
                  <div style={s.fileIcon}>F</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "15px", fontWeight: 600, color: "#1e1b4b" }}>
                      {uploadResult.filename}
                    </div>
                    <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "2px" }}>
                      {uploadResult.rows.toLocaleString()} rows x {uploadResult.columns.length} columns
                    </div>
                  </div>
                  <button
                    style={{ ...s.secondaryButton, padding: "8px 16px", fontSize: "13px" }}
                    onClick={() => setUploadResult(null)}
                  >
                    Change
                  </button>
                </div>

                {/* Target Column */}
                <div style={{ marginBottom: "24px" }}>
                  <label style={{ fontSize: "14px", fontWeight: 600, color: "#374151", marginBottom: "8px", display: "block" }}>
                    Target Column
                  </label>
                  <select
                    style={s.targetSelect}
                    value={targetColumn}
                    onChange={(e) => setTargetColumn(e.target.value)}
                  >
                    {uploadResult.columns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>

                {/* Task Description */}
                <div style={{ marginBottom: "32px" }}>
                  <label style={{ fontSize: "14px", fontWeight: 600, color: "#374151", marginBottom: "8px", display: "block" }}>
                    Describe Your Task
                  </label>
                  <input
                    style={s.promptInput}
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="e.g., I want to classify customer churn using Random Forest"
                  />
                </div>

                <button
                  style={{
                    ...s.primaryButton,
                    opacity: !taskDescription.trim() ? 0.5 : 1,
                    cursor: !taskDescription.trim() ? "not-allowed" : "pointer"
                  }}
                  onClick={startAnalysis}
                  disabled={!taskDescription.trim()}
                >
                  Start Analysis
                  <span>-&gt;</span>
                </button>
              </>
            )}
          </>
        )}

        {/* ---- STEP: EDA ---- */}
        {step === "eda" && (
          <>
            <h1 style={s.sectionTitle}>Exploratory Data Analysis</h1>
            <p style={s.sectionSubtitle}>
              AI has analyzed your dataset. Review the insights below.
            </p>

            {isLoading ? (
              <div style={s.loadingContainer}>
                <div style={s.spinner} />
                <div style={s.loadingText}>{loadingMessage}</div>
                <div style={s.loadingSubtext}>
                  Analyzing distributions, correlations, and data quality...
                </div>
              </div>
            ) : edaResults ? (
              <>
                {/* Data Profile Summary */}
                <div style={s.dataProfile}>
                  <div style={{ fontSize: "16px", fontWeight: 600, color: "#1e1b4b", marginBottom: "4px" }}>
                    Data Profile
                  </div>
                  <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "6px" }}>{edaResults.summary}</div>
                  <div style={{ fontSize: "12px", color: "#9ca3af", lineHeight: 1.6, marginBottom: "8px", padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", borderLeft: "3px solid #667eea" }}>
                    This section gives you a high-level overview of your dataset's size and overall quality. The quality score is based on completeness (missing values), consistency, and data types. A higher score means your data is cleaner and more ready for modeling.
                  </div>

                  <div style={s.profileGrid}>
                    <div style={s.profileStat}>
                      <div style={s.profileStatValue}>
                        {edaResults.data_profile?.shape?.[0]?.toLocaleString() ?? "N/A"}
                      </div>
                      <div style={s.profileStatLabel}>Rows</div>
                    </div>
                    <div style={s.profileStat}>
                      <div style={s.profileStatValue}>
                        {edaResults.data_profile?.shape?.[1] ?? "N/A"}
                      </div>
                      <div style={s.profileStatLabel}>Columns</div>
                    </div>
                    <div style={s.profileStat}>
                      <div style={{
                        ...s.profileStatValue,
                        color: (edaResults.data_quality_score ?? 0) > 70 ? "#059669" : "#dc2626"
                      }}>
                        {edaResults.data_quality_score ?? "N/A"}%
                      </div>
                      <div style={s.profileStatLabel}>Quality Score</div>
                    </div>
                  </div>
                </div>

                {/* ===== Column Statistics with Visual Bars ===== */}
                {edaResults.data_profile?.columns && (
                  <div style={{ ...s.dataProfile }}>
                    <div style={{ fontSize: "16px", fontWeight: 600, color: "#1e1b4b", marginBottom: "4px" }}>
                      Column Overview
                    </div>
                    <div style={{ fontSize: "12px", color: "#9ca3af", lineHeight: 1.6, marginBottom: "16px", padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", borderLeft: "3px solid #667eea" }}>
                      Each row represents a column in your dataset. The <strong>Type</strong> tells you if a feature is numeric (numbers) or categorical (text/labels). The <strong>Missing</strong> bar shows how much data is absent -- red means a lot of missing values which can hurt model accuracy. The <strong>Distribution</strong> bar shows where the average value falls relative to the min/max range, helping you spot skewed or unbalanced features.
                    </div>

                    {/* Type breakdown bar */}
                    {(() => {
                      const cols = edaResults.data_profile.columns;
                      const numericCount = Object.values(cols).filter((c: any) => c.dtype?.includes("int") || c.dtype?.includes("float")).length;
                      const catCount = Object.keys(cols).length - numericCount;
                      const total = Object.keys(cols).length;
                      return (
                        <div style={{ marginBottom: "20px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>
                            <span>Numeric: {numericCount}</span>
                            <span>Categorical: {catCount}</span>
                          </div>
                          <div style={{ display: "flex", height: "10px", borderRadius: "5px", overflow: "hidden", background: "#f3f4f6" }}>
                            <div style={{ width: `${(numericCount / total) * 100}%`, background: "linear-gradient(90deg, #667eea, #818cf8)", transition: "width 0.5s" }} />
                            <div style={{ width: `${(catCount / total) * 100}%`, background: "linear-gradient(90deg, #f59e0b, #fbbf24)", transition: "width 0.5s" }} />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Per-column stats table */}
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                        <thead>
                          <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                            <th style={{ textAlign: "left", padding: "8px 12px", color: "#6b7280", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Column</th>
                            <th style={{ textAlign: "left", padding: "8px 12px", color: "#6b7280", fontSize: "11px", textTransform: "uppercase" }}>Type</th>
                            <th style={{ textAlign: "left", padding: "8px 12px", color: "#6b7280", fontSize: "11px", textTransform: "uppercase" }}>Missing</th>
                            <th style={{ textAlign: "left", padding: "8px 12px", color: "#6b7280", fontSize: "11px", textTransform: "uppercase", minWidth: "160px" }}>Distribution</th>
                            <th style={{ textAlign: "right", padding: "8px 12px", color: "#6b7280", fontSize: "11px", textTransform: "uppercase" }}>Unique</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(edaResults.data_profile.columns).map(([colName, colData]: [string, any]) => {
                            const totalRows = edaResults.data_profile?.shape?.[0] ?? 1;
                            const missingPct = ((colData.missing ?? 0) / totalRows) * 100;
                            const isNumeric = colData.dtype?.includes("int") || colData.dtype?.includes("float");

                            // Normalize value for bar (use mean relative to max)
                            let barPct = 50;
                            if (isNumeric && colData.max !== undefined && colData.max !== 0) {
                              barPct = Math.abs(((colData.mean ?? 0) / colData.max) * 100);
                            }

                            return (
                              <tr key={colName} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                <td style={{ padding: "10px 12px", fontWeight: 600, color: "#1e1b4b" }}>
                                  {colName}
                                  {colName === targetColumn && (
                                    <span style={{ marginLeft: "6px", fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "#ede9fe", color: "#7c3aed", fontWeight: 600 }}>TARGET</span>
                                  )}
                                </td>
                                <td style={{ padding: "10px 12px" }}>
                                  <span style={{
                                    padding: "3px 8px",
                                    borderRadius: "6px",
                                    fontSize: "11px",
                                    fontWeight: 500,
                                    background: isNumeric ? "#eff6ff" : "#fef3c7",
                                    color: isNumeric ? "#1e40af" : "#92400e"
                                  }}>
                                    {isNumeric ? "numeric" : "categorical"}
                                  </span>
                                </td>
                                <td style={{ padding: "10px 12px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <div style={{ width: "40px", height: "6px", borderRadius: "3px", background: "#f3f4f6", overflow: "hidden" }}>
                                      <div style={{
                                        width: `${Math.min(missingPct, 100)}%`,
                                        height: "100%",
                                        background: missingPct > 20 ? "#ef4444" : missingPct > 5 ? "#f59e0b" : "#10b981",
                                        borderRadius: "3px"
                                      }} />
                                    </div>
                                    <span style={{ fontSize: "12px", color: missingPct > 20 ? "#ef4444" : "#6b7280" }}>
                                      {missingPct.toFixed(1)}%
                                    </span>
                                  </div>
                                </td>
                                <td style={{ padding: "10px 12px" }}>
                                  {isNumeric ? (
                                    <div>
                                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <div style={{ flex: 1, height: "8px", borderRadius: "4px", background: "#f3f4f6", overflow: "hidden" }}>
                                          <div style={{
                                            width: `${Math.min(barPct, 100)}%`,
                                            height: "100%",
                                            background: "linear-gradient(90deg, #667eea, #818cf8)",
                                            borderRadius: "4px",
                                            transition: "width 0.5s"
                                          }} />
                                        </div>
                                      </div>
                                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#9ca3af", marginTop: "3px" }}>
                                        <span>{colData.min?.toFixed(1)}</span>
                                        <span>avg: {colData.mean?.toFixed(2)}</span>
                                        <span>{colData.max?.toFixed(1)}</span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: "12px", color: "#6b7280" }}>
                                      {colData.unique ?? "?"} categories
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 500, color: "#374151" }}>
                                  {colData.unique ?? "-"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ===== Missing Values Chart ===== */}
                {edaResults.data_profile?.columns && (() => {
                  const cols = edaResults.data_profile.columns;
                  const totalRows = edaResults.data_profile?.shape?.[0] ?? 1;
                  const missingCols = Object.entries(cols)
                    .filter(([, v]: [string, any]) => (v.missing ?? 0) > 0)
                    .sort((a: any, b: any) => b[1].missing - a[1].missing);

                  if (missingCols.length === 0) return null;

                  return (
                    <div style={{ ...s.dataProfile }}>
                      <div style={{ fontSize: "16px", fontWeight: 600, color: "#1e1b4b", marginBottom: "4px" }}>
                        Missing Values
                      </div>
                      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>
                        {missingCols.length} column{missingCols.length > 1 ? "s" : ""} with missing data
                      </div>
                      <div style={{ fontSize: "12px", color: "#9ca3af", lineHeight: 1.6, marginBottom: "16px", padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", borderLeft: "3px solid #667eea" }}>
                        Missing values are gaps in your data where no value was recorded. Columns with high missing rates (red bars) may need imputation (filling in estimated values) or removal. Green bars indicate minimal missing data. Most ML algorithms cannot handle missing values directly, so these must be addressed before training.
                      </div>
                      {missingCols.map(([name, data]: [string, any]) => {
                        const pct = ((data.missing ?? 0) / totalRows) * 100;
                        return (
                          <div key={name} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                            <div style={{ width: "120px", fontSize: "13px", fontWeight: 500, color: "#374151", textAlign: "right" }}>
                              {name}
                            </div>
                            <div style={{ flex: 1, height: "12px", borderRadius: "6px", background: "#f3f4f6", overflow: "hidden" }}>
                              <div style={{
                                width: `${Math.min(pct, 100)}%`,
                                height: "100%",
                                borderRadius: "6px",
                                background: pct > 30 ? "linear-gradient(90deg, #ef4444, #f87171)"
                                  : pct > 10 ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                                  : "linear-gradient(90deg, #10b981, #34d399)"
                              }} />
                            </div>
                            <div style={{ width: "80px", fontSize: "12px", fontWeight: 600, color: pct > 30 ? "#ef4444" : pct > 10 ? "#f59e0b" : "#10b981" }}>
                              {data.missing} ({pct.toFixed(1)}%)
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* ===== Target Variable Analysis ===== */}
                {edaResults.target_analysis && (
                  <div style={{ ...s.dataProfile }}>
                    <div style={{ fontSize: "16px", fontWeight: 600, color: "#1e1b4b", marginBottom: "4px" }}>
                      Target Variable Analysis
                    </div>
                    <div style={{ fontSize: "12px", color: "#9ca3af", lineHeight: 1.6, marginBottom: "8px", padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", borderLeft: "3px solid #667eea" }}>
                      The target variable is the column your model will learn to predict. These statistics summarize its characteristics -- including how many unique values it has, its data type, and basic distribution stats. Understanding your target helps determine whether this is a classification (discrete categories) or regression (continuous values) problem.
                    </div>
                    <div style={{ display: "flex", gap: "12px", marginTop: "12px", flexWrap: "wrap" }}>
                      {Object.entries(edaResults.target_analysis).map(([key, value]) => (
                        <div key={key} style={{
                          padding: "10px 16px",
                          background: "#f8fafc",
                          borderRadius: "10px",
                          border: "1px solid #e5e7eb"
                        }}>
                          <div style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            {key.replace(/_/g, " ")}
                          </div>
                          <div style={{ fontSize: "15px", fontWeight: 600, color: "#1e1b4b", marginTop: "2px" }}>
                            {String(value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ===== Feature Distribution Charts ===== */}
                {edaResults.data_profile?.columns && (() => {
                  const cols = edaResults.data_profile.columns;
                  const histCols = Object.entries(cols).filter(
                    ([, v]: [string, any]) => v.histogram?.counts
                  );
                  if (histCols.length === 0) return null;
                  return (
                    <div style={{ ...s.dataProfile }}>
                      <div style={{ fontSize: "16px", fontWeight: 600, color: "#1e1b4b", marginBottom: "4px" }}>
                        Feature Distributions
                      </div>
                      <div style={{ fontSize: "12px", color: "#9ca3af", lineHeight: 1.6, marginBottom: "16px", padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", borderLeft: "3px solid #667eea" }}>
                        Each histogram shows how values are spread out for a numeric feature. A bell-shaped curve indicates normally distributed data, while bars piled on one side suggest skewed data. The <strong>skew</strong> badge measures asymmetry -- values near 0 mean balanced distribution (green), while values above 1 or below -1 indicate significant skew (yellow) that may benefit from log or power transformations. Hover over bars to see exact bin ranges and counts.
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                        {histCols.slice(0, 12).map(([name, data]: [string, any]) => {
                          const hist = data.histogram;
                          const maxCount = Math.max(...hist.counts);
                          const skew = data.skew ?? 0;
                          return (
                            <div key={name} style={{
                              padding: "16px",
                              background: "#f8fafc",
                              borderRadius: "12px",
                              border: "1px solid #e5e7eb"
                            }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                                <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e1b4b" }}>
                                  {name}
                                  {name === targetColumn && (
                                    <span style={{ marginLeft: "6px", fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "#ede9fe", color: "#7c3aed", fontWeight: 600 }}>TARGET</span>
                                  )}
                                </div>
                                <span style={{
                                  fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "6px",
                                  background: Math.abs(skew) > 1 ? "#fef3c7" : "#dcfce7",
                                  color: Math.abs(skew) > 1 ? "#92400e" : "#166534"
                                }}>
                                  skew: {skew.toFixed(2)}
                                </span>
                              </div>
                              {/* Histogram bars */}
                              <div style={{ display: "flex", alignItems: "flex-end", gap: "1px", height: "60px" }}>
                                {hist.counts.map((count: number, idx: number) => (
                                  <div
                                    key={idx}
                                    style={{
                                      flex: 1,
                                      height: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%`,
                                      background: name === targetColumn
                                        ? "linear-gradient(180deg, #a78bfa, #7c3aed)"
                                        : "linear-gradient(180deg, #93c5fd, #3b82f6)",
                                      borderRadius: "2px 2px 0 0",
                                      minHeight: count > 0 ? "2px" : "0px",
                                      transition: "height 0.3s"
                                    }}
                                    title={`${hist.bin_edges[idx].toFixed(1)} - ${hist.bin_edges[idx + 1].toFixed(1)}: ${count}`}
                                  />
                                ))}
                              </div>
                              {/* Axis labels */}
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#9ca3af", marginTop: "4px" }}>
                                <span>{data.min?.toFixed(1)}</span>
                                <span>median: {data.median?.toFixed(2)}</span>
                                <span>{data.max?.toFixed(1)}</span>
                              </div>
                              {/* Stats row */}
                              <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                                <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "#eff6ff", color: "#1e40af" }}>
                                  mean: {data.mean?.toFixed(2)}
                                </span>
                                <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "#eff6ff", color: "#1e40af" }}>
                                  std: {data.std?.toFixed(2)}
                                </span>
                                <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "#eff6ff", color: "#1e40af" }}>
                                  Q1: {data.q25?.toFixed(2)} | Q3: {data.q75?.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* ===== Correlation Heatmap ===== */}
                {edaResults.data_profile?.correlations && edaResults.data_profile?.correlation_columns && (() => {
                  const cols = edaResults.data_profile.correlation_columns as string[];
                  const corr = edaResults.data_profile.correlations as Record<string, Record<string, number>>;
                  if (cols.length < 2) return null;
                  const displayCols = cols.slice(0, 12); // limit to 12 for readability

                  const getColor = (val: number) => {
                    const abs = Math.abs(val);
                    if (val > 0) {
                      const r = Math.round(255 - abs * 200);
                      const g = Math.round(255 - abs * 80);
                      return `rgb(${r}, ${g}, 255)`;
                    } else {
                      const g = Math.round(255 - abs * 200);
                      const b = Math.round(255 - abs * 80);
                      return `rgb(255, ${g}, ${b})`;
                    }
                  };

                  return (
                    <div style={{ ...s.dataProfile }}>
                      <div style={{ fontSize: "16px", fontWeight: 600, color: "#1e1b4b", marginBottom: "4px" }}>
                        Correlation Matrix
                      </div>
                      <div style={{ fontSize: "12px", color: "#9ca3af", lineHeight: 1.6, marginBottom: "16px", padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", borderLeft: "3px solid #667eea" }}>
                        This heatmap shows the linear relationship (Pearson correlation) between every pair of numeric features. Values range from <strong>-1</strong> (perfect negative correlation -- as one goes up, the other goes down) to <strong>+1</strong> (perfect positive correlation -- both move together). Values near <strong>0</strong> mean no linear relationship. Strongly correlated features (above 0.7 or below -0.7) may be redundant, and removing one can reduce overfitting. Features highly correlated with the target are usually strong predictors.
                      </div>
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ borderCollapse: "collapse", fontSize: "11px" }}>
                          <thead>
                            <tr>
                              <th style={{ padding: "6px 8px", textAlign: "left", color: "#6b7280", fontSize: "10px" }}></th>
                              {displayCols.map((c) => (
                                <th key={c} style={{
                                  padding: "6px 4px", textAlign: "center", color: "#6b7280", fontSize: "10px",
                                  maxWidth: "60px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                  writingMode: "vertical-rl", height: "80px"
                                }}>
                                  {c}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {displayCols.map((row) => (
                              <tr key={row}>
                                <td style={{
                                  padding: "6px 8px", fontWeight: 600, color: "#374151", fontSize: "10px",
                                  maxWidth: "90px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                                }}>
                                  {row}
                                </td>
                                {displayCols.map((col) => {
                                  const val = corr[row]?.[col] ?? 0;
                                  const isDiag = row === col;
                                  return (
                                    <td key={col} style={{
                                      padding: "2px",
                                      textAlign: "center"
                                    }}>
                                      <div
                                        style={{
                                          width: "36px",
                                          height: "36px",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          borderRadius: "4px",
                                          background: isDiag ? "#1e1b4b" : getColor(val),
                                          color: isDiag || Math.abs(val) > 0.6 ? "#fff" : "#374151",
                                          fontSize: "9px",
                                          fontWeight: Math.abs(val) > 0.5 ? 700 : 400
                                        }}
                                        title={`${row} vs ${col}: ${val.toFixed(3)}`}
                                      >
                                        {isDiag ? "1" : val.toFixed(2)}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {/* Color legend */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px", fontSize: "10px", color: "#6b7280" }}>
                        <span>-1.0</span>
                        <div style={{
                          flex: 1, maxWidth: "200px", height: "10px", borderRadius: "5px",
                          background: "linear-gradient(90deg, rgb(255, 55, 175), #f3f4f6, rgb(55, 175, 255))"
                        }} />
                        <span>+1.0</span>
                        <span style={{ marginLeft: "8px" }}>Strong negative = red, Strong positive = blue</span>
                      </div>
                    </div>
                  );
                })()}

                {/* ===== Target Class Balance / Distribution ===== */}
                {edaResults.data_profile?.target_distribution && (() => {
                  const dist = edaResults.data_profile.target_distribution as Record<string, number>;
                  const entries = Object.entries(dist).sort((a, b) => b[1] - a[1]);
                  const total = entries.reduce((sum, [, v]) => sum + v, 0);
                  const maxVal = Math.max(...entries.map(([, v]) => v));
                  const colors = ["#667eea", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

                  return (
                    <div style={{ ...s.dataProfile }}>
                      <div style={{ fontSize: "16px", fontWeight: 600, color: "#1e1b4b", marginBottom: "4px" }}>
                        Target Class Balance
                      </div>
                      <div style={{ fontSize: "12px", color: "#9ca3af", lineHeight: 1.6, marginBottom: "8px", padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", borderLeft: "3px solid #667eea" }}>
                        This chart shows how many samples belong to each class in your target variable. Ideally, classes should be roughly balanced. If one class vastly outnumbers the others (imbalanced data), the model may become biased toward the majority class and perform poorly on minority classes. Techniques like SMOTE (oversampling), class weights, or stratified sampling can help address imbalance.
                      </div>
                      {/* Stacked bar */}
                      <div style={{ display: "flex", height: "28px", borderRadius: "8px", overflow: "hidden", marginBottom: "16px" }}>
                        {entries.map(([label, count], i) => (
                          <div
                            key={label}
                            style={{
                              width: `${(count / total) * 100}%`,
                              background: colors[i % colors.length],
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "10px",
                              fontWeight: 600,
                              color: "#fff",
                              minWidth: "1px"
                            }}
                            title={`${label}: ${count} (${((count / total) * 100).toFixed(1)}%)`}
                          >
                            {(count / total) > 0.08 ? `${((count / total) * 100).toFixed(0)}%` : ""}
                          </div>
                        ))}
                      </div>
                      {/* Individual bars */}
                      {entries.map(([label, count], i) => (
                        <div key={label} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                          <div style={{
                            width: "10px", height: "10px", borderRadius: "3px",
                            background: colors[i % colors.length], flexShrink: 0
                          }} />
                          <div style={{ width: "80px", fontSize: "13px", fontWeight: 500, color: "#374151" }}>
                            {String(label)}
                          </div>
                          <div style={{ flex: 1, height: "14px", borderRadius: "7px", background: "#f3f4f6", overflow: "hidden" }}>
                            <div style={{
                              width: `${(count / maxVal) * 100}%`,
                              height: "100%",
                              background: colors[i % colors.length],
                              borderRadius: "7px",
                              transition: "width 0.5s"
                            }} />
                          </div>
                          <div style={{ minWidth: "80px", textAlign: "right", fontSize: "12px", color: "#6b7280" }}>
                            {count.toLocaleString()} ({((count / total) * 100).toFixed(1)}%)
                          </div>
                        </div>
                      ))}
                      {/* Balance indicator */}
                      {entries.length >= 2 && (() => {
                        const ratio = entries[entries.length - 1][1] / entries[0][1];
                        const isBalanced = ratio > 0.5;
                        return (
                          <div style={{
                            marginTop: "12px", padding: "10px 14px", borderRadius: "8px",
                            background: isBalanced ? "#f0fdf4" : "#fef3c7",
                            borderLeft: `3px solid ${isBalanced ? "#10b981" : "#f59e0b"}`,
                            fontSize: "13px",
                            color: isBalanced ? "#166534" : "#92400e"
                          }}>
                            {isBalanced
                              ? "Classes are relatively balanced. Standard training should work well."
                              : `Imbalanced classes detected (ratio: 1:${(1 / ratio).toFixed(1)}). Consider using SMOTE, class weights, or stratified sampling.`
                            }
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}

                {/* ===== Target Distribution (Regression) ===== */}
                {edaResults.data_profile?.target_histogram && (() => {
                  const hist = edaResults.data_profile.target_histogram as { counts: number[]; bin_edges: number[] };
                  const maxCount = Math.max(...hist.counts);
                  return (
                    <div style={{ ...s.dataProfile }}>
                      <div style={{ fontSize: "16px", fontWeight: 600, color: "#1e1b4b", marginBottom: "4px" }}>
                        Target Distribution
                      </div>
                      <div style={{ fontSize: "12px", color: "#9ca3af", lineHeight: 1.6, marginBottom: "8px", padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", borderLeft: "3px solid #667eea" }}>
                        This histogram shows the distribution of your continuous target variable. For regression tasks, a normally distributed target generally leads to better model performance. If the distribution is heavily skewed (most values clustered on one side), applying a log or square-root transformation can improve prediction accuracy. Outlier values at the extremes may also need special handling.
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "80px" }}>
                        {hist.counts.map((count: number, idx: number) => (
                          <div
                            key={idx}
                            style={{
                              flex: 1,
                              height: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%`,
                              background: "linear-gradient(180deg, #a78bfa, #7c3aed)",
                              borderRadius: "3px 3px 0 0",
                              minHeight: count > 0 ? "2px" : "0px"
                            }}
                            title={`${hist.bin_edges[idx].toFixed(2)} - ${hist.bin_edges[idx + 1].toFixed(2)}: ${count}`}
                          />
                        ))}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#9ca3af", marginTop: "4px" }}>
                        <span>{hist.bin_edges[0].toFixed(2)}</span>
                        <span>{hist.bin_edges[hist.bin_edges.length - 1].toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* ===== Insights ===== */}
                <div style={{ fontSize: "16px", fontWeight: 600, color: "#1e1b4b", marginBottom: "4px" }}>
                  Insights ({edaResults.insights.length})
                </div>
                <div style={{ fontSize: "12px", color: "#9ca3af", lineHeight: 1.6, marginBottom: "16px", padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", borderLeft: "3px solid #667eea" }}>
                  These are AI-generated observations about your data. Each insight is tagged by severity: <strong style={{ color: "#991b1b" }}>critical</strong> issues can significantly hurt model performance and should be addressed, <strong style={{ color: "#92400e" }}>warnings</strong> are worth investigating, and <strong style={{ color: "#1e40af" }}>info</strong> items are general observations. The recommendation in each card suggests a concrete action you can take.
                </div>

                {edaResults.insights.map((insight: EDAInsight, i: number) => (
                  <div key={i} style={s.insightCard}>
                    <div style={s.insightHeader}>
                      <div style={s.insightTitle}>{insight.title}</div>
                      <span style={{ ...s.severityBadge, ...getSeverityStyle(insight.severity) }}>
                        {insight.severity}
                      </span>
                    </div>
                    <div style={s.insightDescription}>{insight.description}</div>
                    {insight.recommendation && (
                      <div style={s.insightRecommendation}>
                        {insight.recommendation}
                      </div>
                    )}
                    {insight.affected_columns && insight.affected_columns.length > 0 && (
                      <div style={s.insightColumns}>
                        {insight.affected_columns.map((col) => (
                          <span key={col} style={s.columnChip}>{col}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Preprocessing Recommendations */}
                {edaResults.recommended_preprocessing && edaResults.recommended_preprocessing.length > 0 && (
                  <div style={{ ...s.dataProfile, marginTop: "24px" }}>
                    <div style={{ fontSize: "16px", fontWeight: 600, color: "#1e1b4b", marginBottom: "4px" }}>
                      Recommended Preprocessing
                    </div>
                    <div style={{ fontSize: "12px", color: "#9ca3af", lineHeight: 1.6, marginBottom: "12px", padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", borderLeft: "3px solid #667eea" }}>
                      These are the preprocessing steps AI recommends applying to your data before training a model. Preprocessing transforms raw data into a format that ML algorithms can learn from more effectively -- such as scaling numbers to similar ranges, encoding text categories as numbers, or handling missing values.
                    </div>
                    <ol style={{ paddingLeft: "20px", margin: 0 }}>
                      {edaResults.recommended_preprocessing.map((step, i) => (
                        <li key={i} style={{ fontSize: "14px", color: "#374151", padding: "6px 0", lineHeight: 1.6 }}>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                <div style={s.buttonRow}>
                  <button style={s.secondaryButton} onClick={() => setStep("upload")}>
                    Back
                  </button>
                  <button style={s.primaryButton} onClick={goToFeatures}>
                    Continue to Feature Engineering
                    <span>-&gt;</span>
                  </button>
                </div>
              </>
            ) : null}
          </>
        )}

        {/* ---- STEP: Feature Engineering ---- */}
        {step === "features" && (
          <>
            <h1 style={s.sectionTitle}>Feature Engineering</h1>
            <p style={s.sectionSubtitle}>
              AI suggests these features to improve your model. Select which ones to apply.
            </p>

            {isLoading ? (
              <div style={s.loadingContainer}>
                <div style={s.spinner} />
                <div style={s.loadingText}>{loadingMessage}</div>
                <div style={s.loadingSubtext}>
                  Analyzing feature interactions and transformations...
                </div>
              </div>
            ) : featureResults ? (
              <>
                {/* Select All / Deselect All */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 20px",
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    marginBottom: "16px"
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}
                    onClick={() => {
                      if (selectedFeatures.size === featureResults.suggestions.length) {
                        setSelectedFeatures(new Set());
                      } else {
                        setSelectedFeatures(new Set(featureResults.suggestions.map((_, i) => i)));
                      }
                    }}
                  >
                    <div style={{
                      ...s.featureCheckbox,
                      ...(selectedFeatures.size === featureResults.suggestions.length
                        ? s.featureCheckboxChecked
                        : selectedFeatures.size > 0
                          ? { background: "#c7d2fe", borderColor: "#667eea" }
                          : {})
                    }}>
                      {selectedFeatures.size === featureResults.suggestions.length
                        ? "+"
                        : selectedFeatures.size > 0
                          ? "-"
                          : ""}
                    </div>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#374151" }}>
                      {selectedFeatures.size === featureResults.suggestions.length
                        ? "Deselect All"
                        : "Select All"}
                    </span>
                  </div>
                  <span style={{ fontSize: "13px", color: "#9ca3af" }}>
                    {selectedFeatures.size} of {featureResults.suggestions.length} selected
                  </span>
                </div>

                {featureResults.suggestions.map((feat: FeatureSuggestion, i: number) => {
                  const isSelected = selectedFeatures.has(i);
                  return (
                    <div
                      key={i}
                      style={{
                        ...s.featureCard,
                        ...(isSelected ? s.featureCardSelected : {})
                      }}
                      onClick={() => {
                        setSelectedFeatures((prev) => {
                          const next = new Set(prev);
                          if (next.has(i)) next.delete(i);
                          else next.add(i);
                          return next;
                        });
                      }}
                    >
                      <div style={{
                        ...s.featureCheckbox,
                        ...(isSelected ? s.featureCheckboxChecked : {})
                      }}>
                        {isSelected ? "+" : ""}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                          <div style={{ fontSize: "15px", fontWeight: 600, color: "#1e1b4b" }}>
                            {feat.name}
                          </div>
                          <span style={{ ...s.impactBadge, ...getImpactStyle(feat.estimated_impact) }}>
                            {feat.estimated_impact} impact
                          </span>
                        </div>
                        <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.6, marginBottom: "8px" }}>
                          {feat.rationale}
                        </div>
                        <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                          Transformation: {feat.transformation}
                        </div>
                        {feat.code && (
                          <div style={s.codeBlock}>
                            <code>{feat.code}</code>
                          </div>
                        )}
                        {feat.dependencies.length > 0 && (
                          <div style={{ ...s.insightColumns, marginTop: "8px" }}>
                            {feat.dependencies.map((dep) => (
                              <span key={dep} style={s.columnChip}>{dep}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* ===== Preprocessing Options ===== */}
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#1e1b4b", marginTop: "32px", marginBottom: "8px" }}>
                  Preprocessing Options
                </div>
                <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "20px" }}>
                  Configure how your data will be preprocessed before training.
                  {featureResults.scaling_recommendations?.suggested_method && (
                    <span> AI recommends <strong>{featureResults.scaling_recommendations.suggested_method}</strong> scaling.</span>
                  )}
                  {featureResults.encoding_recommendations?.suggested_encoding && (
                    <span> AI recommends <strong>{featureResults.encoding_recommendations.suggested_encoding}</strong> encoding.</span>
                  )}
                </p>

                {/* Scaling Method */}
                <div style={{ ...s.dataProfile, marginBottom: "16px" }}>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "#1e1b4b", marginBottom: "4px" }}>
                    Feature Scaling
                  </div>
                  <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "14px" }}>
                    Normalize feature ranges to improve model convergence
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "10px" }}>
                    {[
                      { key: "standard", label: "Standard Scaler", desc: "Zero mean, unit variance" },
                      { key: "minmax", label: "MinMax Scaler", desc: "Scale to [0, 1] range" },
                      { key: "robust", label: "Robust Scaler", desc: "Handles outliers well" },
                      { key: "maxabs", label: "MaxAbs Scaler", desc: "Scale by max absolute" },
                      { key: "none", label: "No Scaling", desc: "Keep original values" }
                    ].map((opt) => {
                      const isActive = scalingMethod === opt.key;
                      const isRecommended = featureResults.scaling_recommendations?.suggested_method?.toLowerCase().includes(opt.key);
                      return (
                        <div
                          key={opt.key}
                          onClick={() => setScalingMethod(opt.key)}
                          style={{
                            padding: "14px 16px",
                            borderRadius: "12px",
                            border: isActive ? "2px solid #667eea" : "1px solid #e5e7eb",
                            background: isActive ? "#f5f3ff" : "#fff",
                            cursor: "pointer",
                            transition: "all 0.15s",
                            position: "relative" as const
                          }}
                        >
                          {isRecommended && (
                            <span style={{
                              position: "absolute" as const, top: "-8px", right: "8px",
                              fontSize: "10px", fontWeight: 600, padding: "2px 8px",
                              borderRadius: "8px", background: "#dbeafe", color: "#1e40af"
                            }}>AI Pick</span>
                          )}
                          <div style={{ fontSize: "13px", fontWeight: 600, color: isActive ? "#4338ca" : "#374151", marginBottom: "3px" }}>
                            {opt.label}
                          </div>
                          <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                            {opt.desc}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Encoding Method */}
                <div style={{ ...s.dataProfile, marginBottom: "16px" }}>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "#1e1b4b", marginBottom: "4px" }}>
                    Categorical Encoding
                  </div>
                  <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "14px" }}>
                    Convert categorical features to numerical representation
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "10px" }}>
                    {[
                      { key: "onehot", label: "One-Hot", desc: "Binary column per category" },
                      { key: "label", label: "Label Encoding", desc: "Integer per category" },
                      { key: "target", label: "Target Encoding", desc: "Mean target per category" },
                      { key: "ordinal", label: "Ordinal", desc: "Ordered integer mapping" },
                      { key: "frequency", label: "Frequency", desc: "Category frequency ratio" }
                    ].map((opt) => {
                      const isActive = encodingMethod === opt.key;
                      const isRecommended = featureResults.encoding_recommendations?.suggested_encoding?.toLowerCase().includes(opt.key);
                      return (
                        <div
                          key={opt.key}
                          onClick={() => setEncodingMethod(opt.key)}
                          style={{
                            padding: "14px 16px",
                            borderRadius: "12px",
                            border: isActive ? "2px solid #667eea" : "1px solid #e5e7eb",
                            background: isActive ? "#f5f3ff" : "#fff",
                            cursor: "pointer",
                            transition: "all 0.15s",
                            position: "relative" as const
                          }}
                        >
                          {isRecommended && (
                            <span style={{
                              position: "absolute" as const, top: "-8px", right: "8px",
                              fontSize: "10px", fontWeight: 600, padding: "2px 8px",
                              borderRadius: "8px", background: "#dbeafe", color: "#1e40af"
                            }}>AI Pick</span>
                          )}
                          <div style={{ fontSize: "13px", fontWeight: 600, color: isActive ? "#4338ca" : "#374151", marginBottom: "3px" }}>
                            {opt.label}
                          </div>
                          <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                            {opt.desc}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Missing Value Strategy */}
                <div style={{ ...s.dataProfile, marginBottom: "16px" }}>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "#1e1b4b", marginBottom: "4px" }}>
                    Missing Value Handling
                  </div>
                  <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "14px" }}>
                    Strategy for dealing with missing or null values in your data
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "10px" }}>
                    {[
                      { key: "mean", label: "Mean Imputation", desc: "Fill with column mean" },
                      { key: "median", label: "Median Imputation", desc: "Fill with column median" },
                      { key: "mode", label: "Mode Imputation", desc: "Fill with most frequent" },
                      { key: "drop", label: "Drop Rows", desc: "Remove rows with nulls" },
                      { key: "zero", label: "Fill with Zero", desc: "Replace nulls with 0" }
                    ].map((opt) => {
                      const isActive = missingStrategy === opt.key;
                      return (
                        <div
                          key={opt.key}
                          onClick={() => setMissingStrategy(opt.key)}
                          style={{
                            padding: "14px 16px",
                            borderRadius: "12px",
                            border: isActive ? "2px solid #667eea" : "1px solid #e5e7eb",
                            background: isActive ? "#f5f3ff" : "#fff",
                            cursor: "pointer",
                            transition: "all 0.15s"
                          }}
                        >
                          <div style={{ fontSize: "13px", fontWeight: 600, color: isActive ? "#4338ca" : "#374151", marginBottom: "3px" }}>
                            {opt.label}
                          </div>
                          <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                            {opt.desc}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={s.buttonRow}>
                  <button style={s.secondaryButton} onClick={() => setStep("eda")}>
                    Back
                  </button>
                  <button style={s.primaryButton} onClick={goToModelSelection}>
                    Continue to Model Selection
                    <span>-&gt;</span>
                  </button>
                </div>
              </>
            ) : null}
          </>
        )}

        {/* ---- STEP: Model Recommendation ---- */}
        {step === "model" && (
          <>
            <h1 style={s.sectionTitle}>Model Recommendation</h1>
            <p style={s.sectionSubtitle}>
              AI recommends these models for your task. Select one to build your pipeline.
            </p>

            {isLoading ? (
              <div style={s.loadingContainer}>
                <div style={s.spinner} />
                <div style={s.loadingText}>{loadingMessage}</div>
                <div style={s.loadingSubtext}>
                  Analyzing dataset characteristics and matching models...
                </div>
              </div>
            ) : modelResults ? (
              <>
                {/* Analysis Summary */}
                {modelResults.analysis && Object.keys(modelResults.analysis).length > 0 && (
                  <div style={{ ...s.dataProfile, marginBottom: "24px" }}>
                    <div style={{ fontSize: "16px", fontWeight: 600, color: "#1e1b4b", marginBottom: "8px" }}>
                      Analysis
                    </div>
                    {Object.entries(modelResults.analysis).map(([key, value]) => (
                      <div key={key} style={{ fontSize: "13px", color: "#6b7280", padding: "4px 0" }}>
                        <strong>{key.replace(/_/g, " ")}:</strong> {String(value)}
                      </div>
                    ))}
                  </div>
                )}

                {modelResults.recommendations.map((model: ModelRecommendation, i: number) => (
                  <div
                    key={i}
                    style={{
                      ...s.modelCard,
                      ...(selectedModel === i ? s.modelCardSelected : {})
                    }}
                    onClick={() => setSelectedModel(i)}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                      <div style={{
                        ...s.modelRank,
                        background: i === 0 ? "linear-gradient(135deg, #667eea, #764ba2)" :
                          i === 1 ? "#e5e7eb" : "#f3f4f6",
                        color: i === 0 ? "#fff" : "#6b7280"
                      }}>
                        {model.rank}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={s.modelName}>{model.model_name}</div>
                        <div style={s.modelRationale}>{model.rationale}</div>

                        <div style={{ display: "flex", gap: "24px", marginBottom: "16px" }}>
                          <div>
                            <div style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase", marginBottom: "4px" }}>
                              Performance
                            </div>
                            <span style={{
                              ...s.impactBadge,
                              ...getImpactStyle(model.estimated_performance)
                            }}>
                              {model.estimated_performance}
                            </span>
                          </div>
                          <div>
                            <div style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase", marginBottom: "4px" }}>
                              Speed
                            </div>
                            <span style={{
                              ...s.impactBadge,
                              ...getImpactStyle(model.training_time === "fast" ? "high" : model.training_time === "medium" ? "medium" : "low")
                            }}>
                              {model.training_time}
                            </span>
                          </div>
                          <div>
                            <div style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase", marginBottom: "4px" }}>
                              Interpretability
                            </div>
                            <span style={{
                              ...s.impactBadge,
                              ...getImpactStyle(model.interpretability)
                            }}>
                              {model.interpretability}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "32px" }}>
                          <div>
                            <div style={{ fontSize: "12px", fontWeight: 600, color: "#059669", marginBottom: "6px" }}>
                              Pros
                            </div>
                            <ul style={s.prosConsList}>
                              {model.pros.map((p, j) => (
                                <li key={j} style={{ color: "#6b7280", padding: "2px 0" }}>{p}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <div style={{ fontSize: "12px", fontWeight: 600, color: "#dc2626", marginBottom: "6px" }}>
                              Cons
                            </div>
                            <ul style={s.prosConsList}>
                              {model.cons.map((c, j) => (
                                <li key={j} style={{ color: "#6b7280", padding: "2px 0" }}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {model.hyperparameters && Object.keys(model.hyperparameters).length > 0 && (
                          <>
                            <div style={{ fontSize: "12px", fontWeight: 600, color: "#374151", marginTop: "12px", marginBottom: "6px" }}>
                              Suggested Hyperparameters
                            </div>
                            <div style={s.hyperparamsGrid}>
                              {Object.entries(model.hyperparameters).map(([key, val]) => (
                                <div key={key} style={s.hyperparamItem}>
                                  <span style={{ color: "#9ca3af" }}>{key}: </span>
                                  <strong>{String(val)}</strong>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <div style={s.buttonRow}>
                  <button style={s.secondaryButton} onClick={() => setStep("features")}>
                    Back
                  </button>
                  <button style={s.primaryButton} onClick={buildPipeline}>
                    Build Pipeline
                    <span>-&gt;</span>
                  </button>
                </div>
              </>
            ) : null}
          </>
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
