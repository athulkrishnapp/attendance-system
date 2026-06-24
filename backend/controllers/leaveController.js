const pool = require("../db");

exports.requestLeave = async (req, res) => {
  try {
    const { employee_id, start_date, end_date, leave_type, reason } = req.body;
    await pool.query(
      "INSERT INTO leave_requests (employee_id, start_date, end_date, leave_type, reason) VALUES ($1, $2, $3, $4, $5)",
      [employee_id, start_date, end_date, leave_type, reason]
    );
    res.json({ message: "Leave request submitted to Admin." });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit leave request" });
  }
};

exports.getMyLeaves = async (req, res) => {
  try {
    // req.params.id will be the logged-in employee's ID
    const result = await pool.query("SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY applied_on DESC", [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch leaves" });
  }
};

exports.getAllLeaves = async (req, res) => {
  try {
    // Join with employees table so the Admin sees names, not just IDs
    const result = await pool.query(`
      SELECT l.*, e.name, e.employee_code 
      FROM leave_requests l
      JOIN employees e ON l.employee_id = e.id
      ORDER BY l.applied_on DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch all leaves" });
  }
};

exports.updateLeaveStatus = async (req, res) => {
  try {
    const { leave_id, status } = req.body; // status will be 'APPROVED' or 'REJECTED'
    await pool.query("UPDATE leave_requests SET status = $1 WHERE id = $2", [status, leave_id]);
    res.json({ message: `Leave request ${status.toLowerCase()} successfully.` });
  } catch (err) {
    res.status(500).json({ error: "Failed to update leave status" });
  }
};