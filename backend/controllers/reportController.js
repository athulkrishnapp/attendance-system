const pool = require("../db");
const reportModel = require("../models/reportModel");

const dashboard = async (req, res) => {
  try {
    // 1. Get total active employees
    const employeesResult = await pool.query("SELECT COUNT(*) FROM employees");
    const totalEmployees = parseInt(employeesResult.rows[0].count);

    // 2. Get yesterday's attendance (Count distinct employees who had working hours > 0 yesterday)
    const yesterdayResult = await pool.query(`
      SELECT COUNT(DISTINCT employee_id) 
      FROM attendance_summary 
      WHERE attendance_date = CURRENT_DATE - INTERVAL '1 day' 
      AND working_hours > 0
    `);
    const yesterdayPresent = parseInt(yesterdayResult.rows[0].count);

    res.json({
      totalEmployees: totalEmployees,
      yesterdayPresent: yesterdayPresent
    });
  } catch (err) {
    console.error("Dashboard Stats Error:", err.message);
    res.status(500).send("Error fetching dashboard stats");
  }
};

const getAttendanceReport = async (req, res) => {
  try {
    const settingsRes = await pool.query("SELECT visible_flags FROM company_settings LIMIT 1");
    const visibleFlags = settingsRes.rows[0]?.visible_flags || [];

    const result = await pool.query(`
      SELECT a.id, a.employee_id, TO_CHAR(a.attendance_date, 'YYYY-MM-DD') as attendance_date, 
             a.first_in, a.last_out, a.working_hours, a.core_status, a.modifier_flags, a.remarks, 
             e.name, e.employee_code, lt.name as leave_type_name
      FROM attendance_summary a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN leave_requests lr ON a.employee_id = lr.employee_id 
           AND lr.status = 'APPROVED' 
           AND a.attendance_date >= lr.start_date AND a.attendance_date <= lr.end_date
      LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
      ORDER BY a.attendance_date DESC, e.name ASC
    `);

    const maskedRows = result.rows.map(row => {
      let flags = row.modifier_flags;
      if (typeof flags === 'string') {
        try { flags = JSON.parse(flags); } catch(e) { flags = []; }
      }
      if (flags && Array.isArray(flags)) {
        row.modifier_flags = flags.filter(flag => visibleFlags.includes(flag));
      } else {
        row.modifier_flags = [];
      }
      return row;
    });

    res.json(maskedRows);
  } catch (err) {
    res.status(500).send("Error fetching attendance report");
  }
};

const getMyAttendance = async (req, res) => {
  try {
    const settingsRes = await pool.query("SELECT visible_flags FROM company_settings LIMIT 1");
    const visibleFlags = settingsRes.rows[0]?.visible_flags || [];

    const result = await pool.query(`
      SELECT a.*, TO_CHAR(a.attendance_date, 'YYYY-MM-DD') as attendance_date,
             lt.name as leave_type_name
      FROM attendance_summary a
      LEFT JOIN leave_requests lr ON a.employee_id = lr.employee_id 
           AND lr.status = 'APPROVED' 
           AND a.attendance_date >= lr.start_date AND a.attendance_date <= lr.end_date
      LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
      WHERE a.employee_id = $1 
      ORDER BY a.attendance_date DESC
    `, [req.params.id]);

    const maskedRows = result.rows.map(row => {
      let flags = row.modifier_flags;
      if (typeof flags === 'string') {
        try { flags = JSON.parse(flags); } catch(e) { flags = []; }
      }
      if (flags && Array.isArray(flags)) {
        row.modifier_flags = flags.filter(flag => visibleFlags.includes(flag));
      } else {
        row.modifier_flags = [];
      }
      return row;
    });

    res.json(maskedRows);
  } catch (err) {
    console.error("Error fetching personal attendance:", err);
    res.status(500).send("Error fetching personal attendance");
  }
};

const getMasterReport = async (req, res) => {
  try {
    const { year, month } = req.query; 
    if (!year || !month) return res.status(400).json({ error: "Year and month are required." });

    const monthPrefix = `${year}-${month.padStart(2, '0')}`;

    // Get active leave types
    const leaveTypesResult = await pool.query("SELECT id, name FROM leave_types ORDER BY name ASC");
    const leaveTypes = leaveTypesResult.rows;

    const query = `
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
      WHERE e.is_active = true
      GROUP BY e.id, e.employee_code, e.name, d.department_name
      ORDER BY e.employee_code ASC
    `;

    const result = await pool.query(query, [monthPrefix]);
    const reports = result.rows;

    // Get leave usage for the month
    const leavesResult = await pool.query(`
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
        AND TO_CHAR(lr.start_date, 'YYYY-MM') = $1
      GROUP BY lr.employee_id, lt.name
    `, [monthPrefix]);

    // Merge
    reports.forEach(report => {
      report.leaves = {};
      leavesResult.rows.forEach(leave => {
        if (leave.employee_id === report.employee_id) {
          report.leaves[leave.leave_type_name] = parseFloat(leave.total_days);
        }
      });
    });

    res.json({ reports, leaveTypes });
  } catch (err) {
    console.error("Master Report Error:", err);
    res.status(500).json({ error: "Failed to generate master report." });
  }
};

module.exports = {
  dashboard,
  getAttendanceReport,
  getMyAttendance,
  getMasterReport,
};