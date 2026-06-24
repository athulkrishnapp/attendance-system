import { useState, useEffect } from "react";
import API from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import AttendanceTable from "../components/AttendanceTable";

const AttendanceReport = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await API.get("/reports/attendance");
      setReports(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch reports", err);
      setLoading(false);
    }
  };

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.main}>
        <Navbar />
        <div style={styles.contentPadding}>
          <header style={styles.header}>
            <h2 style={styles.title}>Daily Logs & Summaries</h2>
            <button style={styles.exportBtn} onClick={() => window.print()}>
              🖨️ Export / Print Report
            </button>
          </header>
          <AttendanceTable reports={reports} loading={loading} />
        </div>
      </div>
    </div>
  );
};

const styles = {
  layout: { display: "flex", minHeight: "100vh" },
  main: { flexGrow: 1, marginLeft: "260px" },
  contentPadding: { padding: "0 40px 40px 40px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" },
  title: { fontSize: "24px", fontWeight: "600", color: "var(--text-main)" },
  exportBtn: { backgroundColor: "var(--secondary)", color: "white", border: "none", padding: "12px 20px", borderRadius: "var(--radius)", cursor: "pointer", fontWeight: "600", transition: "0.2s" }
};

export default AttendanceReport;