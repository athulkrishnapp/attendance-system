const fs = require('fs');
let code = fs.readFileSync('backend/controllers/reportController.js', 'utf8');

const newMethod = `
const getYearlyMasterReport = async (req, res) => {
  try {
    const { year } = req.query; 
    if (!year) return res.status(400).json({ error: "Year is required." });

    const settingsRes = await pool.query("SELECT financial_year_start_month FROM company_settings LIMIT 1");
    const startMonth = settingsRes.rows[0]?.financial_year_start_month || 1;

    // Calculate date span
    const startYear = parseInt(year, 10);
    const endYear = startMonth === 1 ? startYear : startYear + 1;
    const endMonth = startMonth === 1 ? 12 : startMonth - 1;
    
    const startDate = \`\${startYear}-\${String(startMonth).padStart(2, '0')}-01\`;
    const endDay = new Date(endYear, endMonth, 0).getDate();
    const endDate = \`\${endYear}-\${String(endMonth).padStart(2, '0')}-\${endDay}\`;

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
        COUNT(a.id) FILTER (
          WHERE a.core_status IN ('PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'MISSING_PUNCH') 
          OR (a.core_status IN ('WEEKEND', 'HOLIDAY') AND (a.modifier_flags ? 'WEEKEND_WORK' OR a.modifier_flags ? 'HOLIDAY_WORK' OR a.working_hours > 0))
        ) as total_working_days,
        COUNT(a.id) FILTER (
          WHERE a.core_status IN ('WEEKEND', 'HOLIDAY') 
          AND NOT (a.modifier_flags ? 'WEEKEND_WORK' OR a.modifier_flags ? 'HOLIDAY_WORK' OR a.working_hours > 0)
        ) as non_working_days,
        SUM(COALESCE(a.working_hours, 0)) as total_working_hours
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN attendance_summary a ON e.id = a.employee_id AND a.attendance_date >= $1 AND a.attendance_date <= $2
      WHERE e.is_active = true AND e.id != 1
      GROUP BY e.id, e.employee_code, e.name, d.department_name
      ORDER BY e.employee_code ASC
    \`;

    const result = await pool.query(query, [startDate, endDate]);
    const reports = result.rows;

    const leavesResult = await pool.query(\`
      SELECT 
        lr.employee_id,
        lt.name as leave_type_name,
        SUM(
          CASE 
            WHEN lr.leave_portion = 'FIRST_HALF' OR lr.leave_portion = 'SECOND_HALF' OR lr.leave_portion = 'HALF_DAY' THEN 0.5 
            WHEN lr.leave_portion = 'FULL_DAY' THEN (lr.end_date - lr.start_date) + 1
            WHEN lr.leave_portion = 'HOURLY' THEN lr.hourly_duration / 8.0
            ELSE 0 
          END
        ) as total_days
      FROM leave_requests lr
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      WHERE lr.status = 'APPROVED' 
        AND lr.start_date >= $1 AND lr.start_date <= $2
      GROUP BY lr.employee_id, lt.name
    \`, [startDate, endDate]);

    reports.forEach(report => {
      report.leaves = {};
      leavesResult.rows.forEach(leave => {
        if (leave.employee_id === report.employee_id) {
          report.leaves[leave.leave_type_name] = parseFloat(leave.total_days);
        }
      });
    });

    res.json({ reports, leaveTypes, span: { startDate, endDate } });
  } catch (err) {
    console.error("Yearly Report Error:", err);
    res.status(500).json({ error: "Failed to generate yearly report." });
  }
};
\`;

code = code.replace(
  `module.exports = {`,
  newMethod + `\nmodule.exports = {\n  getYearlyMasterReport,`
);

fs.writeFileSync('backend/controllers/reportController.js', code);

// Add to routes/reports.js
let routes = fs.readFileSync('backend/routes/reports.js', 'utf8');
routes = routes.replace(
  `router.get('/master', reportController.getMasterReport);`,
  `router.get('/master', reportController.getMasterReport);\nrouter.get('/yearly', reportController.getYearlyMasterReport);`
);
fs.writeFileSync('backend/routes/reports.js', routes);

console.log('Added getYearlyMasterReport');
