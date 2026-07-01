const fs = require('fs');
let code = fs.readFileSync('backend/controllers/reportController.js', 'utf8');

const targetPendingQuery = `    // Check for pending attendance
    const pendingQuery = \`
      SELECT COUNT(*) as pending_count
      FROM generate_series(
          DATE( $1 || '-01' ),
          LEAST( (DATE( $1 || '-01' ) + INTERVAL '1 month - 1 day')::date, CURRENT_DATE ),
          INTERVAL '1 day'
      ) AS d(date)
      CROSS JOIN employees e
      WHERE e.is_active = true AND e.id != 1
      AND NOT EXISTS (
          SELECT 1 FROM attendance_summary a 
          WHERE a.employee_id = e.id AND a.attendance_date = d.date
      )
    \`;`;

const newPendingQuery = `    // Check for pending attendance
    const pendingQuery = \`
      SELECT COUNT(*) as pending_count
      FROM generate_series(
          DATE( $1 || '-01' ),
          LEAST( (DATE( $1 || '-01' ) + INTERVAL '1 month - 1 day')::date, CURRENT_DATE ),
          INTERVAL '1 day'
      ) AS d(date)
      CROSS JOIN employees e
      WHERE e.is_active = true AND e.id != 1
      AND EXTRACT(ISODOW FROM d.date) = ANY($2::int[])
      AND NOT EXISTS (
          SELECT 1 FROM company_holidays h WHERE h.holiday_date = d.date
      )
      AND NOT EXISTS (
          SELECT 1 FROM attendance_summary a 
          WHERE a.employee_id = e.id AND a.attendance_date = d.date
      )
    \`;`;

code = code.replace(targetPendingQuery, newPendingQuery);

const pendingTarget = `const pendingRes = await pool.query(pendingQuery, [monthPrefix]);`;
const pendingReplacement = `const pendingRes = await pool.query(pendingQuery, [monthPrefix, workingDays]);`;
code = code.replace(pendingTarget, pendingReplacement);

fs.writeFileSync('backend/controllers/reportController.js', code);
console.log('Pending attendance patched to exclude weekends and holidays');
