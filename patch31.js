const fs = require('fs');
let code = fs.readFileSync('backend/controllers/reportController.js', 'utf8');

const targetDailyLogQuery = `      SELECT
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
      WHERE e.is_active = true AND e.id != 1
      ORDER BY d.date DESC, e.name ASC`;

const replaceDailyLogQuery = `      SELECT
          TO_CHAR(d.date, 'YYYY-MM-DD') AS attendance_date,
          e.id AS employee_id,
          e.name,
          e.employee_code,
          dep.department_name,
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
      LEFT JOIN departments dep ON e.department_id = dep.id
      LEFT JOIN attendance_summary a
          ON a.employee_id = e.id AND a.attendance_date = d.date
      LEFT JOIN leave_requests lr
          ON lr.employee_id = e.id
          AND lr.status = 'APPROVED'
          AND d.date >= lr.start_date AND d.date <= lr.end_date
      LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
      LEFT JOIN company_holidays h ON h.holiday_date = d.date
      WHERE e.is_active = true AND e.id != 1
      ORDER BY d.date DESC, e.name ASC`;

code = code.replace(targetDailyLogQuery, replaceDailyLogQuery);
fs.writeFileSync('backend/controllers/reportController.js', code);
console.log('Patched getAttendanceReport to include department_name');
