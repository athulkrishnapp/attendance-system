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
    const result = await pool.query(`
      SELECT a.id, a.employee_id, TO_CHAR(a.attendance_date, 'YYYY-MM-DD') as attendance_date, 
             a.first_in, a.last_out, a.working_hours, a.status, a.remarks, 
             e.name, e.employee_code
      FROM attendance_summary a
      JOIN employees e ON a.employee_id = e.id
      ORDER BY a.attendance_date DESC, e.name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).send("Error fetching attendance report");
  }
};

const getMyAttendance = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *, TO_CHAR(attendance_date, 'YYYY-MM-DD') as attendance_date 
      FROM attendance_summary 
      WHERE employee_id = $1 
      ORDER BY attendance_date DESC
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).send("Error fetching personal attendance");
  }
};

module.exports = {
  dashboard,
  getAttendanceReport,
  getMyAttendance, // Export new function
};