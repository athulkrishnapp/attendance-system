const fs = require('fs');
const content = fs.readFileSync('backend/controllers/attendanceController.js', 'utf8');

const target1 = `  // Group scans by employee_id + logical date
  const dailySummaries = {};
  for (const { employee_id, scan_time } of scans) {
    const empInfo = empIdMap[employee_id];
    if (!empInfo) continue;`;

const replacement1 = `  // Group scans by employee_id + logical date
  const dailySummaries = {};
  const uniqueDates = new Set();
  for (const { employee_id, scan_time } of scans) {
    const empInfo = empIdMap[employee_id];
    if (!empInfo) continue;`;

const target2 = `    const dateKey = \`\${logicalDateObj.getFullYear()}-\${String(logicalDateObj.getMonth() + 1).padStart(2, '0')}-\${String(logicalDateObj.getDate()).padStart(2, '0')}\`;
    const key = \`\${employee_id}_\${dateKey}\`;
    if (!dailySummaries[key]) {
      dailySummaries[key] = { employee_id, attendance_date: dateKey, scans: [] };
    }
    dailySummaries[key].scans.push(scan_time);
  }

  let count = 0;
  for (const key in dailySummaries) {`;

const replacement2 = `    const dateKey = \`\${logicalDateObj.getFullYear()}-\${String(logicalDateObj.getMonth() + 1).padStart(2, '0')}-\${String(logicalDateObj.getDate()).padStart(2, '0')}\`;
    uniqueDates.add(dateKey);
    const key = \`\${employee_id}_\${dateKey}\`;
    if (!dailySummaries[key]) {
      dailySummaries[key] = { employee_id, attendance_date: dateKey, scans: [] };
    }
    dailySummaries[key].scans.push(scan_time);
  }

  // Generate blank records for all active employees for all processed dates
  for (const dateKey of uniqueDates) {
    for (const empId in empIdMap) {
      const key = \`\${empId}_\${dateKey}\`;
      if (!dailySummaries[key]) {
        dailySummaries[key] = { employee_id: parseInt(empId, 10), attendance_date: dateKey, scans: [] };
      }
    }
  }

  let count = 0;
  for (const key in dailySummaries) {`;

let newContent = content.replace(target1, replacement1);
newContent = newContent.replace(target2, replacement2);

fs.writeFileSync('backend/controllers/attendanceController.js', newContent);
console.log("Patched attendanceController.js");
