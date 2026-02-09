/**
 * LLM API service for intelligent ML assistance.
 */

const API_BASE = "http://localhost:8000";

// ==================== Types ====================

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
}

export interface ChatAction {
  type: "add_block" | "update_block" | "remove_block" | "run_pipeline" | "run_eda" | "download_dataset";
  block_type?: string;
  block_id?: string;
  params?: Record<string, any>;
}

export interface ChatRequest {
  message: string;
  session_id?: string;
  pipeline_context?: {
    nodes: any[];
    edges: any[];
  };
}

export interface ChatResponse {
  message: string;
  session_id: string;
  suggestions?: Record<string, any>[];
  actions?: ChatAction[];
}

export interface EDAInsight {
  category: "distribution" | "correlation" | "quality" | "anomaly" | "recommendation";
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
  affected_columns?: string[];
  recommendation?: string;
}

export interface EDAResponse {
  summary: string;
  insights: EDAInsight[];
  data_quality_score?: number;
  data_profile: Record<string, any>;
  recommended_preprocessing?: string[];
  target_analysis?: Record<string, any>;
}

export interface FeatureSuggestion {
  name: string;
  description: string;
  transformation: string;
  code: string;
  rationale: string;
  estimated_impact: "low" | "medium" | "high";
  dependencies: string[];
}

export interface FeatureSuggestResponse {
  suggestions: FeatureSuggestion[];
  interaction_features?: Record<string, any>[];
  encoding_recommendations?: Record<string, any>;
  scaling_recommendations?: Record<string, any>;
}

export interface ModelRecommendation {
  rank: number;
  model_name: string;
  model_type: string;
  rationale: string;
  pros: string[];
  cons: string[];
  hyperparameters: Record<string, any>;
  estimated_performance: "low" | "medium" | "high";
  training_time: "fast" | "medium" | "slow";
  interpretability: "low" | "medium" | "high";
}

export interface ModelRecommendResponse {
  recommendations: ModelRecommendation[];
  analysis: Record<string, any>;
  preprocessing_required?: string[];
  cross_validation_strategy?: string;
}

export interface PipelineSuggestion {
  type: string;
  params: Record<string, any>;
  explanation: string;
}

export interface PipelineSuggestionResponse {
  message: string;
  understood_intent: string;
  suggested_blocks: PipelineSuggestion[];
  suggested_connections?: { from: string; to: string }[];
  questions?: string[];
  tips?: string[];
}

// ==================== API Functions ====================

/**
 * Send a chat message to the LLM assistant.
 */
export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/llm/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || "Chat request failed");
  }

  return response.json();
}

/**
 * Run LLM-powered EDA analysis on a dataset.
 */
export async function runEDAAnalysis(
  filePath: string,
  targetColumn?: string,
  depth: "quick" | "standard" | "deep" = "standard"
): Promise<EDAResponse> {
  const response = await fetch(`${API_BASE}/llm/analyze/eda`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      file_path: filePath,
      target_column: targetColumn,
      analysis_depth: depth
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || "EDA analysis failed");
  }

  return response.json();
}

/**
 * Get feature engineering suggestions.
 */
export async function getFeatureSuggestions(
  filePath: string,
  targetColumn: string,
  taskType: "classification" | "regression" = "classification"
): Promise<FeatureSuggestResponse> {
  const response = await fetch(`${API_BASE}/llm/suggest/features`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      file_path: filePath,
      target_column: targetColumn,
      task_type: taskType
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || "Feature suggestion failed");
  }

  return response.json();
}

/**
 * Get model recommendations.
 */
export async function getModelRecommendations(
  filePath: string,
  targetColumn: string,
  taskType: "classification" | "regression" = "classification",
  priority: "accuracy" | "speed" | "interpretability" = "accuracy"
): Promise<ModelRecommendResponse> {
  const response = await fetch(`${API_BASE}/llm/suggest/model`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      file_path: filePath,
      target_column: targetColumn,
      task_type: taskType,
      priority
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || "Model recommendation failed");
  }

  return response.json();
}

/**
 * Get pipeline suggestions from natural language.
 */
export async function getPipelineSuggestions(
  userMessage: string,
  currentPipeline?: { nodes: any[]; edges: any[] }
): Promise<PipelineSuggestionResponse> {
  const response = await fetch(`${API_BASE}/llm/suggest/pipeline`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_message: userMessage,
      current_pipeline: currentPipeline
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || "Pipeline suggestion failed");
  }

  return response.json();
}
