import { useState } from "react";
import API from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const Profile = () => {
  const user = JSON.parse(localStorage.getItem("user")) || {};
  const [passwords, setPasswords] = useState({ newPassword: "", confirmPassword: "" });
  const [msg, setMsg] = useState({ text: "", type: "" });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      setMsg({ text: "Passwords do not match!", type: "error" });
      return;
    }

    try {
      await API.put("/auth/change-password", { 
        employee_id: user.id, 
        new_password: passwords.newPassword 
      });
      setMsg({ text: "Password updated successfully!", type: "success" });
      setPasswords({ newPassword: "", confirmPassword: "" });
      setTimeout(() => setMsg({ text: "", type: "" }), 3000);
    } catch (err) {
      setMsg({ text: "Failed to update password.", type: "error" });
    }
  };

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.main}>
        <Navbar />
        <div style={styles.contentPadding}>
          
          <div style={styles.grid}>
            {/* Profile Info Card */}
            <div style={styles.card}>
              <div style={styles.avatarPlaceholder}>
                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <h2 style={{ margin: "15px 0 5px 0" }}>{user.name}</h2>
              <p style={styles.infoText}><strong>Role:</strong> {user.role_id === 1 ? "Administrator" : "Employee"}</p>
              <p style={styles.infoText}><strong>Email:</strong> {user.email || "Not provided"}</p>
              <p style={styles.infoText}><strong>System ID:</strong> EMP-{user.id}</p>
            </div>

            {/* Change Password Card */}
            <div style={styles.card}>
              <h3>Security Settings</h3>
              <p style={{ color: "#64748b", marginBottom: "20px" }}>Update your account password here.</p>
              
              {msg.text && (
                <div style={msg.type === "success" ? styles.successMsg : styles.errorMsg}>
                  {msg.text}
                </div>
              )}

              <form onSubmit={handlePasswordChange} style={styles.form}>
                <label style={styles.label}>New Password</label>
                <input 
                  type="password" 
                  value={passwords.newPassword} 
                  onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})} 
                  style={styles.input} 
                  required 
                  minLength="6"
                />
                
                <label style={styles.label}>Confirm New Password</label>
                <input 
                  type="password" 
                  value={passwords.confirmPassword} 
                  onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})} 
                  style={styles.input} 
                  required 
                  minLength="6"
                />
                
                <button type="submit" style={styles.saveBtn}>Update Password</button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const styles = {
  layout: { display: "flex", minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "Arial, sans-serif" },
  main: { flexGrow: 1, marginLeft: "250px" },
  contentPadding: { padding: "0 40px 40px 40px" },
  grid: { display: "grid", gridTemplateColumns: "1fr 2fr", gap: "30px" },
  card: { backgroundColor: "white", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column" },
  avatarPlaceholder: { width: "80px", height: "80px", borderRadius: "50%", backgroundColor: "#38bdf8", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", fontWeight: "bold" },
  infoText: { margin: "8px 0", color: "#475569", fontSize: "16px" },
  form: { display: "flex", flexDirection: "column", gap: "12px" },
  label: { fontSize: "14px", color: "#475569", fontWeight: "bold" },
  input: { padding: "10px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "14px" },
  saveBtn: { backgroundColor: "#10b981", color: "white", border: "none", padding: "12px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", marginTop: "10px" },
  successMsg: { marginBottom: "15px", padding: "10px", backgroundColor: "#d1fae5", color: "#065f46", borderRadius: "4px", fontSize: "14px", fontWeight: "bold" },
  errorMsg: { marginBottom: "15px", padding: "10px", backgroundColor: "#fee2e2", color: "#991b1b", borderRadius: "4px", fontSize: "14px", fontWeight: "bold" }
};

export default Profile;