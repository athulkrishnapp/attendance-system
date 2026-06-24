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
  container: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", backgroundColor: "#f8fafc", fontFamily: "Arial, sans-serif", textAlign: "center" },
  title: { fontSize: "120px", margin: "0", color: "#3b82f6", fontWeight: "bold" },
  subtitle: { fontSize: "32px", margin: "10px 0", color: "#1e293b" },
  text: { fontSize: "18px", color: "#64748b", marginBottom: "30px" },
  btn: { backgroundColor: "#1e293b", color: "white", padding: "12px 24px", border: "none", borderRadius: "6px", fontSize: "16px", cursor: "pointer", fontWeight: "bold" }
};

export default NotFound;