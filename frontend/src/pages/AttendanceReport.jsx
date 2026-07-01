import { useState, useEffect, useMemo } from "react";
import API, { api } from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import AttendanceTable from "../components/AttendanceTable";

const AttendanceReport = () => {
  const [activeTab, setActiveTab] = useState("daily");
  const [reports, setReports] = useState([]);
  const [masterReports, setMasterReports] = useState([]);
  const [monthStats, setMonthStats] = useState(null);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleFlags, setVisibleFlags] = useState([]);

  const fetchSettings = async () => {
    try {
      const res = await api.settings.get();
      if (res.data && res.data.settings && res.data.settings.visible_flags) {
        setVisibleFlags(res.data.settings.visible_flags);
      }
    } catch (err) { console.error(err); }
  };

  // 1. Set current month as default
  const getCurrentMonth = () => `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  
  const [filterMonth, setFilterMonth] = useState(getCurrentMonth());
  const [filterDay, setFilterDay] = useState(new Date().getDate().toString());
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterCoreStatus, setFilterCoreStatus] = useState("");
  const [filterFlag, setFilterFlag] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = useState(null);

  useEffect(() => {
    fetchSettings();
    fetchReports();
    fetchMasterReports();
  }, [filterMonth]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await API.get(`/reports/attendance?month=${filterMonth}`);
      setReports(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch reports", err);
      setLoading(false);
    }
  };

  const fetchMasterReports = async () => {
    if (!filterMonth) return;
    const [year, month] = filterMonth.split("-");
    try {
      setLoading(true);
      const res = await api.reports.master(year, month);
      setMasterReports(res.data.reports || []);
      setLeaveTypes(res.data.leaveTypes || []);
      setMonthStats(res.data.monthStats || null);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch master reports", err);
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
      const matchesDay = filterDay ? parseInt(itemDay, 10) === parseInt(filterDay, 10) : true;
      
      const search = filterEmployee.toLowerCase();
      const matchesEmployee = filterEmployee
        ? (item.employee_code?.toLowerCase().includes(search) ||
           item.name?.toLowerCase().includes(search))
        : true;

      // 2. Case-insensitive matching for status (core + modifiers)
      const matchesCoreStatus = filterCoreStatus 
        ? item.core_status?.toUpperCase() === filterCoreStatus.toUpperCase()
        : true;
        
      const matchesFlag = filterFlag
        ? (Array.isArray(item.modifier_flags) && item.modifier_flags.includes(filterFlag.toUpperCase())) || (typeof item.modifier_flags === 'string' && item.modifier_flags.includes(filterFlag.toUpperCase()))
        : true;
        
      const matchesDepartment = filterDepartment ? item.department_name === filterDepartment : true;

      return matchesMonth && matchesDay && matchesEmployee && matchesCoreStatus && matchesFlag && matchesDepartment;
    });
  }, [reports, filterMonth, filterDay, filterEmployee, filterCoreStatus, filterFlag, filterDepartment]);

  const clearFilters = () => {
    setFilterMonth(getCurrentMonth());
    setFilterDay("");
    setFilterEmployee("");
    setFilterCoreStatus("");
    setFilterFlag("");
    setFilterDepartment("");
  };

  const uniqueMasterDepartments = useMemo(() => {
    const deps = new Set(masterReports.map(r => r.department_name).filter(Boolean));
    return Array.from(deps).sort();
  }, [masterReports]);

  const filteredMasterReports = useMemo(() => {
    return masterReports.filter(r => {
      const matchDep = filterDepartment ? r.department_name === filterDepartment : true;
      const search = filterEmployee.toLowerCase();
      const matchEmp = filterEmployee 
        ? (r.employee_code?.toLowerCase().includes(search) || r.name?.toLowerCase().includes(search))
        : true;
      return matchDep && matchEmp;
    });
  }, [masterReports, filterDepartment, filterEmployee]);

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

            {activeTab === "daily" && (
              <>
                <div style={styles.filterGroup}>
                  <label style={styles.label}>Day</label>
                  <input type="number" min="1" max="31" placeholder="DD" value={filterDay} onChange={(e) => setFilterDay(e.target.value)} style={styles.input} />
                </div>

                <div style={styles.filterGroup}>
                  <label style={styles.label}>Employee</label>
                  <input type="text" placeholder="Search..." value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)} style={styles.input} />
                </div>

                <div style={styles.filterGroup}>
                  <label style={styles.label}>Department</label>
                  <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} style={styles.input}>
                    <option value="">All</option>
                    {uniqueMasterDepartments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.filterGroup}>
                  <label style={styles.label}>Status</label>
                  <select value={filterCoreStatus} onChange={(e) => setFilterCoreStatus(e.target.value)} style={styles.input}>
                    <option value="">All Status</option>
                    <option value="PRESENT">Present</option>
                    <option value="ABSENT">Absent</option>
                    <option value="HALF_DAY">Half Day</option>
                    <option value="LEAVE">Leave</option>
                    <option value="MISSING_PUNCH">Missing Punch</option>
                    <option value="WEEKEND">Week Off</option>
                    <option value="HOLIDAY">Holiday</option>
                  </select>
                </div>
                <div style={styles.filterGroup}>
                  <label style={styles.label}>Flag</label>
                  <select value={filterFlag} onChange={(e) => setFilterFlag(e.target.value)} style={styles.input}>
                    <option value="">All Flags</option>
                    {visibleFlags.map(flag => (
                      <option key={flag} value={flag}>{flag.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                    ))}
                    <option value="REGULARIZED">Regularized</option>
                  </select>
                </div>
              </>
            )}

            <button style={styles.clearBtn} onClick={clearFilters}>Clear</button>
          </div>

          <div style={styles.tabsMenu}>
            <button onClick={() => setActiveTab("daily")} style={activeTab === "daily" ? styles.tabActive : styles.tabInactive}>Daily Logs</button>
            <button onClick={() => setActiveTab("master")} style={activeTab === "master" ? styles.tabActive : styles.tabInactive}>Monthly Master Report</button>
          </div>

          {activeTab === "daily" ? (
            <AttendanceTable reports={filteredReports} loading={loading} />
          ) : (
            <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)", border: "1px solid #e2e8f0" }}>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={styles.label}>Filter Department</label>
                    <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} style={{...styles.input, width: '200px'}}>
                    <option value="">All Departments</option>
                    {uniqueMasterDepartments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={styles.label}>Search Employee</label>
                  <input type="text" placeholder="Search Name/Code..." value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)} style={{...styles.input, width: '200px'}} />
                </div>
                </div>
                {monthStats && (
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    {monthStats.hasPendingAttendance && (
                      <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #f87171', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                        ⚠️ Warning: Pending attendances to upload for this month.
                      </div>
                    )}
                    <div style={{ padding: '8px 15px', backgroundColor: '#f1f5f9', borderRadius: '8px', fontSize: '14px', color: '#334155' }}>
                      <span style={{ fontWeight: 'bold' }}>Total Days:</span> {monthStats.totalDays} 
                    </div>
                    <div style={{ padding: '8px 15px', backgroundColor: '#f1f5f9', borderRadius: '8px', fontSize: '14px', color: '#64748b' }}>
                      <span style={{ fontWeight: 'bold' }}>Non-Working Days:</span> {monthStats.nonWorkingDays} (Week Offs & Holidays)
                    </div>
                  </div>
                )}
              </div>

              {loading ? (
                <p>Loading Master Report...</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Employee Code</th>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Department</th>
                      <th style={styles.th}>Total Working Days</th>
                      <th style={styles.th}>Present</th>
                      <th style={styles.th}>Absent</th>
                      <th style={styles.th}>Total Leaves</th>
                      <th style={styles.th}>Missing Punches</th>
                      <th style={styles.th}>Total Hrs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMasterReports.map(r => (
                      <tr 
                        key={r.employee_id} 
                        style={{ borderBottom: "1px solid #e2e8f0", cursor: "pointer", transition: "background-color 0.2s" }}
                        onClick={() => setSelectedEmployeeForDetails(r)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: "12px 20px" }}>{r.employee_code}</td>
                        <td style={{ padding: "12px 20px" }}><strong>{r.name}</strong></td>
                        <td style={{ padding: "12px 20px" }}>{r.department_name || "-"}</td>
                        <td style={{ padding: "12px 20px", fontWeight: "bold" }}>{r.total_working_days || 0}</td>
                        <td style={{ padding: "12px 20px", color: "#166534" }}>{r.total_present}</td>
                        <td style={{ padding: "12px 20px", color: "#991b1b" }}>{r.total_absent}</td>
                        <td style={{ padding: "12px 20px", color: "#d97706", fontWeight: "bold" }}>{r.total_leaves}</td>
                        <td style={{ padding: "12px 20px", color: "#dc2626" }}>{r.missing_punches}</td>
                        <td style={{ padding: "12px 20px" }}>{r.total_working_hours}</td>
                      </tr>
                    ))}
                    {filteredMasterReports.length === 0 && (
                      <tr><td colSpan="10" style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>No data for {filterMonth}</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {selectedEmployeeForDetails && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 'bold' }}>Monthly Attendance Details: {selectedEmployeeForDetails.name}</h3>
                  <button onClick={() => setSelectedEmployeeForDetails(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>&times;</button>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontWeight: 'bold', color: '#334155', fontSize: '14px' }}>Leaves Taken ({selectedEmployeeForDetails.total_leaves}):</span>
                  {selectedEmployeeForDetails.leaves && Object.entries(selectedEmployeeForDetails.leaves).length > 0 ? (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {Object.entries(selectedEmployeeForDetails.leaves).map(([type, count]) => (
                        <span key={type} style={{ backgroundColor: '#e0e7ff', color: '#4338ca', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                          {type}: {count}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '14px', color: '#64748b' }}>None</span>
                  )}
                </div>
                
                <AttendanceTable 
                  reports={reports.filter(r => 
                    r.employee_id === selectedEmployeeForDetails.employee_id && 
                    r.attendance_date && 
                    r.attendance_date.startsWith(filterMonth)
                  )} 
                  loading={loading} 
                />
              </div>
            </div>
          )}
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
  
  tabsMenu: { display: "flex", gap: "10px", marginBottom: "20px" },
  tabActive: { backgroundColor: "#0f172a", color: "white", padding: "12px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "14px" },
  tabInactive: { backgroundColor: "#f1f5f9", color: "#475569", padding: "12px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "500", fontSize: "14px" },
  th: { backgroundColor: "#f8fafc", padding: "12px 20px", borderBottom: "2px solid #e2e8f0", color: "#64748b", fontSize: "12px", textTransform: "uppercase", fontWeight: "700" }
};

export default AttendanceReport;