import { useNavigate } from "react-router-dom";

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
    color: "#fff",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    overflow: "auto"
  },
  nav: {
    width: "100%",
    padding: "24px 48px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },
  logo: {
    fontSize: "20px",
    fontWeight: 700,
    letterSpacing: "-0.5px",
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  logoDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #667eea, #764ba2)"
  },
  hero: {
    maxWidth: "900px",
    textAlign: "center" as const,
    padding: "80px 40px 60px"
  },
  badge: {
    display: "inline-block",
    padding: "6px 16px",
    borderRadius: "20px",
    background: "rgba(102, 126, 234, 0.15)",
    border: "1px solid rgba(102, 126, 234, 0.3)",
    fontSize: "13px",
    fontWeight: 500,
    color: "#a5b4fc",
    marginBottom: "24px"
  },
  title: {
    fontSize: "56px",
    fontWeight: 800,
    lineHeight: 1.1,
    letterSpacing: "-2px",
    marginBottom: "24px"
  },
  titleGradient: {
    background: "linear-gradient(135deg, #667eea 0%, #a855f7 50%, #ec4899 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text"
  },
  subtitle: {
    fontSize: "20px",
    lineHeight: 1.6,
    color: "rgba(255, 255, 255, 0.7)",
    maxWidth: "640px",
    margin: "0 auto 48px"
  },
  cardsContainer: {
    display: "flex",
    gap: "32px",
    padding: "0 40px 80px",
    maxWidth: "1000px",
    width: "100%",
    justifyContent: "center"
  },
  card: {
    flex: 1,
    maxWidth: "440px",
    borderRadius: "24px",
    padding: "40px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    position: "relative" as const,
    overflow: "hidden"
  },
  cardAnalyze: {
    background: "linear-gradient(145deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.12) 100%)"
  },
  cardBuild: {
    background: "linear-gradient(145deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.12) 100%)"
  },
  cardIcon: {
    width: "72px",
    height: "72px",
    borderRadius: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "32px",
    marginBottom: "24px"
  },
  cardTitle: {
    fontSize: "24px",
    fontWeight: 700,
    marginBottom: "12px",
    letterSpacing: "-0.5px"
  },
  cardDescription: {
    fontSize: "15px",
    lineHeight: 1.7,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: "28px"
  },
  cardFeatures: {
    listStyle: "none",
    padding: 0,
    margin: "0 0 28px 0"
  },
  cardFeature: {
    fontSize: "14px",
    color: "rgba(255, 255, 255, 0.7)",
    padding: "8px 0",
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  featureCheck: {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: 700,
    flexShrink: 0
  },
  cardButton: {
    width: "100%",
    padding: "16px 24px",
    borderRadius: "14px",
    border: "none",
    fontSize: "16px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    transition: "all 0.2s"
  },
  features: {
    maxWidth: "900px",
    padding: "0 40px 80px",
    textAlign: "center" as const
  },
  featuresTitle: {
    fontSize: "16px",
    fontWeight: 600,
    color: "rgba(255, 255, 255, 0.4)",
    textTransform: "uppercase" as const,
    letterSpacing: "2px",
    marginBottom: "32px"
  },
  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "20px"
  },
  featureItem: {
    padding: "24px",
    borderRadius: "16px",
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    textAlign: "left" as const
  },
  featureItemIcon: {
    fontSize: "24px",
    marginBottom: "12px"
  },
  featureItemTitle: {
    fontSize: "15px",
    fontWeight: 600,
    marginBottom: "6px",
    color: "#fff"
  },
  featureItemDesc: {
    fontSize: "13px",
    color: "rgba(255, 255, 255, 0.5)",
    lineHeight: 1.5
  }
};

const ANALYZE_FEATURES = [
  "LLM-powered exploratory data analysis",
  "Automated feature engineering",
  "Smart model recommendations",
  "Step-by-step guided pipeline creation"
];

const BUILD_FEATURES = [
  "Drag-and-drop visual pipeline builder",
  "Custom block configuration",
  "Real-time code generation",
  "Model export and deployment"
];

