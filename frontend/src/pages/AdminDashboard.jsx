import { useState, useEffect } from "react";
import API from "../services/api";

// Import our reusable components
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
              <h3 style={styles.cardTitle}>Total Employees</h3>
              <p style={styles.statNumber}>{stats.totalEmployees}</p>
            </div>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Total Attendance Logs</h3>
              <p style={styles.statNumber}>{stats.totalAttendance}</p>
            </div>
          </div>

          {/* Upload Section */}
          <div style={styles.uploadSection}>
            <h2 style={styles.sectionTitle}>Upload Daily Attendance</h2>
            <p style={styles.sectionSubtitle}>Select the biometric Excel file (.xlsx) to process today's logs.</p>
            
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
                style={file && !uploadStatus.loading ? styles.uploadBtnActive : styles.uploadBtnDisabled}
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

// Premium, Modern Styles using CSS Variables (Design Tokens)
const styles = {
  layout: { 
    display: "flex", 
    minHeight: "100vh" 
  },
  main: { 
    flexGrow: 1, 
    marginLeft: "260px" // Adjusted to match the new wider, modern sidebar
  }, 
  contentPadding: { 
    padding: "0 40px 40px 40px" 
  },
  statsGrid: { 
    display: "flex", 
    gap: "24px", 
    marginBottom: "40px" 
  },
  card: { 
    backgroundColor: "var(--bg-card)", 
    padding: "24px", 
    borderRadius: "var(--radius)", 
    boxShadow: "var(--shadow-md)", 
    flex: 1, 
    border: "1px solid var(--border)", 
    borderTop: "4px solid var(--primary)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease"
  },
  cardTitle: {
    margin: "0 0 10px 0",
    color: "var(--text-muted)",
    fontSize: "15px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    fontWeight: "600"
  },
  statNumber: { 
    fontSize: "42px", 
    fontWeight: "700", 
    margin: "0", 
    color: "var(--text-main)",
    letterSpacing: "-1px"
  },
  uploadSection: { 
    backgroundColor: "var(--bg-card)", 
    padding: "32px", 
    borderRadius: "var(--radius)", 
    boxShadow: "var(--shadow-md)", 
    border: "1px solid var(--border)" 
  },
  sectionTitle: {
    margin: "0 0 8px 0",
    fontSize: "20px",
    fontWeight: "600",
    color: "var(--text-main)"
  },
  sectionSubtitle: {
    margin: "0 0 24px 0",
    color: "var(--text-muted)",
    fontSize: "15px"
  },
  uploadForm: { 
    display: "flex", 
    gap: "16px", 
    alignItems: "center" 
  },
  fileInput: { 
    padding: "14px", 
    border: "2px dashed var(--border)", 
    borderRadius: "var(--radius)", 
    flexGrow: 1, 
    backgroundColor: "var(--bg-main)", 
    color: "var(--text-muted)", 
    cursor: "pointer",
    fontSize: "15px",
    transition: "border 0.2s ease"
  },
  uploadBtnActive: { 
    backgroundColor: "var(--primary)", 
    color: "white", 
    border: "none", 
    padding: "14px 28px", 
    borderRadius: "var(--radius)", 
    cursor: "pointer", 
    fontWeight: "600", 
    fontSize: "15px",
    transition: "all 0.2s ease", 
    boxShadow: "var(--shadow-sm)" 
  },
  uploadBtnDisabled: { 
    backgroundColor: "#cbd5e1", 
    color: "white", 
    border: "none", 
    padding: "14px 28px", 
    borderRadius: "var(--radius)", 
    cursor: "not-allowed", 
    fontWeight: "600",
    fontSize: "15px"
  },
  successMsg: { 
    marginTop: "20px", 
    padding: "16px", 
    backgroundColor: "#f0fdf4", 
    color: "#166534", 
    borderRadius: "var(--radius)", 
    border: "1px solid #bbf7d0",
    fontWeight: "500",
    fontSize: "14px"
  },
  errorMsg: { 
    marginTop: "20px", 
    padding: "16px", 
    backgroundColor: "#fef2f2", 
    color: "#991b1b", 
    borderRadius: "var(--radius)", 
    border: "1px solid #fecaca",
    fontWeight: "500",
    fontSize: "14px"
  }
};

export default AdminDashboard;