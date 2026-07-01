const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'attendance_system', password: '123' });

async function run() {
  try {
    const monthPrefix = '2026-06';
    const settingsRes = await pool.query("SELECT working_days FROM company_settings LIMIT 1");
    const workingDays = settingsRes.rows[0]?.working_days || [1, 2, 3, 4, 5, 6];
    
    const startDate = new Date(`${monthPrefix}-01T00:00:00Z`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 0, 0, 0);
    const totalDaysInMonth = endDate.getDate();
    
    const holidaysRes = await pool.query("SELECT holiday_date FROM company_holidays WHERE TO_CHAR(holiday_date, 'YYYY-MM') = $1", [monthPrefix]);
    const holidayDates = holidaysRes.rows.map(r => r.holiday_date.toISOString().split('T')[0]);

    let totalWeekendsAndHolidays = 0;
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const current = new Date(startDate.getFullYear(), startDate.getMonth(), d);
      const isoDow = current.getDay() === 0 ? 7 : current.getDay();
      const dateStr = current.toISOString().split('T')[0];
      
      const isWeekend = !workingDays.includes(isoDow);
      const isHoliday = holidayDates.includes(dateStr);
      
      if (isWeekend || isHoliday) {
        totalWeekendsAndHolidays++;
      }
    }

    const pendingQuery = `
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
    `;
    const pendingRes = await pool.query(pendingQuery, [monthPrefix]);
    console.log(pendingRes.rows);

    console.log("Success");
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
