import { useState, useRef, useEffect } from "react";
import type { Node, Edge } from "reactflow";
import { sendChatMessage, runEDAAnalysis } from "../services/llmApi";
import type { ChatMessage, ChatAction, EDAResponse, EDAInsight } from "../services/llmApi";

interface Props {
  nodes: Node[];
  edges: Edge[];
  onAddBlock: (type: string, params?: Record<string, any>) => void;
  onRunPipeline: () => void;
  datasetFilePath?: string;
  targetColumn?: string;
}

const styles = {
  container: {
    width: "380px",
    height: "100vh",
    borderLeft: "1px solid #e5e7eb",
    background: "#fff",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden"
  },
  header: {
    padding: "16px 20px",
    borderBottom: "1px solid #e5e7eb",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#fff"
  },
  headerTitle: {
    fontSize: "16px",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  headerSubtitle: {
    fontSize: "12px",
    opacity: 0.9,
    marginTop: "4px"
  },
  messagesContainer: {
    flex: 1,
    overflow: "auto",
    padding: "16px"
  },
  message: {
    marginBottom: "16px",
    maxWidth: "90%"
  },
  userMessage: {
    marginLeft: "auto",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: "16px 16px 4px 16px",
    fontSize: "14px",
    lineHeight: 1.5
  },
  assistantMessage: {
    background: "#f3f4f6",
    padding: "12px 16px",
    borderRadius: "16px 16px 16px 4px",
    fontSize: "14px",
    lineHeight: 1.5,
    color: "#1f2937"
  },
  actionButtons: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "8px",
    marginTop: "12px"
  },
  actionButton: {
    padding: "8px 14px",
    fontSize: "12px",
    fontWeight: 500,
    background: "#fff",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "all 0.15s"
  },
  inputContainer: {
    padding: "16px",
    borderTop: "1px solid #e5e7eb",
    background: "#f9fafb"
  },
  inputWrapper: {
    display: "flex",
    gap: "8px"
  },
  input: {
    flex: 1,
    padding: "12px 16px",
    fontSize: "14px",
    border: "1px solid #d1d5db",
    borderRadius: "12px",
    outline: "none",
    transition: "border-color 0.15s"
  },
  sendButton: {
    padding: "12px 20px",
    fontSize: "14px",
    fontWeight: 600,
    color: "#fff",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "opacity 0.15s"
  },
  quickActions: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "8px",
    marginTop: "12px"
  },
  quickAction: {
    padding: "8px 12px",
    fontSize: "12px",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    cursor: "pointer",
    transition: "all 0.15s"
  },
  loadingDots: {
    display: "flex",
    gap: "4px",
    padding: "12px 16px"
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#9ca3af",
    animation: "bounce 1.4s infinite ease-in-out"
  },
  insightCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "12px",
    marginTop: "12px"
  },
  insightHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px"
  },
  insightTitle: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#1f2937"
  },
  insightDescription: {
    fontSize: "12px",
    color: "#4b5563",
    lineHeight: 1.5
  },
  severityBadge: {
    padding: "2px 8px",
    borderRadius: "10px",
    fontSize: "10px",
    fontWeight: 600,
    textTransform: "uppercase" as const
  }
};

const QUICK_ACTIONS = [
  { label: "Analyze my data", action: "run_eda" },
  { label: "Suggest a model", action: "suggest_model" },
  { label: "Create pipeline", action: "create_pipeline" },
  { label: "Explain metrics", action: "explain_metrics" }
];

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

function getCategoryIcon(category: string) {
  switch (category) {
    case "quality":
      return "!";
    case "correlation":
      return "~";
    case "distribution":
      return "#";
    case "anomaly":
      return "?";
    default:
      return "*";
  }
}

