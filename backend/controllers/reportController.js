const pool = require("../db");
const reportModel = require("../models/reportModel");

const dashboard = async (req, res) => {
  try {
    const employees = await reportModel.getTotalEmployees();
    const attendance = await reportModel.getTotalAttendance();
    res.json({
      totalEmployees: employees.rows[0].count,
      totalAttendance: attendance.rows[0].count,
    });
  } catch (err) {
    res.status(500).send("Error fetching dashboard stats");
  }
};

const getAttendanceReport = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, e.name, e.employee_code
      FROM attendance_summary a
      JOIN employees e ON a.employee_id = e.id
      ORDER BY a.attendance_date DESC, e.name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).send("Error fetching attendance report");
  }
};

//Fetch attendance for a specific employee
const getMyAttendance = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM attendance_summary 
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