import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>404</h1>
      <h2 style={styles.subtitle}>Page Not Found</h2>
      <p style={styles.text}>The page you are looking for doesn't exist or has been moved.</p>
      <button onClick={() => navigate("/dashboard")} style={styles.btn}>
        Return to Dashboard
      </button>
    </div>
  );
};

const styles = {
  container: { 
    display: "flex", 
    flexDirection: "column", 
    alignItems: "center", 
    justifyContent: "center", 
    height: "100vh", 
    backgroundColor: "var(--bg-main)", 
    textAlign: "center",
    padding: "20px"
  },
  title: { 
    fontSize: "120px", 
    margin: "0", 
    color: "var(--primary)", 
    fontWeight: "800",
    lineHeight: "1"
  },
  subtitle: { 
    fontSize: "32px", 
    margin: "10px 0", 
    color: "var(--text-main)" 
  },
  text: { 
    fontSize: "18px", 
    color: "var(--text-muted)", 
    marginBottom: "30px" 
  },
  btn: { 
    backgroundColor: "var(--secondary)", 
    color: "white", 
    padding: "14px 28px", 
    border: "none", 
    borderRadius: "var(--radius)", 
    fontSize: "16px", 
    cursor: "pointer", 
    fontWeight: "600",
    transition: "all 0.2s ease"
  }
};

export default NotFound;