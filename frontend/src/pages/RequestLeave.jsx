import { useState, useEffect } from "react";
import API from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const RequestLeave = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const [leaves, setLeaves] = useState([]);
  const [msg, setMsg] = useState({ text: "", type: "" });
  
  const [leaveForm, setLeaveForm] = useState({ 
    date: "", 
    leave_type: "Sick Leave", 
    duration: "Full Day",
    reason: "" 
  });

  useEffect(() => { fetchMyLeaves(); }, []);

  const fetchMyLeaves = async () => {
    try {
      const res = await API.get(`/leaves/my-leaves/${user.id}`);
      setLeaves(res.data);
    } catch (err) { console.error(err); }
  };

  const submitLeave = async (e) => {
    e.preventDefault();
    try {
      await API.post("/leaves/request", { 
        employee_id: user.id,
        date: leaveForm.date,
        duration: leaveForm.duration,
        leave_type: leaveForm.leave_type,
        reason: leaveForm.reason
      });
      setMsg({ text: "Leave request submitted for review.", type: "success" });
      setLeaveForm({ date: "", leave_type: "Sick Leave", duration: "Full Day", reason: "" });
      fetchMyLeaves();
    } catch (err) { 
      setMsg({ text: "Failed to submit request.", type: "error" }); 
    }
  };

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.main}>
        <Navbar />
        <div style={styles.contentPadding}>
          
          <div style={styles.grid}>
            {/* Form Section */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Apply for Leave</h3>
              {msg.text && (
                <div style={msg.type === "error" ? styles.errorMsg : styles.successMsg}>{msg.text}</div>
              )}
              
              <form onSubmit={submitLeave} style={styles.form}>
                
                <label style={styles.label}>Leave Type</label>
                <select value={leaveForm.leave_type} onChange={e => setLeaveForm({...leaveForm, leave_type: e.target.value})} style={styles.input}>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Emergency Leave">Emergency Leave</option>
                  <option value="Leave Without Pay">Leave Without Pay (LWP)</option>
                </select>

                <div style={{ display: "flex", gap: "15px" }}>
                  <div style={{flex: 1}}>
                    <label style={styles.label}>Date</label>
                    <input type="date" value={leaveForm.date} onChange={e => setLeaveForm({...leaveForm, date: e.target.value})} required style={styles.input} />
                  </div>
                  <div style={{flex: 1}}>
                    <label style={styles.label}>Duration</label>
                    <select value={leaveForm.duration} onChange={e => setLeaveForm({...leaveForm, duration: e.target.value})} style={styles.input}>
                      <option value="Full Day">Full Day</option>
                      <option value="Half Day (Forenoon)">Half Day (Forenoon)</option>
                      <option value="Half Day (Afternoon)">Half Day (Afternoon)</option>
                    </select>
                  </div>
                </div>

                <label style={styles.label}>Reason</label>
                <textarea placeholder="Briefly explain the reason for leave..." value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})} required style={{...styles.input, height: "100px", resize: "none"}} />
                
                <button type="submit" style={styles.submitBtn}>Submit Application</button>
              </form>
            </div>

            {/* History Section */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>My Leave History</h3>
              <div style={{ overflowY: "auto", maxHeight: "400px" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Type & Duration</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map(l => (
                      <tr key={l.id} style={styles.tr}>
                        <td style={styles.td}>{new Date(l.start_date).toLocaleDateString()}</td>
                        <td style={styles.td}>
                          <strong>{l.leave_type}</strong><br/>
                          <span style={{fontSize: "12px", color: "var(--text-muted)"}}>{l.duration}</span>
                        </td>
                        <td style={{...styles.td, fontWeight: "600", color: l.status === 'APPROVED' ? '#166534' : l.status === 'REJECTED' ? '#991b1b' : '#b45309'}}>
                          {l.status}
                        </td>
                      </tr>
                    ))}
                    {leaves.length === 0 && <tr><td colSpan="3" style={{textAlign:"center", padding: "20px"}}>No past leave requests.</td></tr>}
                  </tbody>
                </table>
              </div>
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
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" },
  card: { backgroundColor: "var(--bg-card)", padding: "30px", borderRadius: "var(--radius)", boxShadow: "var(--shadow-md)", border: "1px solid var(--border)" },
  cardTitle: { fontSize: "20px", color: "var(--text-main)", margin: "0 0 20px 0" },
  form: { display: "flex", flexDirection: "column", gap: "15px" },
  label: { fontSize: "14px", fontWeight: "600", color: "var(--text-main)", marginBottom: "5px", display: "block" },
  input: { padding: "12px", border: "1px solid var(--border)", borderRadius: "6px", width: "100%", outline: "none", fontSize: "14px", backgroundColor: "var(--bg-main)" },
  submitBtn: { backgroundColor: "var(--primary)", color: "white", padding: "14px", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer", fontSize: "15px", marginTop: "10px" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "12px", fontSize: "13px", color: "var(--text-muted)", borderBottom: "2px solid var(--border)", textAlign: "left", textTransform: "uppercase" },
  tr: { borderBottom: "1px solid var(--border)" },
  td: { padding: "15px 12px", color: "var(--text-main)", fontSize: "14px" },
  successMsg: { padding: "12px", backgroundColor: "#f0fdf4", color: "#166534", borderRadius: "6px", fontSize: "14px", marginBottom: "15px", border: "1px solid #bbf7d0" },
  errorMsg: { padding: "12px", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "6px", fontSize: "14px", marginBottom: "15px", border: "1px solid #fecaca" }
};

export default RequestLeave;