export default function ChatPanel({
  nodes,
  edges,
  onAddBlock,
  onRunPipeline,
  datasetFilePath,
  targetColumn
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! I'm your ML assistant. I can help you build pipelines, analyze data, and suggest models. What would you like to do?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [edaResults, setEdaResults] = useState<EDAResponse | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await sendChatMessage({
        message: userMessage,
        session_id: sessionId || undefined,
        pipeline_context: { nodes, edges }
      });

      setSessionId(response.session_id);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.message }
      ]);

      // Execute any actions
      if (response.actions) {
        executeActions(response.actions);
      }
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, I encountered an error: ${error.message}. Please try again.`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const executeActions = (actions: ChatAction[]) => {
    for (const action of actions) {
      switch (action.type) {
        case "add_block":
          if (action.block_type) {
            onAddBlock(action.block_type, action.params);
          }
          break;
        case "run_pipeline":
          onRunPipeline();
          break;
        case "run_eda":
          handleRunEDA();
          break;
      }
    }
  };

  const handleQuickAction = async (action: string) => {
    switch (action) {
      case "run_eda":
        await handleRunEDA();
        break;
      case "suggest_model":
        setInput("What model should I use for my data?");
        break;
      case "create_pipeline":
        setInput("Help me create a machine learning pipeline");
        break;
      case "explain_metrics":
        setInput("Explain the evaluation metrics");
        break;
    }
  };

  const handleRunEDA = async () => {
    if (!datasetFilePath) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Please upload a dataset first. Add a Dataset block and configure it with a file."
        }
      ]);
      return;
    }

    setIsLoading(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: "Analyze my dataset" }
    ]);

    try {
      const results = await runEDAAnalysis(datasetFilePath, targetColumn);
      setEdaResults(results);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: results.summary
        }
      ]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Failed to analyze data: ${error.message}`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <span>*</span>
          ML Assistant
        </div>
        <div style={styles.headerSubtitle}>
          Ask me anything about building your pipeline
        </div>
      </div>

      {/* Messages */}
      <div style={styles.messagesContainer}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              ...styles.message,
              ...(msg.role === "user" ? { marginLeft: "auto" } : {})
            }}
          >
            <div
              style={
                msg.role === "user"
                  ? styles.userMessage
                  : styles.assistantMessage
              }
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* EDA Insights */}
        {edaResults && edaResults.insights.length > 0 && (
          <div style={{ marginTop: "16px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "8px" }}>
              Data Insights ({edaResults.insights.length})
            </div>
            {edaResults.insights.slice(0, 5).map((insight, i) => (
              <div key={i} style={styles.insightCard}>
                <div style={styles.insightHeader}>
                  <span style={{ fontSize: "16px" }}>{getCategoryIcon(insight.category)}</span>
                  <span style={styles.insightTitle}>{insight.title}</span>
                  <span style={{ ...styles.severityBadge, ...getSeverityStyle(insight.severity) }}>
                    {insight.severity}
                  </span>
                </div>
                <div style={styles.insightDescription}>{insight.description}</div>
                {insight.recommendation && (
                  <div style={{ fontSize: "11px", color: "#059669", marginTop: "8px", fontStyle: "italic" }}>
                    Tip: {insight.recommendation}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div style={styles.message}>
            <div style={styles.assistantMessage}>
              <div style={styles.loadingDots}>
                <div style={{ ...styles.dot, animationDelay: "0s" }} />
                <div style={{ ...styles.dot, animationDelay: "0.2s" }} />
                <div style={{ ...styles.dot, animationDelay: "0.4s" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={styles.inputContainer}>
        {/* Quick Actions */}
        <div style={styles.quickActions}>
          {QUICK_ACTIONS.map((qa) => (
            <button
              key={qa.action}
              style={styles.quickAction}
              onClick={() => handleQuickAction(qa.action)}
              disabled={isLoading}
            >
              {qa.label}
            </button>
          ))}
        </div>

        <div style={{ ...styles.inputWrapper, marginTop: "12px" }}>
          <input
            style={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything..."
            disabled={isLoading}
          />
          <button
            style={{
              ...styles.sendButton,
              opacity: isLoading ? 0.6 : 1,
              cursor: isLoading ? "not-allowed" : "pointer"
            }}
            onClick={handleSend}
            disabled={isLoading}
          >
            Send
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
