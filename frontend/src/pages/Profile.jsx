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
              <h2 style={styles.userName}>{user.name}</h2>
              <div style={styles.infoGroup}>
                <p style={styles.infoLabel}>Role</p>
                <p style={styles.infoValue}>{user.role_id === 1 ? "Administrator" : "Employee"}</p>
              </div>
              <div style={styles.infoGroup}>
                <p style={styles.infoLabel}>Email</p>
                <p style={styles.infoValue}>{user.email || "Not provided"}</p>
              </div>
              <div style={styles.infoGroup}>
                <p style={styles.infoLabel}>System ID</p>
                <p style={styles.infoValue}>EMP-{user.id}</p>
              </div>
            </div>

            {/* Change Password Card */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Security Settings</h3>
              <p style={styles.cardSubtitle}>Update your account password here.</p>
              
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
  layout: { display: "flex", minHeight: "100vh" },
  main: { flexGrow: 1, marginLeft: "260px" },
  contentPadding: { padding: "0 40px 40px 40px" },
  grid: { display: "grid", gridTemplateColumns: "1fr 2fr", gap: "30px" },
  card: { backgroundColor: "var(--bg-card)", padding: "30px", borderRadius: "var(--radius)", boxShadow: "var(--shadow-md)", border: "1px solid var(--border)" },
  avatarPlaceholder: { width: "80px", height: "80px", borderRadius: "50%", backgroundColor: "var(--primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", fontWeight: "bold", marginBottom: "15px" },
  userName: { margin: "0 0 20px 0", color: "var(--text-main)" },
  infoGroup: { marginBottom: "15px" },
  infoLabel: { fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600", margin: "0" },
  infoValue: { fontSize: "16px", color: "var(--text-main)", margin: "4px 0" },
  cardTitle: { margin: "0 0 5px 0", color: "var(--text-main)" },
  cardSubtitle: { color: "var(--text-muted)", marginBottom: "20px", fontSize: "14px" },
  form: { display: "flex", flexDirection: "column", gap: "15px" },
  label: { fontSize: "14px", fontWeight: "600", color: "var(--text-main)" },
  input: { padding: "12px", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "15px", outline: "none" },
  saveBtn: { backgroundColor: "var(--primary)", color: "white", border: "none", padding: "12px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", marginTop: "10px" },
  successMsg: { marginBottom: "15px", padding: "12px", backgroundColor: "#f0fdf4", color: "#166534", borderRadius: "6px", fontSize: "14px", fontWeight: "500" },
  errorMsg: { marginBottom: "15px", padding: "12px", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "6px", fontSize: "14px", fontWeight: "500" }
};

export default Profile;