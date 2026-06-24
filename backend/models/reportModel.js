const pool = require("../db");

const getTotalEmployees = () => {
  return pool.query(
    "SELECT COUNT(*) FROM employees"
  );
};

const getTotalAttendance = () => {
  return pool.query(
    "SELECT COUNT(*) FROM attendance_summary"
  );
};

module.exports = {
  getTotalEmployees,
  getTotalAttendance,
};