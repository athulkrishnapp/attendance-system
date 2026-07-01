const pool = require('./backend/db');
const { calculateAttendance } = require('./backend/utils/ruleEngine');

async function recalculateDailyAttendance(employee_id, dateKey, firstIn, lastOut, workingHours) {
  const settingsRes = await pool.query("SELECT * FROM company_settings LIMIT 1");
  const settings = settingsRes.rows[0] || {
    shift_start_time: '09:00:00', shift_end_time: '18:00:00',
    grace_period_minutes: 15, required_working_hours: 8
  };

  const empRes = await pool.query(`
    SELECT e.id, s.shift_start_time, s.shift_end_time, s.grace_period_minutes, s.required_working_hours, s.half_day_mark_time
    FROM employees e
    LEFT JOIN shifts s ON e.shift_id = s.id
    WHERE e.id = $1
  `, [employee_id]);
  const empInfo = empRes.rows[0];

  const holidaysRes = await pool.query("SELECT holiday_date, description FROM company_holidays");
  const holidayMap = {};
  holidaysRes.rows.forEach(h => {
    holidayMap[h.holiday_date.toISOString().split('T')[0]] = h.description;
  });

  const leavesRes = await pool.query(`
    SELECT employee_id, start_date, end_date, duration, leave_portion 
    FROM leave_requests WHERE status = 'APPROVED' AND employee_id = $1
  `, [employee_id]);
  const leaveMap = {};
  leavesRes.rows.forEach(l => {
    let current = new Date(l.start_date);
    const end = new Date(l.end_date);
    while (current <= end) {
      const dStr = current.toISOString().split('T')[0];
      leaveMap[dStr] = { duration: l.duration, leave_portion: l.leave_portion };
      current.setDate(current.getDate() + 1);
    }
  });

  const shiftStartTime  = empInfo?.shift_start_time  || settings.shift_start_time  || '09:00:00';
  const gracePeriod     = (empInfo?.grace_period_minutes  != null) ? empInfo.grace_period_minutes  : settings.grace_period_minutes;
  const requiredHours   = (empInfo?.required_working_hours != null) ? parseFloat(empInfo.required_working_hours) : parseFloat(settings.required_working_hours);
  const shiftEndHrStr   = empInfo?.shift_end_time    || settings.shift_end_time    || '18:00:00';
  const halfDayMark     = empInfo?.half_day_mark_time || '13:00:00';

  const [logicalYear, logicalMonth, logicalDay] = dateKey.split('-').map(Number);
  const [sHr, sMin] = shiftStartTime.split(':').map(Number);
  const [eHr, eMin] = shiftEndHrStr.split(':').map(Number);
  const [hHr, hMin] = halfDayMark.split(':').map(Number);

  const expectedStartDate      = new Date(logicalYear, logicalMonth - 1, logicalDay, sHr, sMin, 0);
  const maxGraceDate           = new Date(expectedStartDate.getTime() + gracePeriod * 60000);
  const expectedEndDate        = new Date(logicalYear, logicalMonth - 1, logicalDay, eHr, eMin, 0);
  const halfDayThresholdDate   = new Date(logicalYear, logicalMonth - 1, logicalDay, hHr, hMin, 0);
  const refDate                = new Date(logicalYear, logicalMonth - 1, logicalDay);

  const holidayName  = holidayMap[dateKey];
  const workingDays  = settings.working_days || [1, 2, 3, 4, 5, 6];
  const isWeekend    = !workingDays.includes(refDate.getDay());
  const approvedLeave = leaveMap[dateKey];

  const firstInDate = firstIn ? new Date(`${dateKey}T${firstIn}Z`) : null;
  const lastOutDate = lastOut ? new Date(`${dateKey}T${lastOut}Z`) : null;

  return calculateAttendance({
    firstIn: firstInDate, lastOut: lastOutDate, workingHours,
    expectedStartDate, expectedEndDate, halfDayThresholdDate,
    maxGraceDate, requiredHours, isWeekend, holidayName, approvedLeave
  });
}

async function run() {
  const res = await pool.query("SELECT * FROM attendance_summary WHERE regularization_status = 'APPROVED' AND core_status IN ('ABSENT', 'MISSING_PUNCH')");
  console.log(`Found ${res.rows.length} stuck regularized records`);

  for (let summary of res.rows) {
    const dateKey = summary.attendance_date.toISOString().split('T')[0];
    const { core_status, modifier_flags } = await recalculateDailyAttendance(
      summary.employee_id, dateKey, summary.first_in, summary.last_out, summary.working_hours
    );

    let newFlags = modifier_flags || [];
    let oldFlags = [];
    try {
        if (summary.modifier_flags) {
            oldFlags = typeof summary.modifier_flags === 'string' ? JSON.parse(summary.modifier_flags) : summary.modifier_flags;
        }
    } catch(e) {}
    
    oldFlags.forEach(f => {
      if (f.startsWith('PREV_') && !newFlags.includes(f)) {
        newFlags.push(f);
      }
    });

    if (!newFlags.includes('REGULARIZED')) newFlags.push('REGULARIZED');
    
    // Always make sure we don't duplicate PREV_
    let finalFlags = Array.from(new Set(newFlags));

    await pool.query(
      `UPDATE attendance_summary
       SET core_status = $1, modifier_flags = $2::jsonb
       WHERE id = $3`,
      [core_status, JSON.stringify(finalFlags), summary.id]
    );
    console.log(`Fixed record ID ${summary.id}: changed ${summary.core_status} -> ${core_status}`);
  }
  process.exit(0);
}

run();
