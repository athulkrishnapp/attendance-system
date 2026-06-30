const pool = require("../db");

async function computeWarningsAndStats(employee_id, leave_type_id, start_date, end_date) {
  const warnings = [];
  const stats = {};
  
  try {
    // 1. Advance notice check
    if (leave_type_id) {
      const ltRes = await pool.query("SELECT name, min_advance_notice_days FROM leave_types WHERE id = $1", [leave_type_id]);
      const lt = ltRes.rows[0];
      if (lt && lt.min_advance_notice_days > 0) {
        const today = new Date();
        today.setHours(0,0,0,0);
        const start = new Date(start_date);
        const diffTime = start - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < lt.min_advance_notice_days) {
          warnings.push(`Not enough prior notice. ${lt.name} requires ${lt.min_advance_notice_days} days notice (only provided ${diffDays} days).`);
        }
      }
    }

    // 2. Department limit check & Stats
    const empRes = await pool.query(`
      SELECT e.department_id, e.shift_id, d.department_name, d.max_concurrent_leaves, s.shift_name
      FROM employees e 
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN shifts s ON e.shift_id = s.id
      WHERE e.id = $1
    `, [employee_id]);
    const empData = empRes.rows[0];
    
    if (empData) {
      stats.department = empData.department_name || 'N/A';
      stats.shift = empData.shift_name || 'N/A';
      stats.max_concurrent = empData.max_concurrent_leaves || 0;
      
      if (empData.department_id) {
        // Find how many unique employees in this dept are on approved leave overlapping these dates
        const overlapRes = await pool.query(`
          SELECT COUNT(DISTINCT lr.employee_id) as concurrent
          FROM leave_requests lr
          JOIN employees e ON lr.employee_id = e.id
          WHERE e.department_id = $1 
            AND lr.status = 'APPROVED'
            AND lr.employee_id != $2
            AND (lr.start_date <= $4 AND lr.end_date >= $3)
        `, [empData.department_id, employee_id, start_date, end_date]);
        
        const concurrent = parseInt(overlapRes.rows[0].concurrent, 10);
        stats.approved_leaves = concurrent;
        stats.available_slots = Math.max(0, stats.max_concurrent - concurrent);
        
        if (empData.max_concurrent_leaves !== null && concurrent >= empData.max_concurrent_leaves) {
          warnings.push(`Department leave limit reached. ${empData.department_name} allows max ${empData.max_concurrent_leaves} concurrent leaves (currently ${concurrent} on leave).`);
        }
      }
    }
  } catch (err) {
    console.error("Warning/Stats computation error:", err);
  }
  return { warnings, stats };
}

module.exports = { computeWarningsAndStats };
