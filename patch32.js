const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/AttendanceReport.jsx', 'utf8');

// Add Yearly states
code = code.replace(
  `const [masterReports, setMasterReports] = useState([]);`,
  `const [masterReports, setMasterReports] = useState([]);
  const [yearlyReports, setYearlyReports] = useState([]);
  const [yearlyLeaveTypes, setYearlyLeaveTypes] = useState([]);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [yearlySpan, setYearlySpan] = useState(null);`
);

// Add Yearly API call
code = code.replace(
  `const fetchMasterReports = async () => {`,
  `const fetchYearlyReports = async () => {
    if (!filterYear) return;
    try {
      setLoading(true);
      const res = await api.reports.yearlyMaster(filterYear);
      setYearlyReports(res.data.reports || []);
      setYearlyLeaveTypes(res.data.leaveTypes || []);
      setYearlySpan(res.data.span);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch yearly reports", err);
      setLoading(false);
    }
  };

  const fetchMasterReports = async () => {`
);

// Update useEffect to also call fetchYearlyReports
code = code.replace(
  `useEffect(() => {
    fetchSettings();
    fetchReports();
    fetchMasterReports();
  }, [filterMonth]);`,
  `useEffect(() => {
    fetchSettings();
    fetchReports();
    fetchMasterReports();
  }, [filterMonth]);

  useEffect(() => {
    fetchYearlyReports();
  }, [filterYear]);`
);

// Daily Logs filter: Add department
code = code.replace(
  `const matchesEmployee = filterEmployee`,
  `const matchesDepartment = filterDepartment ? item.department_name === filterDepartment : true;
      const matchesEmployee = filterEmployee`
);

code = code.replace(
  `return matchesMonth && matchesDay && matchesEmployee && matchesCoreStatus && matchesFlag;`,
  `return matchesMonth && matchesDay && matchesEmployee && matchesCoreStatus && matchesFlag && matchesDepartment;`
);

// Yearly Logs Filter
code = code.replace(
  `const filteredMasterReports = useMemo(() => {`,
  `const filteredYearlyReports = useMemo(() => {
    return yearlyReports.filter(r => {
      const matchDep = filterDepartment ? r.department_name === filterDepartment : true;
      const search = filterEmployee.toLowerCase();
      const matchEmp = filterEmployee 
        ? (r.employee_code?.toLowerCase().includes(search) || r.name?.toLowerCase().includes(search))
        : true;
      return matchDep && matchEmp;
    });
  }, [yearlyReports, filterDepartment, filterEmployee]);

  const filteredMasterReports = useMemo(() => {`
);

// Add Department dropdown to Daily Logs UI
const dailyFilterTarget = `                <div style={styles.filterGroup}>
                  <label style={styles.label}>Day</label>`;

const dailyFilterReplacement = `                <div style={styles.filterGroup}>
                  <label style={styles.label}>Department</label>
                  <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} style={styles.input}>
                    <option value="">All</option>
                    {uniqueMasterDepartments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.filterGroup}>
                  <label style={styles.label}>Day</label>`;

code = code.replace(dailyFilterTarget, dailyFilterReplacement);

// Tab UI
code = code.replace(
  `<button onClick={() => setActiveTab("master")} style={activeTab === "master" ? styles.tabActive : styles.tabInactive}>Monthly Master Report</button>`,
  `<button onClick={() => setActiveTab("master")} style={activeTab === "master" ? styles.tabActive : styles.tabInactive}>Monthly Master Report</button>
   <button onClick={() => setActiveTab("yearly")} style={activeTab === "yearly" ? styles.tabActive : styles.tabInactive}>Yearly Master Report</button>`
);

// Tab Content
const tableHeaderTarget = `<th style={styles.th}>Department</th>
                      <th style={styles.th}>Present</th>
                      <th style={styles.th}>Absent</th>
                      <th style={styles.th}>Total Leaves</th>
                      <th style={styles.th}>Missing Punches</th>
                      <th style={styles.th}>Total Hrs</th>`;

const tableHeaderReplacement = `<th style={styles.th}>Department</th>
                      <th style={styles.th}>Total Working Days</th>
                      <th style={styles.th}>Non-Working Days</th>
                      <th style={styles.th}>Present</th>
                      <th style={styles.th}>Absent</th>
                      <th style={styles.th}>Total Leaves</th>
                      <th style={styles.th}>Missing Punches</th>
                      <th style={styles.th}>Total Hrs</th>`;

