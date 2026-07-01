const fs = require('fs');
let code = fs.readFileSync('backend/controllers/reportController.js', 'utf8');

const targetQuery = `const getMasterReport = async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) return res.status(400).json({ error: "Year and month are required." });

    const monthPrefix = \`\${year}-\${month.padStart(2, '0')}\`;

    // Get active leave types
    const leaveTypesResult = await pool.query("SELECT id, name FROM leave_types ORDER BY name ASC");
    const leaveTypes = leaveTypesResult.rows;

    const query = \`
      SELECT 
        e.id as employee_id,
        e.employee_code,
        e.name,
        d.department_name,
        COUNT(a.id) FILTER (WHERE a.core_status = 'PRESENT' OR a.core_status = 'HALF_DAY') as total_present,
        COUNT(a.id) FILTER (WHERE a.core_status = 'ABSENT') as total_absent,
        COUNT(a.id) FILTER (WHERE a.core_status = 'LEAVE' OR a.core_status = 'HALF_DAY') as total_leaves,
        COUNT(a.id) FILTER (WHERE a.core_status = 'MISSING_PUNCH') as missing_punches,
        SUM(COALESCE(a.working_hours, 0)) as total_working_hours
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN attendance_summary a ON e.id = a.employee_id AND TO_CHAR(a.attendance_date, 'YYYY-MM') = $1
      WHERE e.is_active = true AND e.id != 1
      GROUP BY e.id, e.employee_code, e.name, d.department_name
      ORDER BY e.employee_code ASC
    \`;`;

const replacementQuery = `const getMasterReport = async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) return res.status(400).json({ error: "Year and month are required." });

    const monthPrefix = \`\${year}-\${month.padStart(2, '0')}\`;

    // Calculate month metrics
    const settingsRes = await pool.query("SELECT working_days FROM company_settings LIMIT 1");
    const workingDays = settingsRes.rows[0]?.working_days || [1, 2, 3, 4, 5, 6]; // ISO DOW (1=Mon)
    
    const startDate = new Date(\`\${monthPrefix}-01T00:00:00Z\`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 0, 0, 0);
    const totalDaysInMonth = endDate.getDate();
    
    const holidaysRes = await pool.query("SELECT holiday_date FROM company_holidays WHERE TO_CHAR(holiday_date, 'YYYY-MM') = $1", [monthPrefix]);
    const holidayDates = holidaysRes.rows.map(r => r.holiday_date.toISOString().split('T')[0]);

    let totalWeekendsAndHolidays = 0;
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const current = new Date(startDate.getFullYear(), startDate.getMonth(), d);
      const isoDow = current.getDay() === 0 ? 7 : current.getDay();
      const dateStr = current.toISOString().split('T')[0];
      
      const isWeekend = !workingDays.includes(isoDow);
      const isHoliday = holidayDates.includes(dateStr);
      
      if (isWeekend || isHoliday) {
        totalWeekendsAndHolidays++;
      }
    }

    const totalWorkingDays = totalDaysInMonth - totalWeekendsAndHolidays;

    // Check for pending attendance
    const pendingQuery = \`
      SELECT COUNT(*) as pending_count
      FROM generate_series(
          DATE( $1 || '-01' ),
          LEAST( (DATE( $1 || '-01' ) + INTERVAL '1 month - 1 day')::date, CURRENT_DATE ),
          INTERVAL '1 day'
      ) AS d(date)
      CROSS JOIN employees e
      WHERE e.is_active = true AND e.id != 1
      AND NOT EXISTS (
          SELECT 1 FROM attendance_summary a 
          WHERE a.employee_id = e.id AND a.attendance_date = d.date
      )
    \`;
    const pendingRes = await pool.query(pendingQuery, [monthPrefix]);
    const hasPendingAttendance = parseInt(pendingRes.rows[0].pending_count) > 0;

    // Get active leave types
    const leaveTypesResult = await pool.query("SELECT id, name FROM leave_types ORDER BY name ASC");
    const leaveTypes = leaveTypesResult.rows;

    const query = \`
      SELECT 
        e.id as employee_id,
        e.employee_code,
        e.name,
        d.department_name,
        COUNT(a.id) FILTER (WHERE a.core_status = 'PRESENT' OR a.core_status = 'HALF_DAY') as total_present,
        COUNT(a.id) FILTER (WHERE a.core_status = 'ABSENT') as total_absent,
        COUNT(a.id) FILTER (WHERE a.core_status = 'LEAVE' OR a.core_status = 'HALF_DAY') as total_leaves,
        COUNT(a.id) FILTER (WHERE a.core_status = 'MISSING_PUNCH') as missing_punches,
        SUM(COALESCE(a.working_hours, 0)) as total_working_hours
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN attendance_summary a ON e.id = a.employee_id AND TO_CHAR(a.attendance_date, 'YYYY-MM') = $1
      WHERE e.is_active = true AND e.id != 1
      GROUP BY e.id, e.employee_code, e.name, d.department_name
      ORDER BY e.employee_code ASC
    \`;`;

const jsonTarget = `res.json({ reports, leaveTypes });`;
const jsonReplacement = `res.json({ 
      reports, 
      leaveTypes, 
      monthStats: { 
        totalDays: totalDaysInMonth, 
        nonWorkingDays: totalWeekendsAndHolidays, 
        workingDays: totalWorkingDays,
        hasPendingAttendance: hasPendingAttendance
      } 
    });`;

code = code.replace(targetQuery, replacementQuery);
code = code.replace(jsonTarget, jsonReplacement);

fs.writeFileSync('backend/controllers/reportController.js', code);
console.log('Patched getMasterReport');
