const xlsx = require('xlsx');
const workbook = xlsx.readFile('./uploads/attendance_excel_files/428c459f4ec934e48ef2176a29497535');
const sheetName = workbook.SheetNames[0];
const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

for (const row of data) {
  const d = String(row.scan_time);
  if (d.includes('2026-06-08') || d.includes('2026-06-09') || d.includes('2026-06-16')) {
    if (row.employee_code === 'EMP004' || row.employee_code === 'EMP005') {
       console.log(row.employee_code, d);
    }
  }
}
