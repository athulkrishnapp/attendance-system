const fs = require('fs');
const content = fs.readFileSync('backend/controllers/reportController.js', 'utf8');

const target = `const getAttendanceReport = async (req, res) => {
  try {
    const settingsRes = await pool.query("SELECT visible_flags FROM company_settings LIMIT 1");
    const visibleFlags = settingsRes.rows[0]?.visible_flags || [];

    const result = await pool.query(\`
      SELECT a.id, a.employee_id, TO_CHAR(a.attendance_date, 'YYYY-MM-DD') as attendance_date, 
             a.first_in, a.last_out, a.working_hours, a.core_status, a.modifier_flags, a.remarks, 
             e.name, e.employee_code, lt.name as leave_type_name
      FROM attendance_summary a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN leave_requests lr ON a.employee_id = lr.employee_id 
           AND lr.status = 'APPROVED' 
           AND a.attendance_date >= lr.start_date AND a.attendance_date <= lr.end_date
      LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
      ORDER BY a.attendance_date DESC, e.name ASC
    \`);

    const maskedRows = result.rows.map(row => {
      let flags = row.modifier_flags;
      if (typeof flags === 'string') {
        try { flags = JSON.parse(flags); } catch(e) { flags = []; }
      }
      if (flags && Array.isArray(flags)) {
        row.modifier_flags = flags.filter(flag => visibleFlags.includes(flag));
      } else {
        row.modifier_flags = [];
      }
      return row;
    });

    res.json(maskedRows);
  } catch (err) {
    res.status(500).send("Error fetching attendance report");
  }
};`;

const replacement = `const getAttendanceReport = async (req, res) => {
  try {
    const { month } = req.query; // YYYY-MM
    let monthPrefix = month;
    if (!monthPrefix) {
      const now = new Date();
      monthPrefix = \`\${now.getFullYear()}-\${String(now.getMonth() + 1).padStart(2, '0')}\`;
    }

    const settingsRes = await pool.query("SELECT visible_flags, working_days FROM company_settings LIMIT 1");
    const visibleFlags = settingsRes.rows[0]?.visible_flags || [];
    const workingDays = settingsRes.rows[0]?.working_days || [1, 2, 3, 4, 5, 6];

    const result = await pool.query(\`
      SELECT 
          TO_CHAR(d.date, 'YYYY-MM-DD') AS attendance_date,
          e.id AS employee_id,
          e.name,
          e.employee_code,
          a.id,
          a.first_in,
          a.last_out,
          a.working_hours,
          a.core_status,
          a.modifier_flags,
          a.remarks,
          lt.name AS leave_type_name,
          h.description AS holiday_name,
          EXTRACT(ISODOW FROM d.date) AS day_of_week
      FROM generate_series(
          DATE( $1 || '-01' ),
          (DATE( $1 || '-01' ) + INTERVAL '1 month - 1 day')::date,
          INTERVAL '1 day'
      ) AS d(date)
      CROSS JOIN employees e
      LEFT JOIN attendance_summary a 
          ON a.employee_id = e.id AND a.attendance_date = d.date
      LEFT JOIN leave_requests lr 
          ON lr.employee_id = e.id 
          AND lr.status = 'APPROVED' 
          AND d.date >= lr.start_date AND d.date <= lr.end_date
      LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
      LEFT JOIN company_holidays h ON h.holiday_date = d.date
      WHERE e.is_active = true
      ORDER BY d.date DESC, e.name ASC
    \`, [monthPrefix]);

    const maskedRows = result.rows.map(row => {
      let flags = row.modifier_flags;
      if (typeof flags === 'string') {
        try { flags = JSON.parse(flags); } catch(e) { flags = []; }
      }
      if (!Array.isArray(flags)) flags = [];
      
      row.modifier_flags = flags.filter(flag => visibleFlags.includes(flag));

      if (!row.core_status) {
        if (row.holiday_name) {
          row.core_status = 'HOLIDAY';
        } else if (!workingDays.includes(parseInt(row.day_of_week))) {
          row.core_status = 'WEEKEND';
        } else {
          row.core_status = 'UNMARKED';
        }
      }

      return row;
    });

    res.json(maskedRows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching attendance report");
  }
};`;

let newContent = content.replace(target, replacement);
fs.writeFileSync('backend/controllers/reportController.js', newContent);
console.log("Patched reportController.js");
