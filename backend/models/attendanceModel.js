const pool = require("../db");

const getAllAttendance = () => {
  return pool.query(
    "SELECT * FROM attendance_summary ORDER BY id DESC"
  );
};

const createAttendance = ({
  employee_id,
  attendance_date,
  first_in,
  last_out,
  working_hours,
  status,
  remarks,
}) => {
  return pool.query(
    `INSERT INTO attendance_summary
    (
      employee_id,
      attendance_date,
      first_in,
      last_out,
      working_hours,
      status,
      remarks
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING *`,
    [
      employee_id,
      attendance_date,
      first_in,
      last_out,
      working_hours,
      status,
      remarks,
    ]
  );
};

module.exports = {
  getAllAttendance,
  createAttendance,
};