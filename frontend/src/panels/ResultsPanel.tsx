interface Props {
  result: {
    status: "success" | "error";
    metrics?: Record<string, number>;
    predictions_preview?: number[];
    logs?: string[];
    error?: string;
  } | null;
  isRunning: boolean;
}

const styles = {
  container: {
    width: "340px",
    height: "100vh",
    borderLeft: "1px solid #e0e0e0",
    background: "linear-gradient(180deg, #fafbfc 0%, #f0f2f5 100%)",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden"
  },
  header: {
    padding: "20px 20px 16px",
    borderBottom: "1px solid #e0e0e0",
    background: "#fff"
  },
  headerTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 600,
    color: "#1a1a2e",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  content: {
    flex: 1,
    padding: "20px",
    overflowY: "auto" as const
  },
  emptyState: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "#6b7280",
    textAlign: "center" as const
  },
  emptyIcon: {
    fontSize: "48px",
    marginBottom: "16px",
    opacity: 0.5
  },
  loadingContainer: {
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
    border: "3px solid #e0e0e0",
    borderTopColor: "#3b82f6",
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
  },
  successBanner: {
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "#fff",
    padding: "16px",
    borderRadius: "12px",
    marginBottom: "20px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)"
  },
  errorBanner: {
    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    color: "#fff",
    padding: "16px",
    borderRadius: "12px",
    marginBottom: "20px",
    boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)"
  },
  errorTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: 600,
    marginBottom: "8px"
  },
  errorMessage: {
    fontSize: "13px",
    opacity: 0.95,
    lineHeight: 1.5,
    wordBreak: "break-word" as const
  },
  section: {
    marginBottom: "20px"
  },
  sectionTitle: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    marginBottom: "12px"
  },
  metricsGrid: {
    display: "grid",
    gap: "12px"
  },
  metricCard: {
    background: "#fff",
    borderRadius: "12px",
    padding: "16px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
    border: "1px solid #e5e7eb"
  },
  metricLabel: {
    fontSize: "12px",
    color: "#6b7280",
    textTransform: "uppercase" as const,
    letterSpacing: "0.3px",
    marginBottom: "4px"
  },
  metricValue: {
    fontSize: "28px",
    fontWeight: 700,
    color: "#1a1a2e",
    fontFamily: "system-ui, -apple-system, sans-serif"
  },
  metricPercent: {
    fontSize: "14px",
    color: "#10b981",
    fontWeight: 500,
    marginLeft: "4px"
  },
  predictionsCard: {
    background: "#fff",
    borderRadius: "12px",
    padding: "16px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    border: "1px solid #e5e7eb"
  },
  predictionsList: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "8px",
    marginTop: "8px"
  },
  predictionChip: {
    background: "#f3f4f6",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#374151"
  }
};

export default function ResultsPanel({ result, isRunning }: Props) {
  // Format metric value based on type
  const formatMetric = (key: string, value: number) => {
    if (key === "accuracy") {
      return {
        display: (value * 100).toFixed(2),
        suffix: "%",
        isPercentage: true
      };
    }
    if (key === "mse" || key === "rmse" || key === "mae") {
      return {
        display: value.toFixed(4),
        suffix: "",
        isPercentage: false
      };
    }
    return {
      display: value.toFixed(4),
      suffix: "",
      isPercentage: false
    };
  };

  // Format metric name for display
  const formatMetricName = (key: string) => {
    const names: Record<string, string> = {
      accuracy: "Accuracy",
      mse: "Mean Squared Error",
      rmse: "Root Mean Squared Error",
      mae: "Mean Absolute Error",
      r2: "R² Score",
      f1: "F1 Score",
      precision: "Precision",
      recall: "Recall"
    };
    return names[key] || key.toUpperCase();
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.headerTitle}>
          <span style={{ fontSize: "18px" }}>📊</span>
          Pipeline Results
        </h3>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Loading State */}
        {isRunning && (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner} />
            <div style={{ color: "#6b7280", fontSize: "14px" }}>
              Executing pipeline...
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isRunning && !result && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🧪</div>
            <div style={{ fontSize: "14px", fontWeight: 500, marginBottom: "8px" }}>
              No Results Yet
            </div>
            <div style={{ fontSize: "13px", maxWidth: "200px" }}>
              Connect your blocks and run the pipeline to see metrics here
            </div>
          </div>
        )}

        {/* Error State */}
        {!isRunning && result?.status === "error" && (
          <div style={styles.errorBanner}>
            <div style={styles.errorTitle}>
              <span>⚠️</span>
              Pipeline Failed
            </div>
            <div style={styles.errorMessage}>
              {result.error}
            </div>
          </div>
        )}

        {/* Success State */}
        {!isRunning && result?.status === "success" && (
          <>
            {/* Success Banner */}
            <div style={styles.successBanner}>
              <span style={{ fontSize: "24px" }}>✓</span>
              <div>
                <div style={{ fontWeight: 600 }}>Pipeline Complete</div>
                <div style={{ fontSize: "13px", opacity: 0.9 }}>
                  All blocks executed successfully
                </div>
              </div>
            </div>

            {/* Metrics Section */}
            {result.metrics && Object.keys(result.metrics).length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>Model Performance</div>
                <div style={styles.metricsGrid}>
                  {Object.entries(result.metrics).map(([key, value]) => {
                    const formatted = formatMetric(key, value);
                    return (
                      <div key={key} style={styles.metricCard}>
                        <div style={styles.metricLabel}>
                          {formatMetricName(key)}
                        </div>
                        <div style={styles.metricValue}>
                          {formatted.display}
                          {formatted.isPercentage && (
                            <span style={styles.metricPercent}>%</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Predictions Preview */}
            {result.predictions_preview && result.predictions_preview.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>Predictions Preview</div>
                <div style={styles.predictionsCard}>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>
                    First {result.predictions_preview.length} predictions:
                  </div>
                  <div style={styles.predictionsList}>
                    {result.predictions_preview.map((pred, idx) => (
                      <span key={idx} style={styles.predictionChip}>
                        {typeof pred === "number" ? pred.toFixed(2) : pred}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
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
