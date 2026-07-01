const fs = require('fs');

const data = `employee_code,scan_time,device_id
EMP002,2026-06-08 08:55:00,GATE_1
EMP004,2026-06-08 13:30:00,GATE_1
EMP005,2026-06-08 09:00:00,GATE_1
EMP003,2026-06-08 09:20:00,GATE_1
EMP004,2026-06-08 18:00:00,GATE_1
EMP005,2026-06-08 18:00:00,GATE_1
EMP002,2026-06-08 18:10:00,GATE_1
EMP003,2026-06-08 19:30:00,GATE_1`;

const rows = data.split('\n').slice(1).map(line => {
  const [employee_code, scan_time, device_id] = line.split(',');
  return { employee_code, scan_time, device_id };
});

const scans = [];
for (const row of rows) {
  const cleanedStr = row.scan_time.trim().replace(/\//g, '-');
  const [datePart, timePart] = cleanedStr.split(' ');
  let scanDateObj;
  if (datePart && timePart) {
    let [p1, p2, p3] = datePart.split('-');
    let year, month, day;
    if (p1.length === 4) {
      year = p1; month = p2; day = p3;
    } else if (p3 && p3.length === 4) {
      day = p1; month = p2; year = p3;
    } else {
      year = p1; month = p2; day = p3;
    }
    const [hour, minute, second] = timePart.split(':');
    scanDateObj = new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
  } else {
    scanDateObj = new Date(row.scan_time);
  }
  scans.push({ employee_code: row.employee_code, scanDateObj });
}

console.log(scans);
