import { useState, useEffect } from "react";
import API, { api } from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const SwipeReports = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState("calendar"); // 'calendar' | 'report'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Regularization Modal State
  const [showRegModal, setShowRegModal] = useState(false);
  const [regForm, setRegForm] = useState({ attendance_summary_id: null, requested_first_in: "", requested_last_out: "", reason: "" });

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    fetchMyAttendance();
  }, []);

  const fetchMyAttendance = async () => {
    try {
      const res = await API.get(`/reports/my-attendance/${user.id}`);
      setAttendance(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const openRegModal = (id, log) => {
    setRegForm({ 
      attendance_summary_id: id, 
      requested_first_in: log.first_in || "", 
      requested_last_out: log.last_out || "", 
      reason: "" 
    });
    setShowRegModal(true);
  };

  const submitRegularization = async (e) => {
    e.preventDefault();
    try {
      await api.regularizations.request({
        ...regForm,
        employee_id: user.id
      });
      setShowRegModal(false);
      fetchMyAttendance();
      alert("Regularization request submitted successfully.");
    } catch (err) {
      alert("Failed to submit request.");
    }
  };

  const handleMonthClick = (monthIndex) => {
    setSelectedMonth(monthIndex);
    setViewMode("report");
  };

  const filteredLogs = attendance.filter(log => {
    if (!log.attendance_date) return false;
    const yearStr = log.attendance_date.substring(0, 4);
    const monthStr = log.attendance_date.substring(5, 7);
    return parseInt(monthStr) === parseInt(selectedMonth) && parseInt(yearStr) === parseInt(selectedYear);
  });

  const totalDays = filteredLogs.length;
  const presentDays = filteredLogs.filter(l => l.core_status === "PRESENT").length;
  const lateDays = filteredLogs.filter(l => l.core_status === "PRESENT" && l.remarks && l.remarks.includes("LATE ARRIVAL")).length;
  const halfDays = filteredLogs.filter(l => l.core_status === "HALF_DAY").length;

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.main}>
        <Navbar />
        <div style={styles.contentPadding}>

          {viewMode === "calendar" ? (
            <div>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: "20px" }}>
                <h3 style={{...styles.calendarTitle, marginBottom: 0}}>Select Month to View Attendance</h3>
                <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={styles.monthSelect}>
                  {[0,1,2,3,4].map(y => (
                    <option key={y} value={new Date().getFullYear() - y}>{new Date().getFullYear() - y}</option>
                  ))}
                </select>
              </div>
              <div style={styles.calendarGrid}>
                {months.map((monthName, index) => (
                  <button 
                    key={index} 
                    style={styles.monthCard} 
                    onClick={() => handleMonthClick(index + 1)}
                  >
                    <span style={styles.monthName}>{monthName}</span>
                    <span style={styles.yearLabel}>{selectedYear}</span>
                  </button>

                ))}
              </div>
            </div>
          ) : (
            <div>
              <div style={styles.controls}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <button onClick={() => setViewMode("calendar")} style={styles.backBtn}>← Back</button>
                  <h3 style={{margin: 0, color: "var(--text-main)"}}>Swipe Details</h3>
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={styles.monthSelect}>
                    {months.map((monthName, i) => (
                      <option key={i+1} value={i+1}>{monthName}</option>
                    ))}
                  </select>
                  <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={styles.monthSelect}>
                    {[0,1,2,3,4].map(y => (
                      <option key={y} value={new Date().getFullYear() - y}>{new Date().getFullYear() - y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Monthly Summary Graph */}
              <div style={styles.summaryCard}>
                <h4 style={{margin: "0 0 15px 0", color: "var(--text-muted)"}}>Monthly Summary</h4>
                <div style={styles.graphBar}>
                   <div style={{...styles.graphSegment, width: `${totalDays ? (presentDays/totalDays)*100 : 0}%`, backgroundColor: "#10b981"}} title="Present"></div>
                   <div style={{...styles.graphSegment, width: `${totalDays ? (halfDays/totalDays)*100 : 0}%`, backgroundColor: "#f59e0b"}} title="Half Day"></div>
                   <div style={{...styles.graphSegment, width: `${totalDays ? (lateDays/totalDays)*100 : 0}%`, backgroundColor: "#ef4444"}} title="Late"></div>
                </div>
                <div style={styles.legend}>
                  <span><span style={{color: "#10b981"}}>●</span> Present ({presentDays})</span>
                  <span><span style={{color: "#ef4444"}}>●</span> Late ({lateDays})</span>
                  <span><span style={{color: "#f59e0b"}}>●</span> Half Days ({halfDays})</span>
                </div>
              </div>

              <div style={styles.tableContainer}>
                {loading ? <p style={{padding: "20px"}}>Loading data...</p> : (
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Date</th>
                        <th style={styles.th}>In Time</th>
                        <th style={styles.th}>Out Time</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Flags</th>
                        <th style={styles.th}>Regularization</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map(log => {
                        const dateOnly = log.attendance_date.split('T')[0];
                        
                        const getStatusDisplay = () => {
                            if (log.core_status === 'LEAVE') return log.leave_type_name ? `Leave (${log.leave_type_name})` : "Leave";
                            if (log.core_status === 'HALF_DAY') return "Half Day";
                            if (log.core_status === 'MISSING_PUNCH') return "Missing Punch";
                            if (log.core_status === 'WEEKEND') return "Week Off";
                            if (log.core_status === 'HOLIDAY') return "Holiday";
                            if (log.core_status === 'PRESENT') return "Present";
                            if (log.core_status === 'ABSENT') return "Absent";
                            return log.core_status;
                        };

                        const hasFlag = (flag) => log.modifier_flags && log.modifier_flags.includes(flag);
                        const canRegularize = (log.core_status === 'MISSING_PUNCH' || log.core_status === 'ABSENT' || hasFlag('LATE') || hasFlag('EARLY_EXIT')) && !log.regularization_status;

                        return (
                          <tr key={log.id} style={styles.tr}>
                            <td style={styles.td}><strong>{dateOnly}</strong></td>
                            <td style={styles.td}>{log.first_in || "-"}</td>
                            <td style={styles.td}>{log.last_out || "-"}</td>
                            <td style={{...styles.td, fontWeight: "600"}}>
                              {getStatusDisplay()}
                            </td>
                            <td style={styles.td}>
                              {log.modifier_flags && log.modifier_flags.length > 0 ? (
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                  {log.modifier_flags.map((flag, idx) => (
                                    <span key={idx} style={styles.flagBadge}>{flag.replace(/_/g, ' ')}</span>
                                  ))}
                                </div>
                              ) : "-"}
                            </td>
                            <td style={styles.td}>
                              {canRegularize ? (
                                <button onClick={() => openRegModal(log.id, log)} style={styles.regBtn}>Request</button>
                              ) : (
                                <span style={{ fontWeight: "600", color: log.regularization_status === 'PENDING' ? '#8b5cf6' : 'inherit' }}>
                                  {log.regularization_status || "-"}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredLogs.length === 0 && (
                        <tr><td colSpan="6" style={{textAlign: "center", padding: "30px"}}>No swipes recorded for this month.</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Regularization Modal */}
      {showRegModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{marginTop: 0, color: "var(--text-main)"}}>Request Regularization</h3>
            <p style={{fontSize: "14px", color: "var(--text-muted)", marginBottom: "20px"}}>
              Please specify the actual times you worked and the reason for the missing/incorrect punch.
            </p>
            <form onSubmit={submitRegularization} style={{display: "flex", flexDirection: "column", gap: "15px"}}>
              <div style={{display: "flex", gap: "15px"}}>
                <div style={{flex: 1}}>
                  <label style={styles.label}>First In</label>
                  <input type="time" value={regForm.requested_first_in} onChange={e => setRegForm({...regForm, requested_first_in: e.target.value})} style={styles.input} required />
                </div>
                <div style={{flex: 1}}>
                  <label style={styles.label}>Last Out</label>
                  <input type="time" value={regForm.requested_last_out} onChange={e => setRegForm({...regForm, requested_last_out: e.target.value})} style={styles.input} required />
                </div>
              </div>
              <div>
                <label style={styles.label}>Reason</label>
                <textarea 
                  placeholder="e.g., Forgot to swipe, System error, Business travel..." 
                  value={regForm.reason} 
                  onChange={e => setRegForm({...regForm, reason: e.target.value})} 
                  style={{...styles.input, height: "80px", resize: "none"}} 
                  required 
                />
              </div>
              <div style={{display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px"}}>
                <button type="button" onClick={() => setShowRegModal(false)} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" style={styles.submitModalBtn}>Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

const styles = {
  layout: { display: "flex", minHeight: "100vh" },
  main: { flexGrow: 1, marginLeft: "260px" },
  contentPadding: { padding: "0 40px 40px 40px" },
  calendarTitle: { fontSize: "20px", color: "var(--text-main)", marginBottom: "20px" },
  calendarGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" },
  monthCard: { 
    backgroundColor: "var(--bg-card)", padding: "30px 20px", borderRadius: "12px", border: "1px solid var(--border)",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer",
    boxShadow: "var(--shadow-sm)", transition: "transform 0.2s, box-shadow 0.2s"
  },
  monthName: { fontSize: "18px", fontWeight: "600", color: "var(--primary)", marginBottom: "8px" },
  yearLabel: { fontSize: "13px", color: "var(--text-muted)" },
  controls: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  backBtn: { backgroundColor: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" },
  monthSelect: { padding: "10px", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "15px", outline: "none", width: "200px" },
  summaryCard: { backgroundColor: "var(--bg-card)", padding: "20px", borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)", marginBottom: "20px", border: "1px solid var(--border)" },
  graphBar: { width: "100%", height: "20px", backgroundColor: "#f1f5f9", borderRadius: "10px", display: "flex", overflow: "hidden", marginBottom: "10px" },
  graphSegment: { height: "100%", transition: "width 0.5s ease" },
  legend: { display: "flex", gap: "20px", fontSize: "13px", fontWeight: "500", color: "var(--text-muted)" },
  tableContainer: { backgroundColor: "var(--bg-card)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)", overflow: "hidden", border: "1px solid var(--border)" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "12px 15px", borderBottom: "2px solid var(--border)", color: "var(--text-muted)", fontSize: "14px", fontWeight: "600" },
  td: { padding: "15px", borderBottom: "1px solid var(--border)", fontSize: "14px", color: "var(--text-main)", verticalAlign: "middle" },
  tr: { ":hover": { backgroundColor: "var(--bg-card-hover)" } },
  regBtn: { backgroundColor: "var(--primary)", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "13px", fontWeight: "500" },
  flagBadge: { fontSize: "11px", backgroundColor: "#fef3c7", color: "#b45309", padding: "3px 6px", borderRadius: "4px", fontWeight: "600" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalContent: { backgroundColor: "white", padding: "30px", borderRadius: "12px", width: "450px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" },
  label: { display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "6px" },
  input: { width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", outline: "none" },
  cancelBtn: { backgroundColor: "transparent", color: "#475569", border: "1px solid #cbd5e1", padding: "10px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" },
  submitModalBtn: { backgroundColor: "var(--primary)", color: "white", border: "none", padding: "10px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }
};

export default SwipeReports;