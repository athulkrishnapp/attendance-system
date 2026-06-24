import { useState, useEffect } from "react";
import API from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const EmployeeDashboard = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const [leaves, setLeaves] = useState([]);
  const [leaveForm, setLeaveForm] = useState({ start_date: "", end_date: "", leave_type: "SICK", reason: "" });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetchMyLeaves();
  }, []);

  const fetchMyLeaves = async () => {
    try {
      const res = await API.get(`/leaves/my-leaves/${user.id}`);
      setLeaves(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const submitLeave = async (e) => {
    e.preventDefault();
    try {
      await API.post("/leaves/request", { ...leaveForm, employee_id: user.id });
      setMsg("Leave request sent to HR for approval.");
      setLeaveForm({ start_date: "", end_date: "", leave_type: "SICK", reason: "" });
      fetchMyLeaves();
    } catch (err) {
      setMsg("Failed to submit request.");
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "Arial" }}>
      <Sidebar />
      <div style={{ flexGrow: 1, marginLeft: "250px" }}>
        <Navbar />
        <div style={{ padding: "0 40px 40px 40px" }}>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}>
            
            {/* Leave Request Form */}
            <div style={{ backgroundColor: "white", padding: "25px", borderRadius: "8px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
              <h3>Request Time Off</h3>
              {msg && <p style={{ color: "#065f46", backgroundColor: "#d1fae5", padding: "10px" }}>{msg}</p>}
              <form onSubmit={submitLeave} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                <select value={leaveForm.leave_type} onChange={e => setLeaveForm({...leaveForm, leave_type: e.target.value})} style={inputStyle}>
                  <option value="SICK">Sick Leave</option>
                  <option value="CASUAL">Casual Leave</option>
                  <option value="UNPAID">Unpaid Leave</option>
                </select>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input type="date" value={leaveForm.start_date} onChange={e => setLeaveForm({...leaveForm, start_date: e.target.value})} required style={inputStyle} />
                  <input type="date" value={leaveForm.end_date} onChange={e => setLeaveForm({...leaveForm, end_date: e.target.value})} required style={inputStyle} />
                </div>
                <textarea placeholder="Reason for leave..." value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})} required style={{...inputStyle, height: "80px"}} />
                <button type="submit" style={{ backgroundColor: "#3b82f6", color: "white", padding: "12px", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>Submit Request</button>
              </form>
            </div>

            {/* Leave History */}
            <div style={{ backgroundColor: "white", padding: "25px", borderRadius: "8px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
              <h3>My Leave Requests</h3>
              <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "10px" }}>Dates</th>
                    <th style={{ padding: "10px" }}>Type</th>
                    <th style={{ padding: "10px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map(l => (
                    <tr key={l.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "10px" }}>{new Date(l.start_date).toLocaleDateString()}</td>
                      <td style={{ padding: "10px" }}>{l.leave_type}</td>
                      <td style={{ padding: "10px", fontWeight: "bold", color: l.status === 'APPROVED' ? 'green' : l.status === 'REJECTED' ? 'red' : 'orange' }}>{l.status}</td>
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

const inputStyle = { padding: "10px", border: "1px solid #ccc", borderRadius: "4px", width: "100%" };
export default EmployeeDashboard;