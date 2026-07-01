const fs = require('fs');
let code = fs.readFileSync('backend/controllers/reportController.js', 'utf8');

const targetDashboard = `const dashboard = async (req, res) => {
  try {
    // 1. Get total active employees
    const employeesResult = await pool.query("SELECT COUNT(*) FROM employees");
    const totalEmployees = parseInt(employeesResult.rows[0].count);

    // 2. Get yesterday's attendance (Count distinct employees who had working hours > 0 yesterday)
    const yesterdayResult = await pool.query(\`
      SELECT COUNT(DISTINCT employee_id)
      FROM attendance_summary
      WHERE attendance_date = CURRENT_DATE - INTERVAL '1 day'
      AND working_hours > 0
    \`);
    const yesterdayPresent = parseInt(yesterdayResult.rows[0].count);

    res.json({
      totalEmployees: totalEmployees,
      yesterdayPresent: yesterdayPresent
    });
  } catch (err) {
    console.error("Dashboard Stats Error:", err.message);
    res.status(500).send("Error fetching dashboard stats");
  }
};`;

const replacementDashboard = `const dashboard = async (req, res) => {
  try {
    const employeesResult = await pool.query("SELECT COUNT(*) FROM employees WHERE is_active = true AND id != 1");
    const totalEmployees = parseInt(employeesResult.rows[0].count);

    const yesterdayResult = await pool.query(\`
      SELECT core_status, COUNT(DISTINCT employee_id) as count
      FROM attendance_summary
      WHERE attendance_date = CURRENT_DATE - INTERVAL '1 day'
      GROUP BY core_status
    \`);
    
    let present = 0;
    let missing_punch = 0;
    let half_day = 0;
    let leave = 0;
    let marked_absent = 0;
    let weekend = 0;
    let holiday = 0;

    yesterdayResult.rows.forEach(r => {
      const c = parseInt(r.count);
      if (r.core_status === 'PRESENT') present += c;
      else if (r.core_status === 'MISSING_PUNCH') missing_punch += c;
      else if (r.core_status === 'HALF_DAY') half_day += c;
      else if (r.core_status === 'LEAVE') leave += c;
      else if (r.core_status === 'ABSENT') marked_absent += c;
      else if (r.core_status === 'WEEKEND') weekend += c;
      else if (r.core_status === 'HOLIDAY') holiday += c;
    });

    const absent = totalEmployees - (present + missing_punch + half_day + leave + weekend + holiday);

    res.json({
      totalEmployees,
      present,
      missing_punch,
      half_day,
      leave,
      absent
    });
  } catch (err) {
    console.error("Dashboard Stats Error:", err.message);
    res.status(500).send("Error fetching dashboard stats");
  }
};`;

code = code.replace(targetDashboard, replacementDashboard);

fs.writeFileSync('backend/controllers/reportController.js', code);
console.log('Patched dashboard controller');
