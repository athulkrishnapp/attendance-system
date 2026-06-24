import { useState, useEffect } from "react";
import API from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const LeaveApprovals = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const res = await API.get("/leaves/all");
      setLeaves(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch leaves", err);
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await API.put("/leaves/update", { leave_id: id, status: newStatus });
      fetchLeaves();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.main}>
        <Navbar />
        <div style={styles.contentPadding}>
          
          <header style={styles.header}>
            <h2 style={styles.title}>Leave Request Inbox</h2>
            <p style={styles.subtitle}>Review and manage employee time-off requests.</p>
          </header>

          <div style={styles.tableContainer}>
            {loading ? <p style={{ padding: "40px", textAlign: "center" }}>Loading requests...</p> : (
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
                  {leaves.map((l) => (
                    <tr key={l.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={{ fontWeight: "600" }}>{l.name}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{l.employee_code}</div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.typeBadge}>{l.leave_type}</span>
                      </td>
                      <td style={styles.td}>
                        {new Date(l.start_date).toLocaleDateString()} to <br/> 
                        {new Date(l.end_date).toLocaleDateString()}
                      </td>
                      <td style={styles.td}>{l.reason}</td>
                      <td style={styles.td}>
                        <span style={l.status === 'APPROVED' ? styles.badgeApproved : l.status === 'REJECTED' ? styles.badgeRejected : styles.badgePending}>
                          {l.status}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {l.status === 'PENDING' ? (
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button onClick={() => handleStatusUpdate(l.id, 'APPROVED')} style={styles.approveBtn}>Approve</button>
                            <button onClick={() => handleStatusUpdate(l.id, 'REJECTED')} style={styles.rejectBtn}>Reject</button>
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "14px", fontStyle: "italic" }}>Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {leaves.length === 0 && <tr><td colSpan="6" style={{textAlign: "center", padding: "40px", color: "var(--text-muted)"}}>No leave requests found.</td></tr>}
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
  rejectBtn: { backgroundColor: "#ef4444", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }
};

export default LeaveApprovals;