const pool = require("./db");

async function test() {
  try {
    const id = 9;
    const year = 2026;
    const surrenderedRes = await pool.query(
      `SELECT leave_type_id, SUM(days) as surrendered_days
       FROM leave_balance_actions
       WHERE employee_id = $1 AND status = 'APPROVED' AND EXTRACT(YEAR FROM requested_on) = $2
       GROUP BY leave_type_id`, [id, year]
    );
    console.log(surrenderedRes.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

test();