code = code.replace(tableHeaderTarget, tableHeaderReplacement);

const tableRowTarget = `<td style={{ padding: "12px 20px" }}>{r.department_name || "-"}</td>
                        <td style={{ padding: "12px 20px", color: "#166534" }}>{r.total_present}</td>
                        <td style={{ padding: "12px 20px", color: "#991b1b" }}>{r.total_absent}</td>
                        <td style={{ padding: "12px 20px", color: "#d97706", fontWeight: "bold" }}>{r.total_leaves}</td>
                        <td style={{ padding: "12px 20px", color: "#dc2626" }}>{r.missing_punches}</td>
                        <td style={{ padding: "12px 20px" }}>{r.total_working_hours}</td>`;

const tableRowReplacement = `<td style={{ padding: "12px 20px" }}>{r.department_name || "-"}</td>
                        <td style={{ padding: "12px 20px", fontWeight: "bold" }}>{r.total_working_days || 0}</td>
                        <td style={{ padding: "12px 20px", color: "#64748b" }}>{r.non_working_days || 0}</td>
                        <td style={{ padding: "12px 20px", color: "#166534" }}>{r.total_present}</td>
                        <td style={{ padding: "12px 20px", color: "#991b1b" }}>{r.total_absent}</td>
                        <td style={{ padding: "12px 20px", color: "#d97706", fontWeight: "bold" }}>{r.total_leaves}</td>
                        <td style={{ padding: "12px 20px", color: "#dc2626" }}>{r.missing_punches}</td>
                        <td style={{ padding: "12px 20px" }}>{r.total_working_hours}</td>`;

code = code.replace(tableRowTarget, tableRowReplacement);

// Render Yearly Tab
const tabRenderTarget = `{activeTab === "daily" ? (
            <AttendanceTable reports={filteredReports} loading={loading} />
          ) : (`;

const tabRenderReplacement = `{activeTab === "daily" ? (
            <AttendanceTable reports={filteredReports} loading={loading} />
          ) : activeTab === "yearly" ? (
            <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)", border: "1px solid #e2e8f0" }}>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={styles.label}>Financial Year Start</label>
                    <input type="number" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} style={{...styles.input, width: '120px'}} />
                  </div>
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
                {yearlySpan && (
                  <div style={{ padding: '10px 15px', backgroundColor: '#f1f5f9', borderRadius: '8px', fontSize: '14px', color: '#334155', fontWeight: '500' }}>
                    Span: {yearlySpan.startDate} to {yearlySpan.endDate}
                  </div>
                )}
              </div>

              {loading ? (
                <p>Loading Yearly Report...</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Employee Code</th>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Department</th>
                      <th style={styles.th}>Total Working Days</th>
                      <th style={styles.th}>Non-Working Days</th>
                      <th style={styles.th}>Present</th>
                      <th style={styles.th}>Absent</th>
                      <th style={styles.th}>Total Leaves</th>
                      <th style={styles.th}>Missing Punches</th>
                      <th style={styles.th}>Total Hrs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredYearlyReports.map(r => (
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
                        <td style={{ padding: "12px 20px", color: "#64748b" }}>{r.non_working_days || 0}</td>
                        <td style={{ padding: "12px 20px", color: "#166534" }}>{r.total_present}</td>
                        <td style={{ padding: "12px 20px", color: "#991b1b" }}>{r.total_absent}</td>
                        <td style={{ padding: "12px 20px", color: "#d97706", fontWeight: "bold" }}>{r.total_leaves}</td>
                        <td style={{ padding: "12px 20px", color: "#dc2626" }}>{r.missing_punches}</td>
                        <td style={{ padding: "12px 20px" }}>{r.total_working_hours}</td>
                      </tr>
                    ))}
                    {filteredYearlyReports.length === 0 && (
                      <tr><td colSpan="10" style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>No data found</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          ) : (`;

code = code.replace(tabRenderTarget, tabRenderReplacement);

fs.writeFileSync('frontend/src/pages/AttendanceReport.jsx', code);
console.log('Patched AttendanceReport.jsx for yearly reports and total columns');
