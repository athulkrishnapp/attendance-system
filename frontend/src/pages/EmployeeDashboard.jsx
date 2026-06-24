import { useState, useEffect } from "react";
import API from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const EmployeeDashboard = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const [leaves, setLeaves] = useState([]);
  const [leaveForm, setLeaveForm] = useState({ start_date: "", end_date: "", leave_type: "SICK", reason: "" });
  const [msg, setMsg] = useState("");

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
      await API.post("/leaves/request", { ...leaveForm, employee_id: user.id });
      setMsg("Leave request submitted successfully.");
      setLeaveForm({ start_date: "", end_date: "", leave_type: "SICK", reason: "" });
      fetchMyLeaves();
    } catch (err) { setMsg("Failed to submit request."); }
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
              <h3 style={styles.cardTitle}>Request Time Off</h3>
              {msg && <div style={styles.successMsg}>{msg}</div>}
              <form onSubmit={submitLeave} style={styles.form}>
                <label style={styles.label}>Leave Type</label>
                <select value={leaveForm.leave_type} onChange={e => setLeaveForm({...leaveForm, leave_type: e.target.value})} style={styles.input}>
                  <option value="SICK">Sick Leave</option>
                  <option value="CASUAL">Casual Leave</option>
                  <option value="UNPAID">Unpaid Leave</option>
                </select>
                <div style={{ display: "flex", gap: "10px" }}>
                  <div style={{flex: 1}}><label style={styles.label}>Start Date</label><input type="date" value={leaveForm.start_date} onChange={e => setLeaveForm({...leaveForm, start_date: e.target.value})} required style={styles.input} /></div>
                  <div style={{flex: 1}}><label style={styles.label}>End Date</label><input type="date" value={leaveForm.end_date} onChange={e => setLeaveForm({...leaveForm, end_date: e.target.value})} required style={styles.input} /></div>
                </div>
                <label style={styles.label}>Reason</label>
                <textarea placeholder="Briefly describe why..." value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})} required style={{...styles.input, height: "80px"}} />
                <button type="submit" style={styles.submitBtn}>Submit Request</button>
              </form>
            </div>

            {/* History Section */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>My Leave Requests</h3>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tr}>
                    <th style={styles.th}>Dates</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map(l => (
                    <tr key={l.id} style={styles.tr}>
                      <td style={styles.td}>{new Date(l.start_date).toLocaleDateString()}</td>
                      <td style={styles.td}>{l.leave_type}</td>
                      <td style={{...styles.td, fontWeight: "600", color: l.status === 'APPROVED' ? '#166534' : l.status === 'REJECTED' ? '#991b1b' : '#92400e'}}>{l.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
  card: { backgroundColor: "var(--bg-card)", padding: "24px", borderRadius: "var(--radius)", boxShadow: "var(--shadow-md)", border: "1px solid var(--border)" },
  cardTitle: { fontSize: "18px", color: "var(--text-main)", marginBottom: "20px" },
  form: { display: "flex", flexDirection: "column", gap: "15px" },
  label: { fontSize: "14px", fontWeight: "600", color: "var(--text-muted)" },
  input: { padding: "12px", border: "1px solid var(--border)", borderRadius: "6px", width: "100%", outline: "none" },
  submitBtn: { backgroundColor: "var(--primary)", color: "white", padding: "12px", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer" },
  table: { width: "100%", borderCollapse: "collapse", marginTop: "10px" },
  th: { padding: "12px", fontSize: "14px", color: "var(--text-muted)", borderBottom: "1px solid var(--border)", textAlign: "left" },
  tr: { borderBottom: "1px solid var(--border)" },
  td: { padding: "12px", color: "var(--text-main)" },
  successMsg: { padding: "12px", backgroundColor: "#f0fdf4", color: "#166534", borderRadius: "6px", fontSize: "14px", marginBottom: "15px" }
};

export default EmployeeDashboard;