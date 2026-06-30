import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const EmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [balanceActions, setBalanceActions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters for Leave History
  const [historyMonth, setHistoryMonth] = useState(new Date().getMonth() + 1);
  const [historyYear, setHistoryYear] = useState(new Date().getFullYear());

  // Surrender Modal State
  const [showSurrenderModal, setShowSurrenderModal] = useState(false);
  const [surrenderData, setSurrenderData] = useState({ leave_type_id: null, action_type: "REDEEM", days: 0 });

  useEffect(() => {
    fetchProfileData();
  }, [id]);

  const fetchProfileData = async () => {
    try {
      // 1. Fetch all employees to find this specific one (since we don't have GET /employees/:id yet)
      const empRes = await API.get("/employees");
      const currentEmp = empRes.data.find(e => e.id === parseInt(id));
      setEmployee(currentEmp);

      if (currentEmp) {
        // 2. Fetch Leave Balances
        const balRes = await API.get(`/leaves/balances/${currentEmp.id}`);
        setLeaveBalances(balRes.data);

        // 3. Fetch Leave History
        const histRes = await API.get(`/leaves/my-leaves/${currentEmp.id}`);
        setLeaveHistory(histRes.data);

        // 4. Fetch Balance Actions
        const actionsRes = await API.get(`/leaves/balance-actions?employeeId=${currentEmp.id}`);
        setBalanceActions(actionsRes.data);
      }
      setLoading(false);
    } catch (err) {
      console.error("Failed to load profile", err);
      setLoading(false);
    }
  };

  if (loading) return <div style={styles.layout}>Loading...</div>;
  if (!employee) return <div style={styles.layout}>Employee not found.</div>;

  const handleSurrenderSubmit = async (e) => {
    e.preventDefault();
    if (surrenderData.days <= 0) return alert("Please enter valid days");
    try {
      await API.post("/leaves/balance-action", {
        employee_id: employee.id,
        leave_type_id: surrenderData.leave_type_id,
        action_type: surrenderData.action_type,
        days: surrenderData.days
      });
      alert("Request submitted successfully!");
      setShowSurrenderModal(false);
      fetchProfileData();
    } catch (err) {
      alert("Failed to submit request");
    }
  };

  const filteredHistory = leaveHistory.filter(h => {
    const d = new Date(h.applied_on);
    return (historyMonth === "" || d.getMonth() + 1 === parseInt(historyMonth)) && 
           (historyYear === "" || d.getFullYear() === parseInt(historyYear));
  });

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.main}>
        <Navbar />
        <div style={styles.contentPadding}>
          <div style={styles.header}>
            <button style={styles.backBtn} onClick={() => navigate("/employees")}>← Back to Directory</button>
            <h2 style={styles.title}>{employee.name}'s Profile</h2>
          </div>

          <div style={styles.gridContainer}>
            {/* Employee Details Card */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Employee Details</h3>
              <div style={styles.detailRow}><strong>Employee Code:</strong> {employee.employee_code}</div>
              <div style={styles.detailRow}><strong>Email:</strong> {employee.email}</div>
              <div style={styles.detailRow}><strong>Department:</strong> {employee.department_name || "-"}</div>
              <div style={styles.detailRow}><strong>Level:</strong> {employee.level_name || "-"}</div>
              <div style={styles.detailRow}><strong>Shift:</strong> {employee.shift_name || "-"}</div>
              <div style={styles.detailRow}><strong>Manager:</strong> {employee.manager_name || "-"}</div>
              <div style={styles.detailRow}><strong>Role:</strong> {employee.role_id === 1 ? "Admin" : "Employee"}</div>
            </div>

            {/* Leave Balances Card */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Leave Balances</h3>
              {leaveBalances.length === 0 ? <p>No leave balances found.</p> : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Allocated</th>
                      <th style={styles.th}>Used</th>
                      <th style={styles.th}>Surrendered</th>
                      <th style={styles.th}>Balance</th>
                      <th style={styles.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveBalances.map((bal, idx) => (
                      <tr key={idx} style={styles.tr}>
                        <td style={styles.td}><strong>{bal.leave_type_name}</strong></td>
                        <td style={styles.td}>{bal.annual_quota}</td>
                        <td style={styles.td}>{bal.days_taken}</td>
                        <td style={styles.td}>{bal.days_surrendered || 0}</td>
                        <td style={styles.td}>
                          <span style={{...styles.badge, backgroundColor: bal.balance > 0 ? '#dcfce7' : '#fee2e2', color: bal.balance > 0 ? '#166534' : '#991b1b'}}>
                            {bal.balance}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {bal.balance > 0 && (bal.is_encashable || bal.is_carry_forwardable) ? (
                            <button 
                              onClick={() => {
                                setSurrenderData({ leave_type_id: bal.leave_type_id, action_type: bal.is_encashable ? "REDEEM" : "CARRY_FORWARD", days: 0 });
                                setShowSurrenderModal(true);
                              }}
                              style={{...styles.badge, backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', cursor: 'pointer'}}
                            >
                              Redeem / Carry Fwd
                            </button>
                          ) : (
                            <span style={{color: '#94a3b8', fontSize: '12px'}}>-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Leave History Table */}
          <div style={{...styles.card, marginTop: '20px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
              <h3 style={{...styles.cardTitle, margin: 0, borderBottom: 'none'}}>Leave Request History</h3>
              <div style={{display: 'flex', gap: '10px'}}>
                <select value={historyMonth} onChange={e => setHistoryMonth(e.target.value)} style={{padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1'}}>
                  <option value="">All Months</option>
                  {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'short' })}</option>
                  ))}
                </select>
                <select value={historyYear} onChange={e => setHistoryYear(e.target.value)} style={{padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1'}}>
                  <option value="">All Years</option>
                  <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                  <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
                </select>
              </div>
            </div>
            
            {filteredHistory.length === 0 ? <p>No leave requests found for selected period.</p> : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Date Applied</th>
                    <th style={styles.th}>Duration</th>
                    <th style={styles.th}>Reason</th>
                    <th style={styles.th}>Handled By</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((leave, idx) => (
                    <tr key={idx} style={styles.tr}>
                      <td style={styles.td}>{new Date(leave.applied_on).toLocaleDateString()}</td>
                      <td style={styles.td}>
                        {new Date(leave.start_date).toLocaleDateString()} to {new Date(leave.end_date).toLocaleDateString()}<br/>
                        <small style={{color: '#64748b'}}>{leave.leave_portion}</small>
                      </td>
                      <td style={styles.td}>{leave.reason}</td>
                      <td style={styles.td}>
                        {leave.resolved_by_name && <div style={{fontSize:'12px'}}>Approved by: {leave.resolved_by_name}</div>}
                        {leave.forwarded_by_name && <div style={{fontSize:'12px'}}>Fwd by: {leave.forwarded_by_name}</div>}
                        {!leave.resolved_by_name && !leave.forwarded_by_name && '-'}
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge, 
                          backgroundColor: leave.status === 'APPROVED' ? '#dcfce7' : leave.status === 'REJECTED' ? '#fee2e2' : '#fef9c3',
                          color: leave.status === 'APPROVED' ? '#166534' : leave.status === 'REJECTED' ? '#991b1b' : '#854d0e'
                        }}>
                          {leave.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Balance Actions History Table */}
          <div style={{...styles.card, marginTop: '20px'}}>
            <h3 style={styles.cardTitle}>Balance Surrender Requests</h3>
            {balanceActions.length === 0 ? <p>No surrender requests found.</p> : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Leave Type</th>
                    <th style={styles.th}>Action</th>
                    <th style={styles.th}>Days</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {balanceActions.map((act, idx) => (
                    <tr key={idx} style={styles.tr}>
                      <td style={styles.td}>{new Date(act.applied_on).toLocaleDateString()}</td>
                      <td style={styles.td}>{act.leave_type_name}</td>
                      <td style={styles.td}>{act.action_type === 'REDEEM' ? 'Encashment' : 'Carry Forward'}</td>
                      <td style={styles.td}>{act.days}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge, 
                          backgroundColor: act.status === 'APPROVED' ? '#dcfce7' : act.status === 'REJECTED' ? '#fee2e2' : '#fef9c3',
                          color: act.status === 'APPROVED' ? '#166534' : act.status === 'REJECTED' ? '#991b1b' : '#854d0e'
                        }}>
                          {act.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </div>

      {showSurrenderModal && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div style={{backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '400px'}}>
            <h3 style={{marginTop: 0}}>Request Leave Surrender</h3>
            <form onSubmit={handleSurrenderSubmit}>
              <div style={{marginBottom: '15px'}}>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600'}}>Action</label>
                <select 
                  value={surrenderData.action_type} 
                  onChange={e => setSurrenderData({...surrenderData, action_type: e.target.value})}
                  style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1'}}
                >
                  {leaveBalances.find(b => b.leave_type_id === surrenderData.leave_type_id)?.is_encashable && (
                    <option value="REDEEM">Encashment (Redeem)</option>
                  )}
                  {leaveBalances.find(b => b.leave_type_id === surrenderData.leave_type_id)?.is_carry_forwardable && (
                    <option value="CARRY_FORWARD">Carry Forward to Next Year</option>
                  )}
                </select>
              </div>
              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '600'}}>Number of Days</label>
                <input 
                  type="number" 
                  step="0.5" 
                  min="0.5" 
                  max={leaveBalances.find(b => b.leave_type_id === surrenderData.leave_type_id)?.balance || 0}
                  value={surrenderData.days} 
                  onChange={e => setSurrenderData({...surrenderData, days: e.target.value})}
                  style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box'}}
                />
              </div>
              <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                <button type="button" onClick={() => setShowSurrenderModal(false)} style={{padding: '10px 15px', border: 'none', backgroundColor: '#e2e8f0', borderRadius: '6px', cursor: 'pointer', fontWeight: '600'}}>Cancel</button>
                <button type="submit" style={{padding: '10px 15px', border: 'none', backgroundColor: '#2563eb', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: '600'}}>Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  layout: { display: "flex", minHeight: "100vh", backgroundColor: "#f8fafc" },
  main: { flexGrow: 1, marginLeft: "260px" },
  contentPadding: { padding: "40px" },
  header: { display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" },
  backBtn: { alignSelf: "flex-start", background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontWeight: "600", fontSize: "14px" },
  title: { fontSize: "24px", fontWeight: "600", color: "var(--text-main)", margin: 0 },
  gridContainer: { display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px" },
  card: { backgroundColor: "white", padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", border: "1px solid var(--border)" },
  cardTitle: { fontSize: "18px", margin: "0 0 16px 0", color: "var(--text-main)", borderBottom: "1px solid var(--border)", paddingBottom: "10px" },
  detailRow: { marginBottom: "12px", fontSize: "14px", color: "#334155" },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left" },
  th: { padding: "12px", backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0", color: "#64748b", fontSize: "12px", textTransform: "uppercase" },
  tr: { borderBottom: "1px solid #e2e8f0" },
  td: { padding: "12px", color: "#334155", fontSize: "14px" },
  badge: { padding: "4px 8px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" }
};

export default EmployeeProfile;
