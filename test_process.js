const scans = [
  { employee_id: 4, scan_time: new Date('2026-06-08T08:00:00.000Z') },
  { employee_id: 4, scan_time: new Date('2026-06-08T12:30:00.000Z') }
];
const settings = { shift_start_time: '09:00:00' };
const empIdMap = {
  4: { shift_start_time: '09:00:00', grace_period_minutes: 15, required_working_hours: 9, shift_end_time: '18:00:00', half_day_mark_time: '13:00:00' }
};

const dailySummaries = {};
for (const { employee_id, scan_time } of scans) {
  const empInfo = empIdMap[employee_id];
  const shiftStartStr = empInfo.shift_start_time || settings.shift_start_time || '09:00:00';
  const [shiftHr, shiftMin] = shiftStartStr.split(':').map(Number);
  
  let logicalDateObj = new Date(scan_time);
  const boundary = new Date(
    scan_time.getFullYear(), scan_time.getMonth(), scan_time.getDate(),
    shiftHr, shiftMin, 0
  );
  boundary.setHours(boundary.getHours() - 4); // 4-hour pre-shift window
  if (scan_time < boundary) {
    logicalDateObj.setDate(logicalDateObj.getDate() - 1);
  }

  const dateKey = `${logicalDateObj.getFullYear()}-${String(logicalDateObj.getMonth() + 1).padStart(2, '0')}-${String(logicalDateObj.getDate()).padStart(2, '0')}`;
  const key = `${employee_id}_${dateKey}`;
  if (!dailySummaries[key]) {
    dailySummaries[key] = { employee_id, attendance_date: dateKey, scans: [] };
  }
  dailySummaries[key].scans.push(scan_time);
}

for (const key in dailySummaries) {
    const record = dailySummaries[key];
    console.log("Date:", record.attendance_date);
    record.scans.sort((a, b) => a - b);
    let firstIn = record.scans[0];
    let lastOut = record.scans[record.scans.length - 1];
    console.log("First In:", firstIn);
    console.log("Last Out:", lastOut);
}
