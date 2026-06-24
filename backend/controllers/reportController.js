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
    console.error(err);
    res.status(500).send("Error fetching dashboard stats");
  }
};

const getAttendanceReport = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        a.id, 
        a.attendance_date, 
        a.first_in, 
        a.last_out, 
        a.working_hours, 
        a.status, 
        a.remarks,
        e.name, 
        e.employee_code
      FROM attendance_summary a
      JOIN employees e ON a.employee_id = e.id
      ORDER BY a.attendance_date DESC, e.name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching attendance report");
  }
};

// A single, clean export at the very bottom
module.exports = {
  dashboard,
  getAttendanceReport,
};