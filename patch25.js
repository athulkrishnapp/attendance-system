const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/AttendanceReport.jsx', 'utf8');

// 1. Add state for visibleFlags
code = code.replace(
  `const [loading, setLoading] = useState(true);`,
  `const [loading, setLoading] = useState(true);\n  const [visibleFlags, setVisibleFlags] = useState([]);`
);

// 2. Fetch settings in fetchMasterReports (or create a fetchSettings function)
code = code.replace(
  `const fetchReports = async () => {`,
  `const fetchSettings = async () => {
    try {
      const res = await api.settings.get();
      if (res.data && res.data.visible_flags) {
        setVisibleFlags(res.data.visible_flags);
      }
    } catch (err) { console.error(err); }
  };
  
  const fetchReports = async () => {`
);

// Add fetchSettings to useEffect
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

// 3. Render dynamic flag options based on visibleFlags
const flagDropdownTarget = `<select value={filterFlag} onChange={(e) => setFilterFlag(e.target.value)} style={styles.input}>
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
                  </select>`;

const flagDropdownReplacement = `<select value={filterFlag} onChange={(e) => setFilterFlag(e.target.value)} style={styles.input}>
                    <option value="">All Flags</option>
                    {visibleFlags.map(flag => (
                      <option key={flag} value={flag}>{flag.replace(/_/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase())}</option>
                    ))}
                    <option value="REGULARIZED">Regularized</option>
                  </select>`;

code = code.replace(flagDropdownTarget, flagDropdownReplacement);

fs.writeFileSync('frontend/src/pages/AttendanceReport.jsx', code);
console.log('AttendanceReport patched with dynamic flags');
