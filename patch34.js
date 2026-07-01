const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/AttendanceReport.jsx', 'utf8');

// 1. Add monthStats state
code = code.replace(
  `const [masterReports, setMasterReports] = useState([]);`,
  `const [masterReports, setMasterReports] = useState([]);
  const [monthStats, setMonthStats] = useState(null);`
);

// 2. Add visibleFlags state and fetchSettings
code = code.replace(
  `const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);`,
  `const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleFlags, setVisibleFlags] = useState([]);

  const fetchSettings = async () => {
    try {
      const res = await api.settings.get();
      if (res.data && res.data.settings && res.data.settings.visible_flags) {
        setVisibleFlags(res.data.settings.visible_flags);
      }
    } catch (err) { console.error(err); }
  };`
);

// 3. Call fetchSettings in useEffect
code = code.replace(
  `useEffect(() => {
    fetchReports();
    fetchMasterReports();
  }, [filterMonth]);`,
  `useEffect(() => {
    fetchSettings();
    fetchReports();
    fetchMasterReports();
  }, [filterMonth]);`
);

// 4. Update fetchMasterReports to capture monthStats
code = code.replace(
  `setLeaveTypes(res.data.leaveTypes || []);`,
  `setLeaveTypes(res.data.leaveTypes || []);
      setMonthStats(res.data.monthStats || null);`
);

// 5. Update filtering states
code = code.replace(
  `const [filterStatus, setFilterStatus] = useState("");`,
  `const [filterCoreStatus, setFilterCoreStatus] = useState("");
  const [filterFlag, setFilterFlag] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");`
);

// 6. Update Daily Logs filter logic
code = code.replace(
  `const matchesStatus = filterStatus 
        ? (item.core_status?.toUpperCase() === filterStatus.toUpperCase() || 
           (Array.isArray(item.modifier_flags) && item.modifier_flags.includes(filterStatus.toUpperCase())))
        : true;

      return matchesMonth && matchesDay && matchesEmployee && matchesStatus;
    });
  }, [reports, filterMonth, filterDay, filterEmployee, filterStatus]);`,
  `const matchesCoreStatus = filterCoreStatus 
        ? item.core_status?.toUpperCase() === filterCoreStatus.toUpperCase()
        : true;
        
      const matchesFlag = filterFlag
        ? (Array.isArray(item.modifier_flags) && item.modifier_flags.includes(filterFlag.toUpperCase())) || (typeof item.modifier_flags === 'string' && item.modifier_flags.includes(filterFlag.toUpperCase()))
        : true;
        
      const matchesDepartment = filterDepartment ? item.department_name === filterDepartment : true;

      return matchesMonth && matchesDay && matchesEmployee && matchesCoreStatus && matchesFlag && matchesDepartment;
    });
  }, [reports, filterMonth, filterDay, filterEmployee, filterCoreStatus, filterFlag, filterDepartment]);`
);

// 7. Update clearFilters
code = code.replace(
  `setFilterStatus("");`,
  `setFilterCoreStatus("");
    setFilterFlag("");
    setFilterDepartment("");`
);

// 8. Replace Status filter UI with Department + Core Status + Flag
const oldFilterUI = `<div style={styles.filterGroup}>
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
                </div>`;

const newFilterUI = `<div style={styles.filterGroup}>
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
                      <option key={flag} value={flag}>{flag.replace(/_/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase())}</option>
                    ))}
                    <option value="REGULARIZED">Regularized</option>
                  </select>
                </div>`;

code = code.replace(oldFilterUI, newFilterUI);

// 9. Display Month Stats & Warning in Master Report
const oldMasterUI = `<div style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={styles.label}>Filter Department</label>
                  <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} style={{...styles.input, width: '200px'}}>`;

const newMasterUI = `<div style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={styles.label}>Filter Department</label>
                    <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} style={{...styles.input, width: '200px'}}>`;

const oldMasterUISearch = `</div>
              </div>

              {loading ? (`;

const newMasterUISearch = `</div>
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

              {loading ? (`;

code = code.replace(oldMasterUI, newMasterUI);
code = code.replace(oldMasterUISearch, newMasterUISearch);

fs.writeFileSync('frontend/src/pages/AttendanceReport.jsx', code);
console.log('AttendanceReport patched with non working days summary and warning');