const BOTTOM_FEATURES = [
  { icon: "~", title: "Smart EDA", desc: "AI analyzes your data automatically" },
  { icon: "#", title: "Feature Engineering", desc: "Intelligent feature suggestions" },
  { icon: "&", title: "Model Selection", desc: "Best model for your data" },
  { icon: ">", title: "Visual Builder", desc: "Drag-and-drop pipeline blocks" },
  { icon: "^", title: "Code Generation", desc: "Auto-generated Python code" },
  { icon: "=", title: "Export & Deploy", desc: "Download and serve models" }
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      {/* Nav */}
      <div style={styles.nav}>
        <div style={styles.logo}>
          <div style={styles.logoDot} />
          Smart ML Framework
        </div>
      </div>

      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.badge}>Powered by AI</div>
        <h1 style={styles.title}>
          Build ML Pipelines{" "}
          <span style={styles.titleGradient}>with Intelligence</span>
        </h1>
        <p style={styles.subtitle}>
          An AI-powered framework that guides you through the entire machine learning
          workflow -- from data analysis to model deployment. Let the LLM do the
          heavy lifting, or build it yourself.
        </p>
      </div>

      {/* Two Cards */}
      <div style={styles.cardsContainer}>
        {/* Analyse Data */}
        <div
          style={{ ...styles.card, ...styles.cardAnalyze }}
          onClick={() => navigate("/analyze")}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "translateY(-6px)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(102, 126, 234, 0.3)";
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255, 255, 255, 0.08)";
          }}
        >
          <div style={{
            ...styles.cardIcon,
            background: "linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2))"
          }}>
            *
          </div>
          <div style={styles.cardTitle}>Analyse Data</div>
          <div style={styles.cardDescription}>
            Upload your dataset and describe your goal. Our AI assistant will guide
            you through EDA, feature engineering, and model selection -- step by step.
          </div>
          <ul style={styles.cardFeatures}>
            {ANALYZE_FEATURES.map((f, i) => (
              <li key={i} style={styles.cardFeature}>
                <span style={{
                  ...styles.featureCheck,
                  background: "rgba(102, 126, 234, 0.2)",
                  color: "#818cf8"
                }}>+</span>
                {f}
              </li>
            ))}
          </ul>
          <button
            style={{
              ...styles.cardButton,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "#fff",
              boxShadow: "0 4px 20px rgba(102, 126, 234, 0.3)"
            }}
          >
            Get Started
            <span>-&gt;</span>
          </button>
        </div>

        {/* Model Your Own ML */}
        <div
          style={{ ...styles.card, ...styles.cardBuild }}
          onClick={() => navigate("/build", { state: { freshStart: true } })}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "translateY(-6px)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(16, 185, 129, 0.3)";
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255, 255, 255, 0.08)";
          }}
        >
          <div style={{
            ...styles.cardIcon,
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.2))"
          }}>
            #
          </div>
          <div style={styles.cardTitle}>Model Your Own ML</div>
          <div style={styles.cardDescription}>
            Jump straight into the visual pipeline builder. Drag and drop blocks,
            configure parameters, and build your ML pipeline from scratch.
          </div>
          <ul style={styles.cardFeatures}>
            {BUILD_FEATURES.map((f, i) => (
              <li key={i} style={styles.cardFeature}>
                <span style={{
                  ...styles.featureCheck,
                  background: "rgba(16, 185, 129, 0.2)",
                  color: "#34d399"
                }}>+</span>
                {f}
              </li>
            ))}
          </ul>
          <button
            style={{
              ...styles.cardButton,
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "#fff",
              boxShadow: "0 4px 20px rgba(16, 185, 129, 0.3)"
            }}
          >
            Start Building
            <span>-&gt;</span>
          </button>
        </div>
      </div>

      {/* Feature Grid */}
      <div style={styles.features}>
        <div style={styles.featuresTitle}>What You Can Do</div>
        <div style={styles.featureGrid}>
          {BOTTOM_FEATURES.map((f, i) => (
            <div key={i} style={styles.featureItem}>
              <div style={styles.featureItemIcon}>{f.icon}</div>
              <div style={styles.featureItemTitle}>{f.title}</div>
              <div style={styles.featureItemDesc}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
