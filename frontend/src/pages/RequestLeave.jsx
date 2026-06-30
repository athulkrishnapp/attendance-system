import { useState, useEffect } from "react";
import API, { api } from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

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
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [msg, setMsg] = useState({ text: "", type: "" });
  
  const [leaveForm, setLeaveForm] = useState({ 
    start_date: "", 
    end_date: "",
    leave_type_id: "", 
    leave_portion: "FULL_DAY",
    hourly_duration: 1,
    reason: "",
    file: null
  });

  useEffect(() => { 
    fetchMyLeaves(); 
    fetchLeaveTypes();
  }, []);

  const fetchLeaveTypes = async () => {
    try {
      const res = await api.leaveTypes.getAll();
      setLeaveTypes(res.data);
      if (res.data.length > 0) {
        setLeaveForm(prev => ({ ...prev, leave_type_id: res.data[0].id }));
      }
    } catch (err) { console.error("Failed to load leave types"); }
  };

  const fetchMyLeaves = async () => {
    try {
      const res = await API.get(`/leaves/my-leaves/${user.id}`);
      setLeaves(res.data);
    } catch (err) { console.error(err); }
  };

  // Dynamic Date Calculator based on Leave Type Rules
  const getSelectedLeaveType = () => leaveTypes.find(t => t.id == leaveForm.leave_type_id);
  const getNoticeDays = () => {
    const type = getSelectedLeaveType();
    return type ? type.min_advance_notice_days : 0;
  };

  const getMinStartDate = () => {
    const date = new Date();
    const notice = getNoticeDays();
    if (notice > 0) {
      date.setDate(date.getDate() + parseInt(notice));
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

    if (new Date(actualEndDate) < new Date(leaveForm.start_date)) {
      setMsg({ text: "End Date cannot be earlier than Start Date.", type: "error" });
      return;
    }

    const type = getSelectedLeaveType();
    if (type && type.requires_documentation && !leaveForm.file) {
      setMsg({ text: "This leave type requires supporting documentation. Please upload a file.", type: "error" });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("employee_id", user.id);
      formData.append("start_date", leaveForm.start_date);
      formData.append("end_date", actualEndDate);
      formData.append("leave_portion", isActuallyMultiDay ? "FULL_DAY" : leaveForm.leave_portion);
      
      if (leaveForm.leave_portion === 'HOURLY') {
        formData.append("hourly_duration", leaveForm.hourly_duration);
      }
      
      formData.append("leave_type_id", leaveForm.leave_type_id);
      formData.append("reason", leaveForm.reason);
      
      if (leaveForm.file) {
        formData.append("file", leaveForm.file);
      }

      await api.leaveRequests.request(formData);
      setMsg({ text: "Leave request submitted successfully.", type: "success" });
      setLeaveForm({ start_date: "", end_date: "", leave_type_id: leaveTypes.length > 0 ? leaveTypes[0].id : "", leave_portion: "FULL_DAY", hourly_duration: 1, reason: "", file: null });
      setTimeout(() => setMsg({ text: "", type: "" }), 3000);
      fetchMyLeaves(); 
    } catch (err) { 
      setMsg({ text: "Failed to submit request. Please check backend server.", type: "error" }); 
      console.error(err);
    }
  };

  const actualEndDateUI = leaveForm.end_date || leaveForm.start_date;
  const isMultiDay = leaveForm.start_date && actualEndDateUI && leaveForm.start_date !== actualEndDateUI;
  const selectedType = getSelectedLeaveType();

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
                
                {selectedType && selectedType.min_advance_notice_days > 0 && (
                  <div style={styles.purpleBanner}>
                    <strong>Note:</strong> This leave type should ideally be requested at least " <strong>{selectedType.min_advance_notice_days} days" </strong> in advance.
                  </div>
                )}
                
                {leaveForm.start_date && new Date(leaveForm.start_date).setHours(0,0,0,0) < new Date(minStartDateFormatted).setHours(0,0,0,0) && (
                  <div style={styles.warningBanner}>
                    <strong>Warning:</strong> You are requesting leave without the standard notice period. Your manager will be notified and this may affect approval.
                  </div>
                )}

                <form onSubmit={submitLeave} style={styles.form}>
                  <label style={styles.label}>Leave Type</label>
                  <select value={leaveForm.leave_type_id} onChange={e => {
                      setLeaveForm({...leaveForm, leave_type_id: e.target.value, start_date: "", end_date: ""}); 
                      setMsg({text: "", type: ""});
                    }} style={styles.input}>
                    {leaveTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
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
                        min={todayFormatted} 
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
                        min={leaveForm.start_date || todayFormatted} 
                      />
                    </div>
                  </div>

                  {!isMultiDay && (
                    <div style={{ display: "flex", gap: "15px" }}>
                      <div style={{flex: 1}}>
                        <label style={styles.label}>Duration (For Single Day)</label>
                        <select value={leaveForm.leave_portion} onChange={e => setLeaveForm({...leaveForm, leave_portion: e.target.value})} style={styles.input}>
                          <option value="FULL_DAY">Full Day</option>
                          <option value="FIRST_HALF">Half Day (Forenoon)</option>
                          <option value="SECOND_HALF">Half Day (Afternoon)</option>
                          <option value="HOURLY">Hourly Duration</option>
                        </select>
                      </div>
                      
                      {leaveForm.leave_portion === 'HOURLY' && (
                        <div style={{flex: 1}}>
                          <label style={styles.label}>Hours</label>
                          <input 
                            type="number" 
                            min="1" 
                            max="8" 
                            step="0.5" 
                            value={leaveForm.hourly_duration} 
                            onChange={e => setLeaveForm({...leaveForm, hourly_duration: e.target.value})} 
                            required 
                            style={styles.input} 
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <label style={styles.label}>Reason</label>
                  <textarea placeholder="Briefly explain the reason for leave..." value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})} required style={{...styles.input, height: "100px", resize: "none"}} />
                  
                  {selectedType && selectedType.requires_documentation && (
                    <div>
                      <label style={styles.label}>Supporting Document (Required)</label>
                      <input 
                        type="file" 
                        onChange={e => setLeaveForm({...leaveForm, file: e.target.files[0]})} 
                        style={styles.fileInput}
                        required
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                    </div>
                  )}

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
                            <strong style={{color: "var(--text-main)"}}>{l.leave_type_name || l.leave_type}</strong><br/>
                            <span style={{fontSize: "12px", color: "var(--text-muted)"}}>
                              {l.leave_portion ? l.leave_portion.replace('_', ' ') : l.duration} 
                              {l.leave_portion === 'HOURLY' ? ` (${l.hourly_duration}h)` : ''}
                            </span>
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

// Styles
const styles = {
  layout: { display: "flex", minHeight: "100vh", backgroundColor: "#f8fafc" },
  main: { flexGrow: 1, marginLeft: "260px" },
  contentPadding: { padding: "30px 40px" },
  
  headerSection: { marginBottom: "30px" },
  pageTitle: { margin: "0 0 5px 0", fontSize: "24px", color: "var(--text-main)", fontWeight: "700" },
  pageSubtitle: { margin: "0", fontSize: "14px", color: "var(--text-muted)" },

  gridContainer: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "30px" },
  
  card: { backgroundColor: "var(--bg-card)", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)", border: "1px solid var(--border)", overflow: "hidden", display: "flex", flexDirection: "column" },
  cardHeader: { backgroundColor: "#f8fafc", padding: "20px 25px", borderBottom: "1px solid var(--border)" },
  cardTitle: { fontSize: "18px", color: "var(--text-main)", margin: 0, fontWeight: "600" },
  cardBody: { padding: "25px" },
  cardBodyTable: { padding: "0" }, 

  infoBanner: { backgroundColor: "#eff6ff", color: "#1e3a8a", padding: "12px 16px", borderRadius: "8px", border: "1px solid #bfdbfe", fontSize: "14px", marginBottom: "10px", display: "flex", alignItems: "center" },
  purpleBanner: { backgroundColor: "#f3e8ff", color: "#6b21a8", padding: "12px 16px", borderRadius: "8px", border: "1px solid #d8b4fe", fontSize: "14px", marginBottom: "10px", display: "flex", alignItems: "center" },
  warningBanner: { backgroundColor: "#fffbeb", color: "#b45309", padding: "12px 16px", borderRadius: "8px", border: "1px solid #fde68a", fontSize: "14px", marginBottom: "20px", display: "flex", alignItems: "center" },
  form: { display: "flex", flexDirection: "column", gap: "18px" },
  label: { fontSize: "14px", fontWeight: "600", color: "#475569", marginBottom: "6px", display: "block" },
  input: { padding: "12px 16px", border: "1px solid #cbd5e1", borderRadius: "8px", width: "100%", outline: "none", fontSize: "14px", backgroundColor: "#fff", transition: "border-color 0.2s", color: "#0f172a" },
  fileInput: { padding: "10px", border: "1px dashed #cbd5e1", borderRadius: "8px", width: "100%", fontSize: "14px", backgroundColor: "#f8fafc", color: "#64748b" },
  
  submitBtn: { backgroundColor: "var(--primary)", color: "white", padding: "14px", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "15px", marginTop: "10px", transition: "opacity 0.2s" },
  
  table: { width: "100%", borderCollapse: "collapse" },
  stickyHeader: { position: "sticky", top: 0, backgroundColor: "#f8fafc", zIndex: 1 },
  th: { padding: "16px 25px", backgroundColor: "#f8fafc", fontSize: "13px", color: "var(--text-muted)", borderBottom: "1px solid var(--border)", textAlign: "left", textTransform: "uppercase", fontWeight: "600" },
  tr: { borderBottom: "1px solid var(--border)", transition: "background-color 0.2s" },
  td: { padding: "16px 25px", color: "var(--text-main)", fontSize: "14px", verticalAlign: "middle" },
  
  badge: { padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "600", display: "inline-block" },
  badgeSuccess: { backgroundColor: "#dcfce7", color: "#166534" },
  badgeError: { backgroundColor: "#fee2e2", color: "#991b1b" },
  badgeWarning: { backgroundColor: "#fef3c7", color: "#92400e" },

  successMsg: { padding: "14px", backgroundColor: "#f0fdf4", color: "#166534", borderRadius: "8px", fontSize: "14px", marginBottom: "20px", border: "1px solid #bbf7d0", fontWeight: "500" },
  errorMsg: { padding: "14px", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "8px", fontSize: "14px", marginBottom: "20px", border: "1px solid #fecaca", fontWeight: "500" }
};

export default RequestLeave;