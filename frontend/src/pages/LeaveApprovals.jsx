import { useState, useEffect } from "react";
import API, { api } from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const LeaveApprovals = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const [leaves, setLeaves] = useState([]);
  const [balanceActions, setBalanceActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("leave_requests");

  // Reject Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const res = await API.get("/leaves/all");
      setLeaves(res.data);
      
      const actionsRes = await API.get("/leaves/balance-actions");
      setBalanceActions(actionsRes.data);
      
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch approvals data", err);
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.leaveRequests.approve(id, { resolver_id: user.id });
      fetchLeaves();
    } catch (err) {
      alert("Failed to approve request");
    }
  };

  const handleForward = async (id) => {
    try {
      await api.leaveRequests.forward(id, { manager_id: user.id });
      fetchLeaves();
    } catch (err) {
      alert("Failed to forward request");
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
      await api.leaveRequests.reject(rejectId, { rejection_reason: rejectReason, resolver_id: user.id });
      setShowRejectModal(false);
      fetchLeaves();
    } catch (err) {
      alert("Failed to reject request");
    }
  };

  const handleActionStatus = async (id, status) => {
    try {
      await API.put(`/leaves/balance-actions/${id}`, { status, resolved_by: user.id });
      fetchLeaves();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  // Filter actionable leaves for the logged in user
  const isSuperAdmin = user.id === 1 || !user.department_id;
  const isSubAdmin = user.role_id === 1 && user.id !== 1 && !!user.department_id;
  
  const actionableLeaves = leaves.filter(l => {
    if (l.status === 'PENDING_MANAGER' && l.employee_manager_id === user.id) return true;
    
    if (l.status === 'PENDING_ADMIN') {
      if (isSuperAdmin) return true;
      if (isSubAdmin && l.forwarder_manager_id === user.id) return true;
    }
    
    if (isSuperAdmin && (l.status === 'PENDING_MANAGER' || l.status === 'PENDING')) return true;
    
    return false;
  });

  const historyLeaves = leaves.filter(l => l.status === 'APPROVED' || l.status === 'REJECTED');

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.main}>
        <Navbar />
        <div style={styles.contentPadding}>
          
          <header style={styles.header}>
            <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <button 
                onClick={() => setActiveTab('leave_requests')} 
                style={{...styles.tabBtn, borderBottom: activeTab === 'leave_requests' ? '2px solid #2563eb' : 'none', color: activeTab === 'leave_requests' ? '#2563eb' : '#64748b'}}
              >
                Leave Requests
              </button>
              <button 
                onClick={() => setActiveTab('balance_actions')} 
                style={{...styles.tabBtn, borderBottom: activeTab === 'balance_actions' ? '2px solid #2563eb' : 'none', color: activeTab === 'balance_actions' ? '#2563eb' : '#64748b'}}
              >
                Surrender Requests (Encash/Carry Fwd)
              </button>
            </div>
            {activeTab === 'leave_requests' ? (
              <>
                <h2 style={styles.title}>Leave Request Inbox</h2>
                <p style={styles.subtitle}>Review and manage employee time-off requests.</p>
              </>
            ) : (
              <>
                <h2 style={styles.title}>Surrender Requests Inbox</h2>
                <p style={styles.subtitle}>Review encashment and carry forward requests from employees.</p>
              </>
            )}
          </header>

          <div style={styles.tableContainer}>
            {loading ? <p style={{ padding: "40px", textAlign: "center" }}>Loading requests...</p> : (
              activeTab === 'leave_requests' ? (
                <table style={styles.table}>
                  <thead>
                  <tr>
                    <th style={styles.th}>Employee</th>
                    <th style={styles.th}>Leave Type</th>
                    <th style={styles.th}>Dates</th>
                    <th style={styles.th}>Reason</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {actionableLeaves.map((l) => (
                    <tr key={l.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={{ fontWeight: "600" }}>{l.name}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{l.employee_code}</div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.typeBadge}>{l.leave_type_name || l.leave_type}</span>
                        <div style={{fontSize: "12px", marginTop: "6px", color: "var(--text-muted)", fontWeight: "500"}}>
                          {l.leave_portion ? l.leave_portion.replace('_', ' ') : 'FULL DAY'}
                          {l.leave_portion === 'HOURLY' ? ` (${l.hourly_duration}h)` : ''}
                        </div>
                      </td>
                      <td style={styles.td}>
                        {new Date(l.start_date).toLocaleDateString()} to <br/> 
                        {new Date(l.end_date).toLocaleDateString()}
                      </td>
                      <td style={styles.td}>
                        {l.reason}
                        {l.document_url && (
                          <div style={{marginTop: "5px"}}>
                            <a href={`http://localhost:5001/${l.document_url}`} target="_blank" rel="noreferrer" style={{fontSize: "12px", color: "var(--primary)"}}>📎 View Document</a>
                          </div>
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={l.status === 'APPROVED' ? styles.badgeApproved : l.status === 'REJECTED' ? styles.badgeRejected : styles.badgePending}>
                          {l.status}
                        </span>
                        {l.forwarded_by_name && (
                          <div style={{fontSize: "11px", color: "var(--text-muted)", marginTop: "4px"}}>
                            Fwd by: {l.forwarded_by_name}
                          </div>
                        )}
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <button onClick={() => handleApprove(l.id)} style={styles.approveBtn}>Approve</button>
                          <button onClick={() => openRejectModal(l.id)} style={styles.rejectBtn}>Reject</button>
                          {l.status === 'PENDING_MANAGER' && (
                            <button onClick={() => handleForward(l.id)} style={styles.forwardBtn}>Forward to Admin</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {actionableLeaves.length === 0 && <tr><td colSpan="6" style={{textAlign: "center", padding: "40px", color: "var(--text-muted)"}}>No pending requests require your action.</td></tr>}
                </tbody>
              </table>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Employee</th>
                      <th style={styles.th}>Leave Type</th>
                      <th style={styles.th}>Action Requested</th>
                      <th style={styles.th}>Days</th>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balanceActions.filter(a => a.status === 'PENDING').map(act => (
                      <tr key={act.id} style={styles.tr}>
                        <td style={styles.td}>
                          <div style={{ fontWeight: "600" }}>{act.employee_name}</div>
                          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{act.employee_code}</div>
                        </td>
                        <td style={styles.td}><span style={styles.typeBadge}>{act.leave_type_name}</span></td>
                        <td style={styles.td}>{act.action_type === 'REDEEM' ? 'Encashment' : 'Carry Forward'}</td>
                        <td style={styles.td}>{act.days}</td>
                        <td style={styles.td}>{new Date(act.applied_on).toLocaleDateString()}</td>
                        <td style={styles.td}>
                          <span style={styles.badgePending}>{act.status}</span>
                        </td>
                        <td style={styles.td}>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button onClick={() => handleActionStatus(act.id, 'APPROVED')} style={styles.approveBtn}>Approve</button>
                            <button onClick={() => handleActionStatus(act.id, 'REJECTED')} style={styles.rejectBtn}>Reject</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {balanceActions.filter(a => a.status === 'PENDING').length === 0 && <tr><td colSpan="7" style={{textAlign: "center", padding: "40px", color: "var(--text-muted)"}}>No pending surrender requests.</td></tr>}
                  </tbody>
                </table>
              )
            )}
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
  header: { marginBottom: "24px" },
  title: { fontSize: "24px", fontWeight: "600", color: "var(--text-main)", margin: "0 0 5px 0" },
  subtitle: { color: "var(--text-muted)", margin: 0 },
  tableContainer: { backgroundColor: "var(--bg-card)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-md)", overflow: "hidden", border: "1px solid var(--border)" },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left" },
  th: { backgroundColor: "var(--bg-main)", padding: "16px", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.5px" },
  tr: { borderBottom: "1px solid var(--border)" },
  td: { padding: "16px", color: "var(--text-main)", fontSize: "15px" },
  typeBadge: { backgroundColor: "var(--bg-main)", color: "var(--text-main)", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" },
  badgeApproved: { backgroundColor: "#d1fae5", color: "#065f46", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" },
  badgeRejected: { backgroundColor: "#fee2e2", color: "#991b1b", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" },
  badgePending: { backgroundColor: "#fef08a", color: "#854d0e", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" },
  approveBtn: { backgroundColor: "#10b981", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "13px" },
  rejectBtn: { backgroundColor: "#ef4444", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "13px" },
  forwardBtn: { backgroundColor: "#3b82f6", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "13px" },
  
  modalOverlay: { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modalContent: { backgroundColor: "white", padding: "30px", borderRadius: "12px", width: "400px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)" },
  input: { padding: "12px 16px", border: "1px solid #cbd5e1", borderRadius: "8px", outline: "none", fontSize: "14px", backgroundColor: "#fff", color: "#0f172a" },
  cancelBtn: { backgroundColor: "transparent", color: "#475569", border: "1px solid #cbd5e1", padding: "10px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" },
  rejectModalBtn: { backgroundColor: "#ef4444", color: "white", border: "none", padding: "10px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" },
  tabBtn: { background: "none", border: "none", padding: "10px 20px", fontSize: "16px", fontWeight: "600", cursor: "pointer" }
};

export default LeaveApprovals;