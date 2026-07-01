const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/AttendanceReport.jsx', 'utf8');

// 1. Fix fetchSettings
code = code.replace(
  `if (res.data && res.data.visible_flags) {
        setVisibleFlags(res.data.visible_flags);
      }`,
  `if (res.data && res.data.settings && res.data.settings.visible_flags) {
        setVisibleFlags(res.data.settings.visible_flags);
      }`
);

// 2. Fix the names in the dropdown
const statusTarget = `<select value={filterCoreStatus} onChange={(e) => setFilterCoreStatus(e.target.value)} style={styles.input}>
                    <option value="">All Status</option>
                    <option value="PRESENT">Present</option>
                    <option value="ABSENT">Absent</option>
                    <option value="HALF_DAY">Half Day</option>
                    <option value="LEAVE">Leave</option>
                    <option value="MISSING_PUNCH">Missing Punch</option>
                    <option value="WEEKEND">Weekend</option>
                    <option value="HOLIDAY">Holiday</option>
                  </select>`;

const statusReplacement = `<select value={filterCoreStatus} onChange={(e) => setFilterCoreStatus(e.target.value)} style={styles.input}>
                    <option value="">All Status</option>
                    <option value="PRESENT">Present</option>
                    <option value="ABSENT">Absent</option>
                    <option value="HALF_DAY">Half Day</option>
                    <option value="LEAVE">Leave</option>
                    <option value="MISSING_PUNCH">Missing Punch</option>
                    <option value="WEEKEND">Week Off</option>
                    <option value="HOLIDAY">Holiday</option>
                  </select>`;

code = code.replace(statusTarget, statusReplacement);

fs.writeFileSync('frontend/src/pages/AttendanceReport.jsx', code);
console.log('AttendanceReport patched with fix');
