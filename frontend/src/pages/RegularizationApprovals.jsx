import { useState, useEffect } from "react";
import API, { api } from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const RegularizationApprovals = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Reject Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await api.regularizations.getAllPending();
      setRequests(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch regularizations", err);
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.regularizations.process(id, { status: 'APPROVED', manager_remarks: 'Approved' });
      fetchRequests();
    } catch (err) {
      alert("Failed to process regularization");
    }
  };

  const openRejectModal = (id) => {
    setRejectId(id);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.regularizations.process(rejectId, {
        status: 'REJECTED',
        rejection_reason: rejectReason,
        manager_remarks: rejectReason
      });
      setShowRejectModal(false);
      fetchRequests();
    } catch (err) {
      alert("Failed to reject regularization");
    }
  };

  const handleForward = async (id, attendance_summary_id) => {
    try {
      await api.regularizations.forward(id, { manager_id: user.id, attendance_summary_id });
      fetchRequests();
    } catch (err) {
      alert("Failed to forward regularization");
    }
  };

  const actionableRequests = requests.filter(r => {
    if (user.role === 'MANAGER' && r.status === 'PENDING_MANAGER' && r.employee_id !== user.id) return true;
    if (user.role === 'ADMIN' && (r.status === 'PENDING_ADMIN' || r.status === 'PENDING_MANAGER' || r.status === 'PENDING')) return true;
    return false;
  });

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.main}>
        <Navbar />
        <div style={styles.contentPadding}>
          
          <header style={styles.header}>
            <h2 style={styles.title}>Regularization Inbox</h2>
            <p style={styles.subtitle}>Review missing punches and attendance regularization requests.</p>
          </header>

          <div style={styles.tableContainer}>
            {loading ? <p style={{ padding: "40px", textAlign: "center" }}>Loading requests...</p> : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Employee</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Actual Swipes</th>
                    <th style={styles.th}>Requested Times</th>
                    <th style={styles.th}>Reason</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {actionableRequests.map((r) => (
                    <tr key={r.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={{ fontWeight: "600" }}>{r.name}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{r.employee_code}</div>
                      </td>
                      <td style={styles.td}>
                        <strong>{new Date(r.attendance_date).toLocaleDateString()}</strong>
                      </td>
                      <td style={styles.td}>
                        In: {r.actual_first_in || 'Missing'}<br/>
                        Out: {r.actual_last_out || 'Missing'}
                      </td>
                      <td style={styles.td}>
                        <strong style={{color: "var(--primary)"}}>In: {r.requested_first_in}</strong><br/>
                        <strong style={{color: "var(--primary)"}}>Out: {r.requested_last_out}</strong>
                      </td>
                      <td style={styles.td}>{r.reason}</td>
                      <td style={styles.td}>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <button onClick={() => handleApprove(r.id)} style={styles.approveBtn}>Approve</button>
                          <button onClick={() => openRejectModal(r.id)} style={styles.rejectBtn}>Reject</button>
                          {user.role === 'MANAGER' && (
                            <button onClick={() => handleForward(r.id, r.attendance_summary_id)} style={styles.forwardBtn}>Forward to Admin</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {actionableRequests.length === 0 && <tr><td colSpan="6" style={{textAlign: "center", padding: "40px", color: "var(--text-muted)"}}>No pending requests require your action.</td></tr>}
                </tbody>
              </table>
            )}
          </div>
          {/* Reject Modal */}
          {showRejectModal && (
            <div style={styles.modalOverlay}>
              <div style={styles.modalContent}>
                <h3 style={{marginTop: 0, color: "var(--text-main)"}}>Provide Rejection Reason</h3>
                <form onSubmit={handleRejectSubmit}>
                  <textarea 
                    placeholder="Enter reason for rejection..." 
                    value={rejectReason} 
                    onChange={(e) => setRejectReason(e.target.value)} 
                    style={{...styles.input, height: "100px", resize: "none", width: "100%", boxSizing: "border-box", marginBottom: "15px"}} 
                    required 
                  />
                  <div style={{display: "flex", justifyContent: "flex-end", gap: "10px"}}>
                    <button type="button" onClick={() => setShowRejectModal(false)} style={styles.cancelBtn}>Cancel</button>
                    <button type="submit" style={styles.rejectModalBtn}>Confirm Rejection</button>
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
  layout: { display: "flex", minHeight: "100vh" },
  main: { flexGrow: 1, marginLeft: "260px" },
  contentPadding: { padding: "0 40px 40px 40px" },
  header: { marginBottom: "24px" },
  title: { fontSize: "24px", fontWeight: "600", color: "var(--text-main)", margin: "0 0 5px 0" },
  subtitle: { color: "var(--text-muted)", margin: 0 },
  tableContainer: { backgroundColor: "var(--bg-card)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-md)", overflow: "hidden", border: "1px solid var(--border)" },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left" },
  th: { backgroundColor: "var(--bg-main)", padding: "16px", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.5px" },
  tr: { borderBottom: "1px solid var(--border)" },
  td: { padding: "16px", color: "var(--text-main)", fontSize: "15px" },
  approveBtn: { backgroundColor: "#10b981", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "13px" },
  rejectBtn: { backgroundColor: "#ef4444", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "13px" },
  forwardBtn: { backgroundColor: "#3b82f6", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "13px" },
  
  modalOverlay: { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modalContent: { backgroundColor: "white", padding: "30px", borderRadius: "12px", width: "400px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)" },
  input: { padding: "12px 16px", border: "1px solid #cbd5e1", borderRadius: "8px", outline: "none", fontSize: "14px", backgroundColor: "#fff", color: "#0f172a" },
  cancelBtn: { backgroundColor: "transparent", color: "#475569", border: "1px solid #cbd5e1", padding: "10px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" },
  rejectModalBtn: { backgroundColor: "#ef4444", color: "white", border: "none", padding: "10px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }
};

export default RegularizationApprovals;
