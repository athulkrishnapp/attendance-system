import { useState, useEffect, useMemo } from "react";
import API, { api } from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const ApprovalsInbox = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const [leaves, setLeaves] = useState([]);
  const [regularizations, setRegularizations] = useState([]);
  const [balanceActions, setBalanceActions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tabs state
  const [activeTab, setActiveTab] = useState("leaves"); // 'leaves', 'regularizations', 'balance_actions'
  const [subTab, setSubTab] = useState("pending"); // 'pending', 'reviewed'

  // Filters
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");

  // Reject Modal State (Shared)
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectType, setRejectType] = useState(""); // 'leave' or 'regularization'
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  // Approve Modal State (Shared)
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveType, setApproveType] = useState("");
  const [approveId, setApproveId] = useState(null);
  const [approveRemarks, setApproveRemarks] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const isSuperAdmin = user?.id === 1 || !user?.department_id;
      
      const [leavesRes, regRes, actionsRes] = await Promise.all([
        API.get("/leaves/all", { params: { requester_id: user.id, is_super_admin: isSuperAdmin } }),
        api.regularizations.getAllPending({ requester_id: user.id, is_super_admin: isSuperAdmin }),
        API.get("/leaves/balance-actions")
      ]);

      setLeaves(leavesRes.data);
      setRegularizations(regRes.data);
      setBalanceActions(actionsRes.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch approvals data", err);
      setLoading(false);
    }
  };

  // Status and Action Handlers
  const openApproveModal = (type, id) => {
    setApproveType(type);
    setApproveId(id);
    setApproveRemarks("");
    setShowApproveModal(true);
  };

  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    try {
      if (approveType === 'leave') {
        await api.leaveRequests.approve(approveId, { resolver_id: user.id, remarks: approveRemarks || 'Approved' });
      } else if (approveType === 'regularization') {
        await api.regularizations.process(approveId, { 
          status: 'APPROVED', 
          manager_remarks: approveRemarks || 'Approved', 
          processed_by: user.id 
        });
      }
      setShowApproveModal(false);
      fetchData();
    } catch (err) { alert("Failed to approve request"); }
  };

  const handleForwardLeave = async (id) => {
    try {
      await api.leaveRequests.forward(id, { manager_id: user.id });
      fetchData();
    } catch (err) { alert("Failed to forward request"); }
  };

  const handleForwardReg = async (id, attendance_summary_id) => {
    try {
      await api.regularizations.forward(id, { manager_id: user.id, attendance_summary_id });
      fetchData();
    } catch (err) { alert("Failed to forward regularization"); }
  };

  const handleBalanceAction = async (id, status) => {
    try {
      await API.put(`/leaves/balance-actions/${id}`, { status, resolved_by: user.id });
      fetchData();
    } catch (err) { alert("Failed to update status"); }
  };

  const openRejectModal = (type, id) => {
    setRejectType(type);
    setRejectId(id);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    try {
      if (rejectType === 'leave') {
        await api.leaveRequests.reject(rejectId, { rejection_reason: rejectReason, resolver_id: user.id });
      } else if (rejectType === 'regularization') {
        await api.regularizations.process(rejectId, { status: 'REJECTED', manager_remarks: rejectReason, rejection_reason: rejectReason, processed_by: user.id });
      }
      setShowRejectModal(false);
      fetchData();
    } catch (err) {
      alert("Failed to reject request");
    }
  };

  // Utilities
  const isSuperAdmin = user.id === 1 || !user.department_id;
  const isSubAdmin = user.role_id === 1 && user.id !== 1 && !!user.department_id;

  const filterByDate = (itemDate) => {
    if (!filterMonth && !filterYear) return true;
    const date = new Date(itemDate);
    const m = date.getMonth() + 1;
    const y = date.getFullYear();
    if (filterMonth && m.toString() !== filterMonth) return false;
    if (filterYear && y.toString() !== filterYear) return false;
    return true;
  };

  const getStatusBadge = (item) => {
    if (item.status === 'APPROVED') return <span style={styles.badgeApproved}>Approved</span>;
    if (item.status === 'REJECTED') return <span style={styles.badgeRejected}>Rejected</span>;
    if (item.status === 'PENDING_MANAGER') return <span style={styles.badgePending}>Pending Manager</span>;
    if (item.status === 'PENDING_ADMIN') return <span style={styles.badgePendingAdmin}>Pending Admin</span>;
    if (item.status === 'PENDING') return <span style={styles.badgePending}>Pending</span>;
    return <span style={styles.badgePending}>{item.status}</span>;
  };

  const isActionable = (item) => {
    const uId = Number(user?.id);
    if (item.status === 'PENDING_MANAGER') {
      if (item.forwarded_by_id) {
        if (Number(item.forwarder_manager_id) === uId) return true;
      } else {
        if (Number(item.employee_manager_id) === uId) return true;
      }
    }
    if (item.status === 'PENDING_ADMIN') {
      if (isSuperAdmin) return true;
      if (isSubAdmin && Number(item.forwarder_manager_id) === uId) return true;
    }
    // SuperAdmin can fallback to viewing any pending request
    if (isSuperAdmin && (item.status === 'PENDING_MANAGER' || item.status === 'PENDING')) return true;
    return false;
  };

  // Filtered Datasets
  const processedLeaves = useMemo(() => leaves.filter(l => filterByDate(l.applied_on)), [leaves, filterMonth, filterYear]);
  const processedRegularizations = useMemo(() => regularizations.filter(r => filterByDate(r.applied_on)), [regularizations, filterMonth, filterYear]);
  const processedBalances = useMemo(() => balanceActions.filter(b => filterByDate(b.applied_on)), [balanceActions, filterMonth, filterYear]);

  const displayedData = () => {
    const uId = Number(user?.id);
    if (activeTab === 'leaves') {
      return subTab === 'pending' ? processedLeaves.filter(l => isActionable(l) && l.status !== 'APPROVED' && l.status !== 'REJECTED') : processedLeaves.filter(l => l.status === 'APPROVED' || l.status === 'REJECTED' || (Number(l.forwarded_by_id) === uId));
    } else if (activeTab === 'regularizations') {
      return subTab === 'pending' ? processedRegularizations.filter(r => isActionable(r) && r.status !== 'APPROVED' && r.status !== 'REJECTED') : processedRegularizations.filter(r => r.status === 'APPROVED' || r.status === 'REJECTED' || (Number(r.forwarded_by_id) === uId));
    } else {
      return subTab === 'pending' ? processedBalances.filter(b => b.status === 'PENDING') : processedBalances.filter(b => b.status !== 'PENDING');
    }
  };

  const data = displayedData();

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.main}>
        <Navbar />
        <div style={styles.contentPadding}>

          <header style={styles.header}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
              <div>
                <h2 style={styles.title}>Team Approvals Inbox</h2>
                <p style={styles.subtitle}>Review and manage requests from your team.</p>
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={styles.filterSelect}>
                  <option value="">All Months</option>
                  {[...Array(12).keys()].map(i => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>)}
                </select>
                <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={styles.filterSelect}>
                  <option value="">All Years</option>
                  {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div style={styles.tabsContainer}>
              <button onClick={() => setActiveTab('leaves')} style={{...styles.mainTabBtn, ...(activeTab === 'leaves' ? styles.activeMainTab : {})}}>Leaves</button>
              <button onClick={() => setActiveTab('regularizations')} style={{...styles.mainTabBtn, ...(activeTab === 'regularizations' ? styles.activeMainTab : {})}}>Regularizations</button>
              <button onClick={() => setActiveTab('balance_actions')} style={{...styles.mainTabBtn, ...(activeTab === 'balance_actions' ? styles.activeMainTab : {})}}>Surrenders</button>
            </div>

            <div style={styles.subTabsContainer}>
              <button onClick={() => setSubTab('pending')} style={{...styles.subTabBtn, ...(subTab === 'pending' ? styles.activeSubTab : {})}}>Pending Action</button>
              <button onClick={() => setSubTab('reviewed')} style={{...styles.subTabBtn, ...(subTab === 'reviewed' ? styles.activeSubTab : {})}}>Reviewed / Forwarded</button>
            </div>
          </header>

          <div style={styles.tableContainer}>
            {loading ? <p style={{ padding: "40px", textAlign: "center" }}>Loading requests...</p> : (
              <table style={styles.table}>
                <thead>
                  {activeTab === 'leaves' && (
                    <tr>
                      <th style={styles.th}>Employee</th>
                      <th style={styles.th}>Leave Type</th>
                      <th style={styles.th}>Dates</th>
                      <th style={styles.th}>Description & Times</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  )}
                  {activeTab === 'regularizations' && (
                    <tr>
                      <th style={styles.th}>Employee</th>
                      <th style={styles.th}>Date & Problem</th>
                      <th style={styles.th}>Description (Reason)</th>
                      <th style={styles.th}>Actual vs Requested</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  )}
                  {activeTab === 'balance_actions' && (
                    <tr>
                      <th style={styles.th}>Employee</th>
                      <th style={styles.th}>Leave Type</th>
                      <th style={styles.th}>Action</th>
                      <th style={styles.th}>Days</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr><td colSpan="6" style={{textAlign: "center", padding: "40px", color: "var(--text-muted)"}}>No {subTab} {activeTab.replace('_', ' ')} found for the selected period.</td></tr>
                  ) : data.map(item => (
                    <tr key={item.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={{ fontWeight: "600" }}>{item.employee_name || item.name}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{item.employee_code}</div>
                        
                        {item.department_name && (
                          <div style={{marginTop: "8px", fontSize: "11px", backgroundColor: "#f1f5f9", padding: "6px", borderRadius: "4px", color: "#475569"}}>
                            <div><strong>Shift:</strong> {item.shift_name || 'N/A'}</div>
                            <div><strong>Dept:</strong> {item.department_name}</div>
                            {item.max_concurrent_leaves !== null && (
                              <>
                                <div><strong>Dept Limit:</strong> {item.max_concurrent_leaves}</div>
                                <div><strong>Approved Leaves:</strong> {item.concurrent_leaves}</div>
                                <div><strong>Available Slots:</strong> {Math.max(0, item.max_concurrent_leaves - item.concurrent_leaves)}</div>
                              </>
                            )}
                          </div>
                        )}
                      </td>

                      {activeTab === 'leaves' && (
                        <>
                          <td style={styles.td}><span style={styles.typeBadge}>{item.leave_type_name}</span></td>
                          <td style={styles.td}>
                            {new Date(item.start_date).toLocaleDateString()} to {new Date(item.end_date).toLocaleDateString()}
                            <div style={{fontSize: "12px", color: "var(--text-muted)", marginTop: "4px"}}>{item.total_days} Days</div>
                          </td>
                          <td style={styles.td}>
                            <div style={{maxWidth: "200px", whiteSpace: "normal", wordWrap: "break-word"}}>{item.reason}</div>
                            
                            {item.warnings && item.warnings.length > 0 && (
                              <div style={{marginTop: "8px", padding: "6px", backgroundColor: "#fffbeb", borderLeft: "3px solid #f59e0b", fontSize: "12px", color: "#92400e"}}>
                                <strong>System Warnings:</strong>
                                <ul style={{margin: "4px 0 0 16px", padding: 0}}>
                                  {item.warnings.map((w, idx) => <li key={idx}>{w}</li>)}
                                </ul>
                              </div>
                            )}

                            <div style={{fontSize: "12px", color: "var(--text-muted)", marginTop: "6px"}}>
                              <div><strong>Sent:</strong> {new Date(item.applied_on).toLocaleString()}</div>
                              {item.forwarded_at && <div><strong>Fwd:</strong> {new Date(item.forwarded_at).toLocaleString()}</div>}
                            </div>
                            
                            {item.resolution_remarks && (item.status === 'REJECTED' || item.status === 'APPROVED') && (
                              <div style={{fontSize: "12px", color: item.status === 'REJECTED' ? "var(--badge-rejected-text)" : "var(--badge-approved-text)", marginTop: "4px", backgroundColor: item.status === 'REJECTED' ? "var(--badge-rejected-bg)" : "var(--badge-approved-bg)", padding: "4px", borderRadius: "4px"}}>
                                <strong>Remark:</strong> {item.resolution_remarks}
                              </div>
                            )}
                            {item.document_url && <div style={{marginTop: "4px"}}><a href={`http://localhost:5001/${item.document_url}`} target="_blank" rel="noreferrer" style={{fontSize: "12px", color: "var(--primary)"}}>📎 View Doc</a></div>}
                          </td>
                        </>
                      )}

                      {activeTab === 'regularizations' && (
                        <>
                          <td style={styles.td}>
                            <div style={{fontWeight: "600"}}>{new Date(item.attendance_date || item.applied_on).toLocaleDateString()}</div>
                            {(() => {
                              let prevFlags = [];
                              let currentFlags = [];
                              try {
                                const mFlags = Array.isArray(item.modifier_flags) ? item.modifier_flags : (item.modifier_flags && String(item.modifier_flags).trim() !== '{}' ? JSON.parse(String(item.modifier_flags).replace(/[{}]/g, '[]')) : []);
                                // Quick fix for Postgres string representations if it's "{LATE}" we should parse it correctly, but let's assume it's just JSON or array in our backend change.
                                // Actually backend now returns JSON.
                                const safeFlags = Array.isArray(mFlags) ? mFlags : (typeof item.modifier_flags === 'string' ? item.modifier_flags.replace(/[{}]/g, '').split(',').map(s=>s.trim()).filter(Boolean) : []);
                                prevFlags = safeFlags.filter(f => f.startsWith('PREV_')).map(f => f.replace('PREV_', ''));
                                currentFlags = safeFlags.filter(f => !f.startsWith('PREV_'));
                              } catch(e) {}
                              
                              const currentStatus = item.core_status;
                              return (
                                <>
                                  {currentStatus && (
                                    <div style={{marginTop: "4px"}}>
                                      <span style={{fontSize: "11px", backgroundColor: "#fee2e2", color: "#991b1b", padding: "2px 6px", borderRadius: "12px", fontWeight: "bold"}}>
                                        {prevFlags.length > 0 ? (
                                          <><span style={{ textDecoration: 'line-through', opacity: 0.7, marginRight: '4px' }}>{prevFlags.join(', ')}</span> → {currentStatus}</>
                                        ) : currentStatus}
                                      </span>
                                    </div>
                                  )}
                                  {currentFlags.length > 0 && (
                                    <div style={{marginTop: "2px", fontSize: "11px", color: "#b91c1c"}}>
                                      {currentFlags.join(', ')}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </td>
                          <td style={styles.td}>
                            <div style={{fontSize: "13px", maxWidth: "200px", whiteSpace: "normal", wordWrap: "break-word"}}>{item.reason}</div>
                          </td>
                          <td style={styles.td}>
                            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px", backgroundColor: "#f8fafc", padding: "8px", borderRadius: "6px"}}>
                              <div>
                                <div style={{color: "var(--text-muted)", marginBottom: "2px", fontSize: "11px"}}>Actual</div>
                                <div>In: {item.actual_first_in ? item.actual_first_in.substring(0,5) : '-'}</div>
                                <div>Out: {item.actual_last_out ? item.actual_last_out.substring(0,5) : '-'}</div>
                              </div>
                              <div>
                                <div style={{color: "var(--text-muted)", marginBottom: "2px", fontSize: "11px"}}>Requested</div>
                                <div style={{fontWeight: "bold", color: "var(--primary)"}}>In: {item.requested_first_in ? item.requested_first_in.substring(0,5) : '-'}</div>
                                <div style={{fontWeight: "bold", color: "var(--primary)"}}>Out: {item.requested_last_out ? item.requested_last_out.substring(0,5) : '-'}</div>
                              </div>
                            </div>
                          </td>
                        </>
                      )}

                      {activeTab === 'balance_actions' && (
                        <>
                          <td style={styles.td}><span style={styles.typeBadge}>{item.leave_type_name}</span></td>
                          <td style={styles.td}>{item.action_type === 'REDEEM' ? 'Encashment' : 'Carry Forward'}</td>
                          <td style={styles.td}>{item.days}</td>
                        </>
                      )}

                      <td style={styles.td}>
                        {getStatusBadge(item)}
                        {item.forwarded_by_name && (
                          <div style={{fontSize: "11px", color: "var(--text-muted)", marginTop: "4px"}}>
                            Fwd by: {item.forwarded_by_name}
                          </div>
                        )}
                      </td>
                      <td style={styles.td}>
                        {subTab === 'pending' ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {(isSuperAdmin || isSubAdmin) && (
                              <button style={styles.approveBtn} onClick={() => {
                                if(activeTab==='leaves') openApproveModal('leave', item.id);
                                else if(activeTab==='regularizations') openApproveModal('regularization', item.id);
                                else handleBalanceAction(item.id, 'APPROVED');
                              }}>Approve</button>
                            )}
                            <button style={styles.rejectBtn} onClick={() => {
                              if(activeTab==='leaves') openRejectModal('leave', item.id);
                              else if(activeTab==='regularizations') openRejectModal('regularization', item.id);
                              else handleBalanceAction(item.id, 'REJECTED');
                            }}>Reject</button>
                            {user?.role_id !== 1 && activeTab !== 'balance_actions' && (
                              <button style={styles.forwardBtn} onClick={() => {
                                if(activeTab==='leaves') handleForwardLeave(item.id);
                                else if(activeTab==='regularizations') handleForwardReg(item.id, item.attendance_summary_id);
                              }}>Forward</button>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                            {item.forwarded_by_id === user.id ? 'Forwarded' : 'Reviewed'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {showRejectModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>Reject Request</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              style={{...styles.input, width: '100%', height: '100px', marginBottom: '15px', resize: 'none'}}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowRejectModal(false)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={handleRejectSubmit} style={styles.rejectModalBtn}>Confirm Reject</button>
            </div>
          </div>
        </div>
      )}

      {showApproveModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>Approve Request</h3>
            <textarea
              value={approveRemarks}
              onChange={(e) => setApproveRemarks(e.target.value)}
              placeholder="Approval remarks (optional)..."
              style={{...styles.input, width: '100%', height: '100px', marginBottom: '15px', resize: 'none'}}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowApproveModal(false)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={handleApproveSubmit} style={{...styles.approveBtn, padding: '10px 16px'}}>Confirm Approve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  layout: { display: "flex", minHeight: "100vh" },
  main: { flexGrow: 1, marginLeft: "260px" },
  contentPadding: { padding: "40px" },
  header: { marginBottom: "24px" },
  title: { fontSize: "24px", fontWeight: "600", color: "var(--text-main)", margin: "0 0 5px 0" },
  subtitle: { color: "var(--text-muted)", margin: 0 },
  
  filterSelect: { padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" },
  
  tabsContainer: { display: 'flex', gap: '20px', borderBottom: '1px solid #e2e8f0', marginTop: '20px' },
  mainTabBtn: { background: "none", border: "none", padding: "10px 20px", fontSize: "15px", fontWeight: "600", cursor: "pointer", color: "#64748b" },
  activeMainTab: { borderBottom: "2px solid #2563eb", color: "#2563eb" },
  
  subTabsContainer: { display: 'flex', gap: '10px', marginTop: '20px' },
  subTabBtn: { background: "#f1f5f9", border: "none", padding: "8px 16px", borderRadius: "20px", fontSize: "13px", fontWeight: "600", cursor: "pointer", color: "#64748b" },
  activeSubTab: { background: "#334155", color: "white" },

  tableContainer: { backgroundColor: "var(--bg-card)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-md)", overflow: "hidden", border: "1px solid var(--border)", marginTop: '20px' },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left" },
  th: { backgroundColor: "var(--bg-main)", padding: "16px", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.5px" },
  tr: { borderBottom: "1px solid var(--border)" },
  td: { padding: "16px", color: "var(--text-main)", fontSize: "15px" },
  
  typeBadge: { backgroundColor: "var(--bg-main)", color: "var(--text-main)", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" },
  badgeApproved: { padding: "6px 12px", backgroundColor: "#dcfce7", color: "#16a34a", borderRadius: "12px", fontSize: "12px", fontWeight: "600" },
  badgeRejected: { padding: "6px 12px", backgroundColor: "#fee2e2", color: "#dc2626", borderRadius: "12px", fontSize: "12px", fontWeight: "600" },
  badgePending: { padding: "6px 12px", backgroundColor: "#fef3c7", color: "#d97706", borderRadius: "12px", fontSize: "12px", fontWeight: "600" },
  badgePendingAdmin: { padding: "6px 12px", backgroundColor: "#e0e7ff", color: "#4f46e5", borderRadius: "12px", fontSize: "12px", fontWeight: "600" },
  
  approveBtn: { backgroundColor: "#10b981", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "13px" },
  rejectBtn: { backgroundColor: "#ef4444", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "13px" },
  forwardBtn: { backgroundColor: "#3b82f6", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "13px" },

  modalOverlay: { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modalContent: { backgroundColor: "white", padding: "30px", borderRadius: "12px", width: "400px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)" },
  input: { padding: "12px 16px", border: "1px solid #cbd5e1", borderRadius: "8px", outline: "none", fontSize: "14px", backgroundColor: "#fff", color: "#0f172a" },
  cancelBtn: { backgroundColor: "transparent", color: "#475569", border: "1px solid #cbd5e1", padding: "10px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" },
  rejectModalBtn: { backgroundColor: "#ef4444", color: "white", border: "none", padding: "10px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }
};

export default ApprovalsInbox;