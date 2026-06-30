import { useState, useEffect } from "react";
import API, { api } from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const Profile = () => {
  // Pulling the full user object from localStorage
  const user = JSON.parse(localStorage.getItem("user")) || {};
  const isSuperAdmin = user?.id === 1 || !user?.department_id;
  
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwords, setPasswords] = useState({ newPassword: "", confirmPassword: "" });
  const [msg, setMsg] = useState({ text: "", type: "" });
  
  // Leave Balances state
  const [balances, setBalances] = useState([]);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceForm, setBalanceForm] = useState({ leave_type_id: "", action_type: "CARRY_FORWARD", days: "" });

  const [managerName, setManagerName] = useState("");

  useEffect(() => {
    fetchBalances();
    if (!isSuperAdmin) fetchManager();
  }, []);

  const fetchManager = async () => {
    try {
      const res = await API.get("/employees");
      const me = res.data.find(emp => emp.id === user.id);
      if (me) setManagerName(me.manager_name || "Admin");
    } catch (err) { console.error("Failed to fetch manager"); }
  };

  const fetchBalances = async () => {
    try {
      const res = await api.leaveRequests.getBalances(user.id);
      setBalances(res.data);
    } catch (err) {
      console.error("Failed to fetch leave balances");
    }
  };

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

  const handleBalanceAction = async (e) => {
    e.preventDefault();
    try {
      await api.leaveRequests.requestBalanceAction({
        employee_id: user.id,
        leave_type_id: balanceForm.leave_type_id,
        action_type: balanceForm.action_type,
        days: parseFloat(balanceForm.days)
      });
      alert("Request submitted successfully!");
      setShowBalanceModal(false);
      setBalanceForm({ leave_type_id: "", action_type: "CARRY_FORWARD", days: "" });
    } catch (err) {
      alert("Failed to submit request.");
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
                {!isSuperAdmin && (
                  <div style={styles.infoRow}><span>Manager</span> <strong>{managerName || "Loading..."}</strong></div>
                )}
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

            {/* Leave Balances Section (Hidden for Super Admin) */}
            {!isSuperAdmin && (
              <div style={{...styles.card, gridColumn: "1 / -1"}}>
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px"}}>
                  <h3 style={{margin: 0, color: "#0f172a"}}>Leave Balances</h3>
                  <button style={styles.toggleBtn} onClick={() => setShowBalanceModal(true)}>Manage Unused Leaves</button>
                </div>
                
                <div style={{display: "flex", gap: "20px", flexWrap: "wrap"}}>
                  {balances.map(b => (
                    <div key={b.leave_type_id} style={{padding: "15px", border: "1px solid #cbd5e1", borderRadius: "8px", width: "200px"}}>
                      <div style={{fontSize: "14px", color: "#64748b", fontWeight: "600", textTransform: "uppercase"}}>{b.leave_type_name}</div>
                      <div style={{fontSize: "24px", fontWeight: "bold", color: "#0f172a", marginTop: "10px"}}>{b.balance} <span style={{fontSize: "14px", color: "#64748b", fontWeight: "normal"}}>days left</span></div>
                      <div style={{fontSize: "12px", color: "#94a3b8", marginTop: "5px"}}>
                        Quota: {b.annual_quota} | Taken: {b.days_taken} | Pending Approval: {b.days_requested || 0}
                      </div>
                    </div>
                  ))}
                  {balances.length === 0 && <p style={{color: "#64748b"}}>No leave balances found.</p>}
                </div>
              </div>
            )}

          </div>

          {/* Manage Unused Leaves Modal */}
          {showBalanceModal && (
            <div style={styles.modalOverlay}>
              <div style={styles.modalContent}>
                <h3 style={{marginTop: 0, color: "var(--text-main)"}}>Manage Unused Leaves</h3>
                <form onSubmit={handleBalanceAction}>
                  <div style={{marginBottom: "15px"}}>
                    <label style={styles.label}>Leave Type</label>
                    <select value={balanceForm.leave_type_id} onChange={(e) => setBalanceForm({...balanceForm, leave_type_id: e.target.value})} style={styles.input} required>
                      <option value="">Select Leave Type...</option>
                      {balances.filter(b => b.balance > 0).map(b => (
                        <option key={b.leave_type_id} value={b.leave_type_id}>{b.leave_type_name} ({b.balance} days available)</option>
                      ))}
                    </select>
                  </div>
                  
                  <div style={{marginBottom: "15px"}}>
                    <label style={styles.label}>Action</label>
                    <select value={balanceForm.action_type} onChange={(e) => setBalanceForm({...balanceForm, action_type: e.target.value})} style={styles.input} required>
                      <option value="CARRY_FORWARD">Carry Forward to Next Year</option>
                      <option value="REDEEM">Redeem (Encashment)</option>
                    </select>
                  </div>

                  <div style={{marginBottom: "20px"}}>
                    <label style={styles.label}>Days to Process</label>
                    <input type="number" step="0.5" max={balances.find(b => b.leave_type_id === parseInt(balanceForm.leave_type_id))?.balance || 0} min="0.5" value={balanceForm.days} onChange={(e) => setBalanceForm({...balanceForm, days: e.target.value})} style={styles.input} required />
                  </div>

                  <div style={{display: "flex", justifyContent: "flex-end", gap: "10px"}}>
                    <button type="button" onClick={() => setShowBalanceModal(false)} style={styles.cancelBtn}>Cancel</button>
                    <button type="submit" style={styles.saveBtn}>Submit Request</button>
                  </div>
                </form>
              </div>
            </div>
          )}

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
  errorMsg: { padding: "10px", backgroundColor: "#fee2e2", color: "#991b1b", borderRadius: "6px", fontSize: "13px" },
  label: { fontSize: "14px", fontWeight: "600", color: "#475569", marginBottom: "6px", display: "block" },
  modalOverlay: { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modalContent: { backgroundColor: "white", padding: "30px", borderRadius: "12px", width: "450px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)" }
};

export default Profile;