import { useState, useEffect } from "react";
import API from "../services/api";

// Import our new reusable components
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ totalEmployees: 0, totalAttendance: 0 });
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({ loading: false, message: "", error: false });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await API.get("/reports/dashboard");
      setStats(res.data);
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setUploadStatus({ loading: false, message: "", error: false });
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploadStatus({ loading: true, message: "Uploading and processing...", error: false });
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await API.post("/attendance/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadStatus({ loading: false, message: `Success! ${res.data.recordsProcessed} records imported.`, error: false });
      setFile(null);
      fetchStats(); 
    } catch (err) {
      setUploadStatus({ loading: false, message: "Upload failed. Please check the file format.", error: true });
    }
  };

  return (
    <div style={styles.layout}>
      {/* Plug in the Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div style={styles.main}>
        
        {/* Plug in the Navbar */}
        <Navbar />

        <div style={styles.contentPadding}>
          {/* Stats Cards */}
          <div style={styles.statsGrid}>
            <div style={styles.card}>
              <h3>Total Employees</h3>
              <p style={styles.statNumber}>{stats.totalEmployees}</p>
            </div>
            <div style={styles.card}>
              <h3>Total Attendance Logs</h3>
              <p style={styles.statNumber}>{stats.totalAttendance}</p>
            </div>
          </div>

          {/* Upload Section */}
          <div style={styles.uploadSection}>
            <h2>Upload Daily Attendance</h2>
            <p style={{ color: "#64748b" }}>Select the biometric Excel file (.xlsx) to process today's logs.</p>
            
            <form onSubmit={handleUpload} style={styles.uploadForm}>
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                onChange={handleFileChange} 
                style={styles.fileInput}
              />
              <button 
                type="submit" 
                disabled={!file || uploadStatus.loading}
                style={file ? styles.uploadBtnActive : styles.uploadBtnDisabled}
              >
                {uploadStatus.loading ? "Processing..." : "Upload File"}
              </button>
            </form>

            {uploadStatus.message && (
              <div style={uploadStatus.error ? styles.errorMsg : styles.successMsg}>
                {uploadStatus.message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Simplified Styles
const styles = {
  layout: { display: "flex", minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "Arial, sans-serif" },
  main: { flexGrow: 1, marginLeft: "250px" }, // Margin left makes room for the fixed Sidebar
  contentPadding: { padding: "0 40px 40px 40px" },
  statsGrid: { display: "flex", gap: "20px", marginBottom: "40px" },
  card: { backgroundColor: "white", padding: "25px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", flex: 1, borderTop: "4px solid #38bdf8" },
  statNumber: { fontSize: "36px", fontWeight: "bold", margin: "10px 0 0 0", color: "#1e293b" },
  uploadSection: { backgroundColor: "white", padding: "30px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" },
  uploadForm: { display: "flex", gap: "15px", marginTop: "20px", alignItems: "center" },
  fileInput: { padding: "10px", border: "1px dashed #ccc", borderRadius: "6px", flexGrow: 1, backgroundColor: "#f8fafc" },
  uploadBtnActive: { backgroundColor: "#10b981", color: "white", border: "none", padding: "12px 24px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", transition: "0.2s" },
  uploadBtnDisabled: { backgroundColor: "#9ca3af", color: "white", border: "none", padding: "12px 24px", borderRadius: "6px", cursor: "not-allowed", fontWeight: "bold" },
  successMsg: { marginTop: "15px", padding: "15px", backgroundColor: "#d1fae5", color: "#065f46", borderRadius: "6px" },
  errorMsg: { marginTop: "15px", padding: "15px", backgroundColor: "#fee2e2", color: "#991b1b", borderRadius: "6px" }
};

export default AdminDashboard;