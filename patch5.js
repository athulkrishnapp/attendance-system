const fs = require('fs');

const target = `exports.getAllRegularizations = async (req, res) => {`;
const replacement = `exports.getMyRegularizations = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(\`
      SELECT r.*, a.attendance_date, a.core_status, a.modifier_flags
      FROM regularization_requests r
      JOIN attendance_summary a ON r.attendance_summary_id = a.id
      WHERE r.employee_id = $1
      ORDER BY r.applied_on DESC
    \`, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error("Failed to fetch my regularizations:", err);
    res.status(500).json({ error: "Failed to fetch my regularizations." });
  }
};

exports.getAllRegularizations = async (req, res) => {`;

let content = fs.readFileSync('backend/controllers/attendanceController.js', 'utf8');
content = content.replace(target, replacement);
fs.writeFileSync('backend/controllers/attendanceController.js', content);
console.log("Patched attendanceController.js");
