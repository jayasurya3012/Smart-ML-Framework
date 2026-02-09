const API_BASE = "http://localhost:8000";

// ==================== Pipeline API ====================

export async function runPipeline(pipeline: any[]) {
  const response = await fetch(`${API_BASE}/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(pipeline)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err);
  }

  return response.json();
}

// ==================== Upload API ====================

export interface ColumnAnalysis {
  numeric: string[];
  categorical: string[];
  boolean: string[];
  missing: string[];
  total_missing: number;
}

export interface UploadResponse {
  status: string;
  file_path: string;
  filename: string;
  columns: string[];
  suggested_target: string;
  suggested_task?: "classification" | "regression";
  column_analysis?: ColumnAnalysis;
  rows: number;
  preview: Record<string, any>[];
}

export async function uploadDataset(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err);
  }

  return response.json();
}

// ==================== Dataset Download API ====================

export interface FileOption {
  name: string;
  size_kb: number;
}

export interface DatasetDownloadResponse {
  status: "success" | "select_file";
  // Success fields (same as UploadResponse)
  file_path?: string;
  filename?: string;
  columns?: string[];
  suggested_target?: string;
  suggested_task?: "classification" | "regression";
  column_analysis?: ColumnAnalysis;
  rows?: number;
  preview?: Record<string, any>[];
  // Select file fields
  source?: string;
  dataset_name?: string;
  available_files?: FileOption[];
  download_path?: string;
}

export async function downloadDataset(request: {
  url: string;
  selected_file?: string;
}): Promise<DatasetDownloadResponse> {
  const response = await fetch(`${API_BASE}/download-dataset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || `Download failed (${response.status})`);
  }

  return response.json();
}

export interface UploadedFile {
  filename: string;
  file_path: string;
  columns: string[];
  rows: number;
}

export async function listUploads(): Promise<{ files: UploadedFile[] }> {
  const response = await fetch(`${API_BASE}/uploads`);

  if (!response.ok) {
    throw new Error("Failed to fetch uploads");
  }

  return response.json();
}

// ==================== Session API ====================

export interface SessionNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
}

export interface SessionEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface SessionData {
  nodes: SessionNode[];
  edges: SessionEdge[];
}

export interface Session {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  data: SessionData;
}

export async function createSession(
  name: string | null,
  data: SessionData
): Promise<Session> {
  const response = await fetch(`${API_BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, data })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err);
  }

  return response.json();
}

export async function listSessions(): Promise<{ sessions: Session[] }> {
  const response = await fetch(`${API_BASE}/sessions`);

  if (!response.ok) {
    throw new Error("Failed to fetch sessions");
  }

  return response.json();
}

export async function getLatestSession(): Promise<{ session: Session | null }> {
  const response = await fetch(`${API_BASE}/sessions/latest`);

  if (!response.ok) {
    throw new Error("Failed to fetch latest session");
  }

  return response.json();
}

export async function getSession(sessionId: string): Promise<Session> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}`);

  if (!response.ok) {
    throw new Error("Session not found");
  }

  return response.json();
}

export async function updateSession(
  sessionId: string,
  name?: string,
  data?: SessionData
): Promise<Session> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, data })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err);
  }

  return response.json();
}

export async function deleteSession(
  sessionId: string
): Promise<{ status: string; id: string }> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    throw new Error("Failed to delete session");
  }

  return response.json();
}

// ==================== Model API ====================

export interface ModelInfo {
  filename: string;
  task: string;
  trained_at: string;
  n_samples: number;
  n_features: number;
  feature_names: string[];
  target_name: string;
  file_size_kb?: number;
}

export interface PredictResponse {
  predictions: (number | string)[];
  probabilities?: number[][];
  n_samples: number;
}

export async function listModels(): Promise<{ models: ModelInfo[] }> {
  const response = await fetch(`${API_BASE}/models`);

  if (!response.ok) {
    throw new Error("Failed to fetch models");
  }

  return response.json();
}

export async function getModelInfo(filename: string): Promise<ModelInfo> {
  const response = await fetch(`${API_BASE}/models/${filename}`);

  if (!response.ok) {
    throw new Error("Model not found");
  }

  return response.json();
}

export function getModelDownloadUrl(filename: string): string {
  return `${API_BASE}/models/${filename}/download`;
}

export async function predictWithModel(
  filename: string,
  features: Record<string, any>[]
): Promise<PredictResponse> {
  const response = await fetch(`${API_BASE}/models/${filename}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ features })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err);
  }

  return response.json();
}

export async function deleteModel(
  filename: string
): Promise<{ status: string; filename: string }> {
  const response = await fetch(`${API_BASE}/models/${filename}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    throw new Error("Failed to delete model");
  }

  return response.json();
}

// ==================== Inspector API ====================

export interface ColumnStats {
  name: string;
  dtype: string;
  count: number;
  missing: number;
  missing_pct: number;
  unique: number;
  mean?: number;
  std?: number;
  min?: number;
  max?: number;
  q25?: number;
  q50?: number;
  q75?: number;
  top_values?: { value: string; count: number }[];
}

export interface DatasetStatsResponse {
  filename: string;
  rows: number;
  columns: number;
  memory_mb: number;
  column_stats: ColumnStats[];
  preview: Record<string, any>[];
  missing_summary: Record<string, number>;
  dtypes_summary: Record<string, number>;
}

export interface CodeExecuteResponse {
  success: boolean;
  output: string;
  error?: string;
  df_shape?: number[];
  df_preview?: Record<string, any>[];
  df_columns?: string[];
  execution_time_ms: number;
}

export async function getDatasetStats(filePath: string): Promise<DatasetStatsResponse> {
  const response = await fetch(`${API_BASE}/inspector/stats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_path: filePath })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to get dataset stats");
  }

  return response.json();
}

export async function executeCode(
  filePath: string,
  code: string,
  saveChanges: boolean = false
): Promise<CodeExecuteResponse> {
  const response = await fetch(`${API_BASE}/inspector/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      file_path: filePath,
      code: code,
      save_changes: saveChanges
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to execute code");
  }

  return response.json();
}

export async function applyTransform(
  filePath: string,
  transformType: string,
  params: Record<string, any>
): Promise<{
  success: boolean;
  message: string;
  original_shape: number[];
  new_shape: number[];
  preview: Record<string, any>[];
}> {
  const response = await fetch(`${API_BASE}/inspector/transform`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      file_path: filePath,
      transform_type: transformType,
      params: params
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to apply transform");
  }

  return response.json();
}
