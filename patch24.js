const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/AttendanceReport.jsx', 'utf8');

// 1. State changes
code = code.replace(
  `const [filterStatus, setFilterStatus] = useState("");`,
  `const [filterCoreStatus, setFilterCoreStatus] = useState("");
  const [filterFlag, setFilterFlag] = useState("");`
);

// 2. Filter logic changes
code = code.replace(
  `const matchesStatus = filterStatus 
        ? (item.core_status?.toUpperCase() === filterStatus.toUpperCase() || 
           (Array.isArray(item.modifier_flags) && item.modifier_flags.includes(filterStatus.toUpperCase())))
        : true;

      return matchesMonth && matchesDay && matchesEmployee && matchesStatus;`,
  `const matchesCoreStatus = filterCoreStatus 
        ? item.core_status?.toUpperCase() === filterCoreStatus.toUpperCase()
        : true;
        
      const matchesFlag = filterFlag
        ? (Array.isArray(item.modifier_flags) && item.modifier_flags.includes(filterFlag.toUpperCase())) || (typeof item.modifier_flags === 'string' && item.modifier_flags.includes(filterFlag.toUpperCase()))
        : true;

      return matchesMonth && matchesDay && matchesEmployee && matchesCoreStatus && matchesFlag;`
);

// Dependency array
code = code.replace(
  `}, [reports, filterMonth, filterDay, filterEmployee, filterStatus]);`,
  `}, [reports, filterMonth, filterDay, filterEmployee, filterCoreStatus, filterFlag]);`
);

// Clear filters
code = code.replace(
  `setFilterStatus("");`,
  `setFilterCoreStatus("");
    setFilterFlag("");`
);

// UI Dropdowns
const uiTarget = `<div style={styles.filterGroup}>
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
                    <option value="UNMARKED">Unmarked</option>
                  </select>
                </div>`;

const uiReplacement = `<div style={styles.filterGroup}>
                  <label style={styles.label}>Status</label>
                  <select value={filterCoreStatus} onChange={(e) => setFilterCoreStatus(e.target.value)} style={styles.input}>
                    <option value="">All Status</option>
                    <option value="PRESENT">Present</option>
                    <option value="ABSENT">Absent</option>
                    <option value="HALF_DAY">Half Day</option>
                    <option value="LEAVE">Leave</option>
                    <option value="MISSING_PUNCH">Missing Punch</option>
                    <option value="WEEKEND">Weekend</option>
                    <option value="HOLIDAY">Holiday</option>
                  </select>
                </div>

                <div style={styles.filterGroup}>
                  <label style={styles.label}>Flag</label>
                  <select value={filterFlag} onChange={(e) => setFilterFlag(e.target.value)} style={styles.input}>
                    <option value="">All Flags</option>
                    <option value="LATE">Late</option>
                    <option value="EARLY_EXIT">Early Exit</option>
                    <option value="OVERTIME">Overtime</option>
                    <option value="WEEKEND_WORK">Weekend Work</option>
                    <option value="HOLIDAY_WORK">Holiday Work</option>
                    <option value="FIRST_HALF">First Half</option>
                    <option value="SECOND_HALF">Second Half</option>
                    <option value="HOURLY_LEAVE">Hourly Leave</option>
                    <option value="REGULARIZED">Regularized</option>
                  </select>
                </div>`;

code = code.replace(uiTarget, uiReplacement);

fs.writeFileSync('frontend/src/pages/AttendanceReport.jsx', code);
console.log('AttendanceReport patched successfully');
