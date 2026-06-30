import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

const Login = () => {
  // 1. Changed email to employeeCode state
  const [employeeCode, setEmployeeCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // 2. Send employee_code instead of email
      const response = await API.post("/auth/login", { employee_code: employeeCode, password });
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      
      // Redirect based on Role
      if (response.data.user.role_id === 1) {
        navigate("/dashboard");
      } else {
        navigate("/swipe-reports");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to login. Check credentials.");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>System Login</h2>
        <p style={styles.subtitle}>Enter your credentials to access the portal.</p>
        
        {error && <p style={styles.error}>{error}</p>}
        
        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            {/* 3. Updated Label and Input */}
            <label style={styles.label}>Employee ID</label>
            <input 
              type="text" 
              value={employeeCode} 
              onChange={(e) => setEmployeeCode(e.target.value)} 
              required 
              style={styles.input}
              placeholder=""
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                style={{ ...styles.input, width: '100%', paddingRight: '60px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: 'var(--text-muted)'
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button type="submit" style={styles.button}>Sign In</button>
        </form>
      </div>
      <footer style={styles.footer}>Copyright@ Vedik Solutions</footer>
    </div>
  );
};

const styles = {
  container: { 
    display: 'flex', 
    flexDirection: 'column',
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: '24px',
    height: '100vh', 
    backgroundColor: 'var(--bg-main)' 
  },
  card: { 
    padding: '40px', 
    backgroundColor: 'var(--bg-card)', 
    borderRadius: 'var(--radius)', 
    boxShadow: 'var(--shadow-md)', 
    width: '100%', 
    maxWidth: '400px',
    border: '1px solid var(--border)'
  },
  title: { margin: '0 0 8px 0', color: 'var(--text-main)', fontSize: '24px' },
  subtitle: { margin: '0 0 24px 0', color: 'var(--text-muted)', fontSize: '14px' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' },
  input: { 
    padding: '12px', 
    borderRadius: '6px', 
    border: '1px solid var(--border)', 
    fontSize: '15px',
    outline: 'none'
  },
  button: { 
    padding: '14px', 
    backgroundColor: 'var(--primary)', 
    color: 'white', 
    border: 'none', 
    borderRadius: '6px', 
    cursor: 'pointer', 
    fontSize: '15px', 
    fontWeight: '600',
    marginTop: '10px'
  },
  error: { 
    color: '#991b1b', 
    fontSize: '14px', 
    textAlign: 'center', 
    backgroundColor: '#fef2f2', 
    padding: '12px', 
    borderRadius: '6px',
    border: '1px solid #fecaca'
  },
  footer: {
    color: 'var(--text-muted)',
    fontSize: '13px',
    textAlign: 'center'
  }
};

export default Login;