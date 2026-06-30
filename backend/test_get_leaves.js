const pool = require("./db");
async function test() {
  const result = await pool.query(`
      SELECT l.id, l.status, l.forwarded_by_id,
             e.manager_id as employee_manager_id,
             m.manager_id as forwarder_manager_id
      FROM leave_requests l
      JOIN employees e ON l.employee_id = e.id
      LEFT JOIN employees m ON l.forwarded_by_id = m.id
      WHERE e.manager_id = 8 OR (l.forwarded_by_id IS NOT NULL AND m.manager_id = 8)
  `);
  console.log(result.rows);
  pool.end();
}
test();

