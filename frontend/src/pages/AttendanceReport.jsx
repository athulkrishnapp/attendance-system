import { useState, useEffect } from "react";
import API from "../services/api";

// Import our new reusable components
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
      {/* Plug in the Sidebar Component */}
      <Sidebar />

      {/* Main Content Area */}
      <div style={styles.main}>
        
        {/* Plug in the Navbar Component */}
        <Navbar />

        <div style={styles.contentPadding}>
          <header style={styles.header}>
            <h2>Daily Logs & Summaries</h2>
            <button style={styles.exportBtn} onClick={() => window.print()}>
              🖨️ Export / Print
            </button>
          </header>

          {/* Plug in the Reusable Table Component */}
          <AttendanceTable reports={reports} loading={loading} />
          
        </div>
      </div>
    </div>
  );
};

// Extremely Simplified Styles
// Note: We only need layout styles here; the components handle their own look!
const styles = {
  layout: { display: "flex", minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "Arial, sans-serif" },
  main: { flexGrow: 1, marginLeft: "250px" }, // Margin left makes room for the fixed Sidebar
  contentPadding: { padding: "0 40px 40px 40px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  exportBtn: { backgroundColor: "#475569", color: "white", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", transition: "0.2s" },
};

export default AttendanceReport;