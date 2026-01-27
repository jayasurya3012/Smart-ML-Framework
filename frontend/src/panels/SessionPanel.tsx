import { useState, useEffect } from "react";
import { listSessions, deleteSession } from "../services/api";
import type { Session } from "../services/api";

interface Props {
  currentSessionId: string | null;
  onLoadSession: (session: Session) => void;
  onNewSession: () => void;
}

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
  header: {
    padding: "20px",
    borderBottom: "1px solid #e5e7eb",
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
  headerSubtitle: {
    fontSize: "13px",
    color: "#6b7280",
    marginTop: "4px"
  },
  content: {
    flex: 1,
    padding: "16px",
    overflowY: "auto" as const
  },
  newButton: {
    width: "100%",
    padding: "12px 16px",
    fontSize: "14px",
    fontWeight: 600,
    color: "#fff",
    background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    marginBottom: "20px",
    boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)"
  },
  sectionTitle: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    marginBottom: "12px"
  },
  sessionList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "10px"
  },
  sessionCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "14px",
    cursor: "pointer",
    transition: "all 0.15s"
  },
  sessionCardActive: {
    borderColor: "#3b82f6",
    background: "#eff6ff",
    boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)"
  },
  sessionCardHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: "8px"
  },
  sessionName: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#1a1a2e",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  sessionMeta: {
    fontSize: "12px",
    color: "#6b7280",
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px"
  },
  sessionStats: {
    display: "flex",
    gap: "12px",
    marginTop: "8px",
    fontSize: "12px",
    color: "#9ca3af"
  },
  deleteButton: {
    padding: "4px 8px",
    fontSize: "12px",
    color: "#dc2626",
    background: "transparent",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    opacity: 0.7,
    transition: "all 0.15s"
  },
  emptyState: {
    textAlign: "center" as const,
    padding: "40px 20px",
    color: "#6b7280"
  },
  emptyIcon: {
    fontSize: "40px",
    marginBottom: "12px",
    opacity: 0.5
  },
  loadingState: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px",
    gap: "12px",
    color: "#6b7280"
  },
  spinner: {
    width: "20px",
    height: "20px",
    border: "2px solid #e5e7eb",
    borderTopColor: "#3b82f6",
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
  }
};

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Less than a minute
  if (diff < 60 * 1000) {
    return "Just now";
  }

  // Less than an hour
  if (diff < 60 * 60 * 1000) {
    const mins = Math.floor(diff / (60 * 1000));
    return `${mins} min${mins > 1 ? "s" : ""} ago`;
  }

  // Less than a day
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }

  // Less than a week
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }

  // Otherwise show date
  return date.toLocaleDateString();
}

export default function SessionPanel({ currentSessionId, onLoadSession, onNewSession }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      const response = await listSessions();
      setSessions(response.sessions);
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this session?")) {
      return;
    }

    setDeletingId(sessionId);
    try {
      await deleteSession(sessionId);
      setSessions(sessions.filter(s => s.id !== sessionId));
    } catch (err) {
      console.error("Failed to delete session:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.headerTitle}>
          <span>📚</span>
          Session History
        </h3>
        <p style={styles.headerSubtitle}>
          Your pipelines are saved automatically
        </p>
      </div>

      <div style={styles.content}>
        <button style={styles.newButton} onClick={onNewSession}>
          <span>✨</span>
          New Pipeline
        </button>

        <div style={styles.sectionTitle}>Recent Sessions</div>

        {isLoading ? (
          <div style={styles.loadingState}>
            <div style={styles.spinner} />
            <span>Loading...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📭</div>
            <div style={{ fontSize: "14px", fontWeight: 500, marginBottom: "4px" }}>
              No sessions yet
            </div>
            <div style={{ fontSize: "13px" }}>
              Create a new pipeline to get started
            </div>
          </div>
        ) : (
          <div style={styles.sessionList}>
            {sessions.map((session) => (
              <div
                key={session.id}
                style={{
                  ...styles.sessionCard,
                  ...(session.id === currentSessionId ? styles.sessionCardActive : {})
                }}
                onClick={() => onLoadSession(session)}
                onMouseOver={(e) => {
                  if (session.id !== currentSessionId) {
                    e.currentTarget.style.borderColor = "#d1d5db";
                    e.currentTarget.style.background = "#f9fafb";
                  }
                }}
                onMouseOut={(e) => {
                  if (session.id !== currentSessionId) {
                    e.currentTarget.style.borderColor = "#e5e7eb";
                    e.currentTarget.style.background = "#fff";
                  }
                }}
              >
                <div style={styles.sessionCardHeader}>
                  <div style={styles.sessionName}>
                    {session.id === currentSessionId && <span>●</span>}
                    {session.name}
                  </div>
                  <button
                    style={{
                      ...styles.deleteButton,
                      opacity: deletingId === session.id ? 0.5 : 0.7
                    }}
                    onClick={(e) => handleDelete(e, session.id)}
                    disabled={deletingId === session.id}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = "#fef2f2";
                      e.currentTarget.style.opacity = "1";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.opacity = "0.7";
                    }}
                  >
                    🗑️
                  </button>
                </div>

                <div style={styles.sessionMeta}>
                  <span>Updated {formatDate(session.updated_at)}</span>
                </div>

                <div style={styles.sessionStats}>
                  <span>📦 {session.data.nodes.length} blocks</span>
                  <span>🔗 {session.data.edges.length} connections</span>
                </div>
              </div>
            ))}
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
