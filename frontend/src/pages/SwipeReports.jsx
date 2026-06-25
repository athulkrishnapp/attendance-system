import { useState, useEffect } from "react";
import API from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const SwipeReports = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleRegularize = async (id) => {
    if(!window.confirm("Submit Regularization Request?")) return;
    try {
      await API.put("/attendance/regularize", { id });
      fetchMyAttendance(); // Refresh to show pending status
    } catch (err) {
      alert("Failed to submit request.");
    }
  };

  // Filter logs based on selected month
  const filteredLogs = attendance.filter(log => {
    const logDate = new Date(log.attendance_date);
    return logDate.getMonth() + 1 === parseInt(selectedMonth) && logDate.getFullYear() === currentYear;
  });

  // Calculate stats for the visual bar graph
  const totalDays = filteredLogs.length;
  const presentDays = filteredLogs.filter(l => l.status === "PRESENT").length;
  const lateDays = filteredLogs.filter(l => l.status === "PRESENT" && l.remarks === "LATE ARRIVAL").length;
  const halfDays = filteredLogs.filter(l => l.status === "HALF_DAY").length;

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.main}>
        <Navbar />
        <div style={styles.contentPadding}>
          
          <div style={styles.controls}>
            <h3 style={{margin: 0, color: "var(--text-main)"}}>Swipe Details for {currentYear}</h3>
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={styles.monthSelect}>
              {Array.from({length: 12}, (_, i) => (
                <option key={i+1} value={i+1}>
                  {new Date(0, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
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

          {/* Table matching the Mockup */}
          <div style={styles.tableContainer}>
            <h3 style={{margin: "0 0 15px 0", padding: "20px 20px 0", color: "var(--text-main)"}}>Swipe Report</h3>
            {loading ? <p style={{padding: "20px"}}>Loading data...</p> : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>In Time</th>
                    <th style={styles.th}>Out Time</th>
                    <th style={styles.th}>Late Swipe</th>
                    <th style={styles.th}>Early Swipe</th>
                    <th style={styles.th}>Remarks</th>
                    <th style={styles.th}>Request</th>
                    <th style={styles.th}>Regularization Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(log => (
                    <tr key={log.id} style={styles.tr}>
                      <td style={styles.td}>{new Date(log.attendance_date).toISOString().split('T')[0]}</td>
                      <td style={styles.td}>{log.first_in || "Punch is missing"}</td>
                      <td style={styles.td}>{log.last_out || "Punch is missing"}</td>
                      
                      <td style={styles.td}>{log.remarks === "LATE ARRIVAL" ? "Late" : "-"}</td>
                      <td style={styles.td}>{log.early_out ? "Early" : "-"}</td>
                      <td style={styles.td}>{log.status === "HALF_DAY" ? "Half Day" : ""}</td>
                      
                      <td style={styles.td}>
                        {(!log.first_in || log.remarks === "LATE ARRIVAL") && !log.regularization_status ? (
                          <button onClick={() => handleRegularize(log.id)} style={styles.regBtn}>Regularization Request</button>
                        ) : "-"}
                      </td>
                      <td style={{...styles.td, fontWeight: "600", color: log.regularization_status === 'PENDING' ? '#8b5cf6' : 'inherit'}}>
                        {log.regularization_status || ""}
                      </td>
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && (
                    <tr><td colSpan="8" style={{textAlign: "center", padding: "30px"}}>No swipes recorded for this month.</td></tr>
                  )}
                </tbody>
              </table>
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
  controls: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  monthSelect: { padding: "10px", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "15px", outline: "none", width: "200px" },
  summaryCard: { backgroundColor: "var(--bg-card)", padding: "20px", borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)", marginBottom: "20px", border: "1px solid var(--border)" },
  graphBar: { width: "100%", height: "20px", backgroundColor: "#f1f5f9", borderRadius: "10px", display: "flex", overflow: "hidden", marginBottom: "10px" },
  graphSegment: { height: "100%", transition: "width 0.5s ease" },
  legend: { display: "flex", gap: "20px", fontSize: "13px", fontWeight: "500", color: "var(--text-muted)" },
  tableContainer: { backgroundColor: "var(--bg-card)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)", overflow: "hidden", border: "1px solid var(--border)" },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left" },
  th: { backgroundColor: "white", padding: "12px 20px", borderBottom: "2px solid var(--border)", color: "#166534", fontSize: "13px", fontWeight: "600" },
  tr: { borderBottom: "1px solid var(--border)" },
  td: { padding: "15px 20px", color: "var(--text-main)", fontSize: "14px" },
  regBtn: { backgroundColor: "#9333ea", color: "white", border: "none", padding: "8px 12px", borderRadius: "4px", fontSize: "12px", cursor: "pointer", fontWeight: "500" }
};

export default SwipeReports;