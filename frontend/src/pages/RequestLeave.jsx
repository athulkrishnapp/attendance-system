import { useState, useEffect } from "react";
import API from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

// Get today's date in YYYY-MM-DD format for the local timezone
const getTodayDate = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const todayFormatted = getTodayDate();

const RequestLeave = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const [leaves, setLeaves] = useState([]);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [noticeDays, setNoticeDays] = useState(0); 
  
  const [leaveForm, setLeaveForm] = useState({ 
    start_date: "", 
    end_date: "",
    leave_type: "Sick Leave", 
    duration: "Full Day",
    reason: "" 
  });

  // Fetch both settings and history on load
  useEffect(() => { 
    fetchSettings(); 
    fetchMyLeaves(); 
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await API.get("/settings");
      if(res.data.settings && res.data.settings.casual_leave_notice_days) {
        setNoticeDays(res.data.settings.casual_leave_notice_days);
      }
    } catch (err) { console.error("Failed to load leave policies"); }
  };

  const fetchMyLeaves = async () => {
    try {
      const res = await API.get(`/leaves/my-leaves/${user.id}`);
      setLeaves(res.data);
    } catch (err) { console.error(err); }
  };

  // Dynamic Date Calculator based on Admin Rules
  const getMinStartDate = () => {
    const date = new Date();
    if (leaveForm.leave_type === "Casual Leave" && noticeDays > 0) {
      date.setDate(date.getDate() + parseInt(noticeDays));
    }
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const minStartDateFormatted = getMinStartDate();

  const submitLeave = async (e) => {
    e.preventDefault();
    setMsg({ text: "", type: "" }); 
    
    const actualEndDate = leaveForm.end_date || leaveForm.start_date;
    const isActuallyMultiDay = leaveForm.start_date !== actualEndDate;

    const minAllowedDate = new Date(minStartDateFormatted);
    const selectedStartDate = new Date(leaveForm.start_date);
    
    minAllowedDate.setHours(0,0,0,0);
    selectedStartDate.setHours(0,0,0,0);

    if (selectedStartDate < minAllowedDate) {
      setMsg({ 
        text: leaveForm.leave_type === "Casual Leave" 
          ? `Company Policy: Casual Leave requires at least ${noticeDays} days prior notice.` 
          : "You cannot select a past date.", 
        type: "error" 
      });
      return;
    }

    if (new Date(actualEndDate) < new Date(leaveForm.start_date)) {
      setMsg({ text: "End Date cannot be earlier than Start Date.", type: "error" });
      return;
    }

    try {
      await API.post("/leaves/request", { 
        employee_id: user.id,
        start_date: leaveForm.start_date,
        end_date: actualEndDate, 
        duration: isActuallyMultiDay ? "Multiple Days" : leaveForm.duration,
        leave_type: leaveForm.leave_type,
        reason: leaveForm.reason
      });
      setMsg({ text: "Leave request submitted successfully.", type: "success" });
      setLeaveForm({ start_date: "", end_date: "", leave_type: "Sick Leave", duration: "Full Day", reason: "" });
      setTimeout(() => setMsg({ text: "", type: "" }), 3000);
      fetchMyLeaves(); 
    } catch (err) { 
      setMsg({ text: "Failed to submit request. Please check backend server.", type: "error" }); 
      console.error(err);
    }
  };

  const actualEndDateUI = leaveForm.end_date || leaveForm.start_date;
  const isMultiDay = leaveForm.start_date && actualEndDateUI && leaveForm.start_date !== actualEndDateUI;

  // Helper for Status Badges
  const getStatusStyle = (status) => {
    switch(status) {
      case 'APPROVED': return styles.badgeSuccess;
      case 'REJECTED': return styles.badgeError;
      default: return styles.badgeWarning;
    }
  };

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.main}>
        <Navbar />
        <div style={styles.contentPadding}>
          
          <div style={styles.headerSection}>
            <h2 style={styles.pageTitle}>Leave Management</h2>
            <p style={styles.pageSubtitle}>Apply for time off and track your request history.</p>
          </div>

          {/* SIDE BY SIDE GRID LAYOUT */}
          <div style={styles.gridContainer}>
            
            {/* LEFT COLUMN: Apply Form */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Submit Leave Application</h3>
              </div>
              
              <div style={styles.cardBody}>
                {msg.text && (
                  <div style={msg.type === "error" ? styles.errorMsg : styles.successMsg}>{msg.text}</div>
                )}
                
                {leaveForm.leave_type === "Casual Leave" && noticeDays > 0 && (
                  <div style={styles.infoBanner}>
                    Note: Casual Leaves must be requested at least <strong>{noticeDays} days</strong> in advance.
                  </div>
                )}

                <form onSubmit={submitLeave} style={styles.form}>
                  <label style={styles.label}>Leave Type</label>
                  <select value={leaveForm.leave_type} onChange={e => {
                      setLeaveForm({...leaveForm, leave_type: e.target.value, start_date: "", end_date: ""}); 
                      setMsg({text: "", type: ""});
                    }} style={styles.input}>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Emergency Leave">Emergency Leave</option>
                    <option value="Leave Without Pay">Leave Without Pay (LWP)</option>
                  </select>

                  <div style={{ display: "flex", gap: "15px" }}>
                    <div style={{flex: 1}}>
                      <label style={styles.label}>Start Date</label>
                      <input 
                        type="date" 
                        value={leaveForm.start_date} 
                        onChange={e => setLeaveForm({...leaveForm, start_date: e.target.value})} 
                        required 
                        style={styles.input} 
                        min={minStartDateFormatted} 
                      />
                    </div>
                    <div style={{flex: 1}}>
                      <label style={styles.label}>End Date</label>
                      <input 
                        type="date" 
                        value={leaveForm.end_date} 
                        onChange={e => setLeaveForm({...leaveForm, end_date: e.target.value})} 
                        required 
                        style={styles.input} 
                        min={leaveForm.start_date || minStartDateFormatted} 
                      />
                    </div>
                  </div>

                  {!isMultiDay && (
                    <div>
                      <label style={styles.label}>Duration (For Single Day)</label>
                      <select value={leaveForm.duration} onChange={e => setLeaveForm({...leaveForm, duration: e.target.value})} style={styles.input}>
                        <option value="Full Day">Full Day</option>
                        <option value="Half Day (Forenoon)">Half Day (Forenoon)</option>
                        <option value="Half Day (Afternoon)">Half Day (Afternoon)</option>
                      </select>
                    </div>
                  )}

                  <label style={styles.label}>Reason</label>
                  <textarea placeholder="Briefly explain the reason for leave..." value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})} required style={{...styles.input, height: "100px", resize: "none"}} />
                  
                  <button type="submit" style={styles.submitBtn}>Submit Application</button>
                </form>
              </div>
            </div>

            {/* RIGHT COLUMN: History Table */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>My Request History</h3>
              </div>
              <div style={styles.cardBodyTable}>
                <div style={{ overflowY: "auto", maxHeight: "550px" }}>
                  <table style={styles.table}>
                    <thead style={styles.stickyHeader}>
                      <tr>
                        <th style={styles.th}>Date Range</th>
                        <th style={styles.th}>Details</th>
                        <th style={styles.th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaves.map(l => (
                        <tr key={l.id} style={styles.tr}>
                          <td style={styles.td}>
                            {l.start_date === l.end_date 
                              ? new Date(l.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                              : `${new Date(l.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${new Date(l.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
                            }
                          </td>
                          <td style={styles.td}>
                            <strong style={{color: "var(--text-main)"}}>{l.leave_type}</strong><br/>
                            <span style={{fontSize: "12px", color: "var(--text-muted)"}}>{l.duration}</span>
                          </td>
                          <td style={styles.td}>
                            <span style={{...styles.badge, ...getStatusStyle(l.status)}}>
                              {l.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {leaves.length === 0 && (
                        <tr>
                          <td colSpan="3" style={{textAlign:"center", padding: "40px", color:"var(--text-muted)"}}>
                            <span style={{fontSize: "24px", display: "block", marginBottom: "10px"}}>📭</span>
                            No past leave requests found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

// Updated Styles for a premium side-by-side look
const styles = {
  layout: { display: "flex", minHeight: "100vh", backgroundColor: "#f8fafc" },
  main: { flexGrow: 1, marginLeft: "260px" },
  contentPadding: { padding: "30px 40px" },
  
  headerSection: { marginBottom: "30px" },
  pageTitle: { margin: "0 0 5px 0", fontSize: "24px", color: "var(--text-main)", fontWeight: "700" },
  pageSubtitle: { margin: "0", fontSize: "14px", color: "var(--text-muted)" },

  // Grid replaces the max-width restriction
  gridContainer: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "30px" },
  
  card: { backgroundColor: "var(--bg-card)", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)", border: "1px solid var(--border)", overflow: "hidden", display: "flex", flexDirection: "column" },
  cardHeader: { backgroundColor: "#f8fafc", padding: "20px 25px", borderBottom: "1px solid var(--border)" },
  cardTitle: { fontSize: "18px", color: "var(--text-main)", margin: 0, fontWeight: "600" },
  cardBody: { padding: "25px" },
  cardBodyTable: { padding: "0" }, // No padding so table stretches edge-to-edge

  infoBanner: { backgroundColor: "#fffbeb", color: "#b45309", padding: "12px 16px", borderRadius: "8px", border: "1px solid #fde68a", fontSize: "14px", marginBottom: "20px", display: "flex", alignItems: "center" },
  form: { display: "flex", flexDirection: "column", gap: "18px" },
  label: { fontSize: "14px", fontWeight: "600", color: "#475569", marginBottom: "6px", display: "block" },
  input: { padding: "12px 16px", border: "1px solid #cbd5e1", borderRadius: "8px", width: "100%", outline: "none", fontSize: "14px", backgroundColor: "#fff", transition: "border-color 0.2s", color: "#0f172a" },
  
  submitBtn: { backgroundColor: "var(--primary)", color: "white", padding: "14px", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "15px", marginTop: "10px", transition: "opacity 0.2s" },
  
  table: { width: "100%", borderCollapse: "collapse" },
  stickyHeader: { position: "sticky", top: 0, backgroundColor: "#f8fafc", zIndex: 1 },
  th: { padding: "16px 25px", backgroundColor: "#f8fafc", fontSize: "13px", color: "var(--text-muted)", borderBottom: "1px solid var(--border)", textAlign: "left", textTransform: "uppercase", fontWeight: "600" },
  tr: { borderBottom: "1px solid var(--border)", transition: "background-color 0.2s" },
  td: { padding: "16px 25px", color: "var(--text-main)", fontSize: "14px", verticalAlign: "middle" },
  
  // Status Badges
  badge: { padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "600", display: "inline-block" },
  badgeSuccess: { backgroundColor: "#dcfce7", color: "#166534" },
  badgeError: { backgroundColor: "#fee2e2", color: "#991b1b" },
  badgeWarning: { backgroundColor: "#fef3c7", color: "#92400e" },

  successMsg: { padding: "14px", backgroundColor: "#f0fdf4", color: "#166534", borderRadius: "8px", fontSize: "14px", marginBottom: "20px", border: "1px solid #bbf7d0", fontWeight: "500" },
  errorMsg: { padding: "14px", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "8px", fontSize: "14px", marginBottom: "20px", border: "1px solid #fecaca", fontWeight: "500" }
};

export default RequestLeave;