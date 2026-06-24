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
      fetchLeaves(); // Refresh the table
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
            <h2>Leave Request Inbox</h2>
            <p style={{ color: "#64748b" }}>Review and manage employee time-off requests.</p>
          </header>

          <div style={styles.tableContainer}>
            {loading ? <p style={{ padding: "20px" }}>Loading requests...</p> : (
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
                        <strong>{l.name}</strong> <br/>
                        <span style={{ fontSize: "12px", color: "#64748b" }}>{l.employee_code}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.typeBadge}>{l.leave_type}</span>
                      </td>
                      <td style={styles.td}>
                        {new Date(l.start_date).toLocaleDateString()} - <br/> 
                        {new Date(l.end_date).toLocaleDateString()}
                      </td>
                      <td style={styles.td}>{l.reason}</td>
                      <td style={styles.td}>
                        <span style={l.status === 'APPROVED' ? styles.badgeApproved : l.status === 'REJECTED' ? styles.badgeRejected : styles.badgePending}>
                          {l.status}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {l.status === 'PENDING' && (
                          <div style={{ display: "flex", gap: "10px" }}>
                            <button onClick={() => handleStatusUpdate(l.id, 'APPROVED')} style={styles.approveBtn}>Approve</button>
                            <button onClick={() => handleStatusUpdate(l.id, 'REJECTED')} style={styles.rejectBtn}>Reject</button>
                          </div>
                        )}
                        {l.status !== 'PENDING' && <span style={{ color: "#94a3b8", fontSize: "14px" }}>Processed</span>}
                      </td>
                    </tr>
                  ))}
                  {leaves.length === 0 && <tr><td colSpan="6" style={{textAlign: "center", padding: "20px"}}>No leave requests found.</td></tr>}
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
  layout: { display: "flex", minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "Arial, sans-serif" },
  main: { flexGrow: 1, marginLeft: "250px" },
  contentPadding: { padding: "0 40px 40px 40px" },
  header: { marginBottom: "20px" },
  tableContainer: { backgroundColor: "white", borderRadius: "8px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left" },
  th: { backgroundColor: "#f1f5f9", padding: "15px", borderBottom: "2px solid #e2e8f0", color: "#475569" },
  tr: { borderBottom: "1px solid #e2e8f0" },
  td: { padding: "15px", color: "#334155" },
  typeBadge: { backgroundColor: "#e2e8f0", color: "#334155", padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" },
  badgeApproved: { backgroundColor: "#d1fae5", color: "#065f46", padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" },
  badgeRejected: { backgroundColor: "#fee2e2", color: "#991b1b", padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" },
  badgePending: { backgroundColor: "#fef08a", color: "#854d0e", padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" },
  approveBtn: { backgroundColor: "#10b981", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" },
  rejectBtn: { backgroundColor: "#ef4444", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }
};

export default LeaveApprovals;