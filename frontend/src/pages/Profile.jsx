import { useState } from "react";
import API from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const Profile = () => {
  // Pulling the full user object from localStorage
  const user = JSON.parse(localStorage.getItem("user")) || {};
  
  const [showPasswordForm, setShowPasswordForm] = useState(false);
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
      setShowPasswordForm(false);
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
            
            {/* Profile Info */}
            <div style={styles.card}>
              <div style={styles.avatar}>{user.name?.charAt(0).toUpperCase()}</div>
              <h2 style={styles.userName}>{user.name}</h2>
              <div style={styles.infoList}>
                {/* Now showing the actual Employee Code (e.g., EMP002) */}
                <div style={styles.infoRow}><span>Employee ID</span> <strong>{user.employee_code || "N/A"}</strong></div>
                <div style={styles.infoRow}><span>Role</span> <span style={styles.badge}>{user.role_id === 1 ? "Admin" : "Employee"}</span></div>
                <div style={styles.infoRow}><span>Email</span> <strong>{user.email || "Not provided"}</strong></div>
              </div>
            </div>

            {/* Security Section */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Security Settings</h3>
              {!showPasswordForm ? (
                <div style={styles.securityBox}>
                  <p style={{color: "#64748b", fontSize: "14px", marginBottom: "15px"}}>Ensure your account is secure by updating your password regularly.</p>
                  <button style={styles.toggleBtn} onClick={() => setShowPasswordForm(true)}>Change Password</button>
                </div>
              ) : (
                <form onSubmit={handlePasswordChange} style={styles.form}>
                  {msg.text && <div style={msg.type === "success" ? styles.successMsg : styles.errorMsg}>{msg.text}</div>}
                  <input type="password" placeholder="New Password" value={passwords.newPassword} onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})} style={styles.input} required minLength="6" />
                  <input type="password" placeholder="Confirm Password" value={passwords.confirmPassword} onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})} style={styles.input} required minLength="6" />
                  <div style={{display: "flex", gap: "10px"}}>
                    <button type="submit" style={styles.saveBtn}>Update</button>
                    <button type="button" style={styles.cancelBtn} onClick={() => setShowPasswordForm(false)}>Cancel</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  layout: { display: "flex", minHeight: "100vh", backgroundColor: "#f4f7f9" },
  main: { flexGrow: 1, marginLeft: "260px" },
  contentPadding: { padding: "40px" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" },
  card: { backgroundColor: "#fff", padding: "30px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" },
  avatar: { width: "60px", height: "60px", borderRadius: "8px", backgroundColor: "#0284c7", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", fontWeight: "bold", marginBottom: "20px" },
  userName: { margin: "0 0 20px 0", color: "#0f172a" },
  infoList: { display: "flex", flexDirection: "column", gap: "12px" },
  infoRow: { display: "flex", justifyContent: "space-between", fontSize: "14px", color: "#334155", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" },
  badge: { backgroundColor: "#e0f2fe", color: "#0369a1", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "700" },
  cardTitle: { marginBottom: "20px", fontSize: "18px", color: "#0f172a" },
  securityBox: { border: "1px dashed #cbd5e1", padding: "20px", borderRadius: "8px", textAlign: "center" },
  form: { display: "flex", flexDirection: "column", gap: "12px" },
  input: { padding: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px" },
  toggleBtn: { backgroundColor: "#0284c7", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" },
  saveBtn: { backgroundColor: "#0284c7", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" },
  cancelBtn: { backgroundColor: "#fff", color: "#475569", border: "1px solid #cbd5e1", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" },
  successMsg: { padding: "10px", backgroundColor: "#dcfce7", color: "#166534", borderRadius: "6px", fontSize: "13px" },
  errorMsg: { padding: "10px", backgroundColor: "#fee2e2", color: "#991b1b", borderRadius: "6px", fontSize: "13px" }
};

export default Profile;