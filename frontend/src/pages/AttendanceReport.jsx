import { useState, useEffect, useMemo } from "react";
import API from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import AttendanceTable from "../components/AttendanceTable";

const AttendanceReport = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Set current month as default
  const getCurrentMonth = () => `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  
  const [filterMonth, setFilterMonth] = useState(getCurrentMonth());
  const [filterDay, setFilterDay] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

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

  // Filtering Logic
  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      // Ensure date exists
      if (!item.attendance_date) return false;
      
      const dateParts = item.attendance_date.split("-");
      const itemMonth = `${dateParts[0]}-${dateParts[1]}`;
      const itemDay = parseInt(dateParts[2]).toString();

      const matchesMonth = filterMonth ? itemMonth === filterMonth : true;
      const matchesDay = filterDay ? itemDay === filterDay : true;
      
      const search = filterEmployee.toLowerCase();
      const matchesEmployee = filterEmployee
        ? (item.employee_code?.toLowerCase().includes(search) ||
           item.name?.toLowerCase().includes(search))
        : true;

      // 2. Case-insensitive matching for status
      const matchesStatus = filterStatus 
        ? item.status?.toUpperCase() === filterStatus.toUpperCase() 
        : true;

      return matchesMonth && matchesDay && matchesEmployee && matchesStatus;
    });
  }, [reports, filterMonth, filterDay, filterEmployee, filterStatus]);

  const clearFilters = () => {
    setFilterMonth("");
    setFilterDay("");
    setFilterEmployee("");
    setFilterStatus("");
  };

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.main}>
        <Navbar />

        <div style={styles.contentPadding}>
          <header style={styles.header}>
            <h2 style={styles.title}>Attendance Logs & Reports</h2>
            <button style={styles.exportBtn} onClick={() => window.print()}>
              Export / Print Report
            </button>
          </header>

          <div style={styles.filterBar}>
            <div style={styles.filterGroup}>
              <label style={styles.label}>Month</label>
              <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} style={styles.input} />
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.label}>Day</label>
              <input type="number" min="1" max="31" placeholder="DD" value={filterDay} onChange={(e) => setFilterDay(e.target.value)} style={styles.input} />
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.label}>Employee</label>
              <input type="text" placeholder="Search..." value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)} style={styles.input} />
            </div>

            <div style={styles.filterGroup}>
              <label style={styles.label}>Status</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={styles.input}>
                <option value="">All Status</option>
                <option value="PRESENT">Present</option>
                <option value="LATE">Late</option>
                <option value="ABSENT">Absent</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="SHORT_LEAVE">Short Leave</option>
                <option value="MISSING_PUNCH">Missing Punch</option>
                <option value="OVERTIME">Overtime</option>
                <option value="WEEKEND_WORK">Weekend Work</option>
                <option value="HOLIDAY_WORK">Holiday Work</option>
              </select>
            </div>

            <button style={styles.clearBtn} onClick={clearFilters}>Clear</button>
          </div>

          <AttendanceTable reports={filteredReports} loading={loading} />
        </div>
      </div>
    </div>
  );
};

const styles = {
  layout: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
  },

  main: {
    flexGrow: 1,
    marginLeft: "260px",
  },

  contentPadding: {
    padding: "0 40px 40px 40px",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },

  title: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#1e293b",
  },

  exportBtn: {
    backgroundColor: "#0f172a",
    color: "white",
    border: "none",
    padding: "12px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },

  filterBar: {
    display: "flex",
    gap: "20px",
    alignItems: "flex-end",
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    marginBottom: "20px",
    flexWrap: "wrap",
  },

  filterGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    flex: 1,
    minWidth: "180px",
  },

  label: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
  },

  input: {
    padding: "10px",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    fontSize: "14px",
  },

  clearBtn: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    border: "none",
    padding: "10px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    height: "40px",
  },
};

export default AttendanceReport;