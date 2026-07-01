const fs = require('fs');
let code = fs.readFileSync('backend/controllers/reportController.js', 'utf8');

const targetQuery = `      SELECT 
        e.id as employee_id,
        e.employee_code,
        e.name,
        d.department_name,
        COUNT(a.id) FILTER (WHERE a.core_status = 'PRESENT' OR a.core_status = 'HALF_DAY') as total_present,
        COUNT(a.id) FILTER (WHERE a.core_status = 'ABSENT') as total_absent,
        COUNT(a.id) FILTER (WHERE a.core_status = 'LEAVE' OR a.core_status = 'HALF_DAY') as total_leaves,
        COUNT(a.id) FILTER (WHERE a.core_status = 'MISSING_PUNCH') as missing_punches,
        SUM(COALESCE(a.working_hours, 0)) as total_working_hours
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN attendance_summary a ON e.id = a.employee_id AND TO_CHAR(a.attendance_date, 'YYYY-MM') = $1
      WHERE e.is_active = true AND e.id != 1
      GROUP BY e.id, e.employee_code, e.name, d.department_name
      ORDER BY e.employee_code ASC`;

const replacementQuery = `      SELECT 
        e.id as employee_id,
        e.employee_code,
        e.name,
        d.department_name,
        COUNT(a.id) FILTER (WHERE a.core_status = 'PRESENT' OR a.core_status = 'HALF_DAY') as total_present,
        COUNT(a.id) FILTER (WHERE a.core_status = 'ABSENT') as total_absent,
        COUNT(a.id) FILTER (WHERE a.core_status = 'LEAVE' OR a.core_status = 'HALF_DAY') as total_leaves,
        COUNT(a.id) FILTER (WHERE a.core_status = 'MISSING_PUNCH') as missing_punches,
        COUNT(a.id) FILTER (
          WHERE a.core_status IN ('PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'MISSING_PUNCH') 
          OR (a.core_status IN ('WEEKEND', 'HOLIDAY') AND (a.modifier_flags ? 'WEEKEND_WORK' OR a.modifier_flags ? 'HOLIDAY_WORK' OR a.working_hours > 0))
        ) as total_working_days,
        COUNT(a.id) FILTER (
          WHERE a.core_status IN ('WEEKEND', 'HOLIDAY') 
          AND NOT (a.modifier_flags ? 'WEEKEND_WORK' OR a.modifier_flags ? 'HOLIDAY_WORK' OR a.working_hours > 0)
        ) as non_working_days,
        SUM(COALESCE(a.working_hours, 0)) as total_working_hours
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN attendance_summary a ON e.id = a.employee_id AND TO_CHAR(a.attendance_date, 'YYYY-MM') = $1
      WHERE e.is_active = true AND e.id != 1
      GROUP BY e.id, e.employee_code, e.name, d.department_name
      ORDER BY e.employee_code ASC`;

code = code.replace(targetQuery, replacementQuery);
fs.writeFileSync('backend/controllers/reportController.js', code);
console.log('Patched getMasterReport query');
