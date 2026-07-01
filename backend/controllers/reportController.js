const pool = require("../db");
const reportModel = require("../models/reportModel");

const dashboard = async (req, res) => {
  try {
    const employeesResult = await pool.query("SELECT COUNT(*) FROM employees WHERE is_active = true AND id != 1");
    const totalEmployees = parseInt(employeesResult.rows[0].count);

    const yesterdayResult = await pool.query(`
      SELECT core_status, COUNT(DISTINCT employee_id) as count
      FROM attendance_summary
      WHERE attendance_date = CURRENT_DATE - INTERVAL '1 day'
      GROUP BY core_status
    `);
    
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
};

const getAttendanceReport = async (req, res) => {
  try {
    const { month } = req.query; // YYYY-MM
    let monthPrefix = month;
    if (!monthPrefix) {
      const now = new Date();
      monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    const settingsRes = await pool.query("SELECT visible_flags, working_days FROM company_settings LIMIT 1");
    const visibleFlags = settingsRes.rows[0]?.visible_flags || [];
    const workingDays = settingsRes.rows[0]?.working_days || [1, 2, 3, 4, 5, 6];

    const result = await pool.query(`
      SELECT 
          TO_CHAR(d.date, 'YYYY-MM-DD') AS attendance_date,
          e.id AS employee_id,
          e.name,
          e.employee_code,
          a.id,
          a.first_in,
          a.last_out,
          a.working_hours,
          a.core_status,
          a.modifier_flags,
          a.remarks,
          lt.name AS leave_type_name,
          h.description AS holiday_name,
          EXTRACT(ISODOW FROM d.date) AS day_of_week
      FROM generate_series(
          DATE( $1 || '-01' ),
          (DATE( $1 || '-01' ) + INTERVAL '1 month - 1 day')::date,
          INTERVAL '1 day'
      ) AS d(date)
      CROSS JOIN employees e
      LEFT JOIN attendance_summary a 
          ON a.employee_id = e.id AND a.attendance_date = d.date
      LEFT JOIN leave_requests lr 
          ON lr.employee_id = e.id 
          AND lr.status = 'APPROVED' 
          AND d.date >= lr.start_date AND d.date <= lr.end_date
      LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
      LEFT JOIN company_holidays h ON h.holiday_date = d.date
      WHERE e.is_active = true AND e.id != 1
      ORDER BY d.date DESC, e.name ASC
    `, [monthPrefix]);

    const maskedRows = result.rows.map(row => {
      let flags = row.modifier_flags;
      if (typeof flags === 'string') {
        try { flags = JSON.parse(flags); } catch(e) { flags = []; }
      }
      if (!Array.isArray(flags)) flags = [];
      
      row.modifier_flags = flags.filter(flag => visibleFlags.includes(flag));

      if (!row.core_status) {
        if (row.holiday_name) {
          row.core_status = 'HOLIDAY';
        } else if (!workingDays.includes(parseInt(row.day_of_week))) {
          row.core_status = 'WEEKEND';
        } else {
          row.core_status = 'UNMARKED';
        }
      }

      return row;
    });

    res.json(maskedRows);
  } catch (err) {
    console.error(err);
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

    // Calculate month metrics
    const settingsRes = await pool.query("SELECT working_days FROM company_settings LIMIT 1");
    const workingDays = settingsRes.rows[0]?.working_days || [1, 2, 3, 4, 5, 6]; 
    
    const startDate = new Date(`${monthPrefix}-01T00:00:00Z`);
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
    const pendingQuery = `
      SELECT COUNT(*) as pending_count
      FROM generate_series(
          DATE( $1 || '-01' ),
          LEAST( (DATE( $1 || '-01' ) + INTERVAL '1 month - 1 day')::date, CURRENT_DATE ),
          INTERVAL '1 day'
      ) AS d(date)
      CROSS JOIN employees e
      WHERE e.is_active = true AND e.id != 1
      AND EXTRACT(ISODOW FROM d.date) = ANY($2::int[])
      AND NOT EXISTS (
          SELECT 1 FROM company_holidays h WHERE h.holiday_date = d.date
      )
      AND NOT EXISTS (
          SELECT 1 FROM attendance_summary a 
          WHERE a.employee_id = e.id AND a.attendance_date = d.date
      )
    `;
    const pendingRes = await pool.query(pendingQuery, [monthPrefix, workingDays]);
    const hasPendingAttendance = parseInt(pendingRes.rows[0].pending_count) > 0;

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
      LEFT JOIN attendance_summary a ON e.id = a.employee_id AND TO_CHAR(a.attendance_date, 'YYYY-MM') = $1
      WHERE e.is_active = true AND e.id != 1
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

    res.json({ 
      reports, 
      leaveTypes, 
      monthStats: { 
        totalDays: totalDaysInMonth, 
        nonWorkingDays: totalWeekendsAndHolidays, 
        workingDays: totalWorkingDays,
        hasPendingAttendance: hasPendingAttendance
      } 
    });
  } catch (err) {
    console.error("Master Report Error:", err);
    console.error(err); res.status(500).json({ error: err.message, stack: err.stack });
  }
};

module.exports = {
  dashboard,
  getAttendanceReport,
  getMyAttendance,
  getMasterReport
};