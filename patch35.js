const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/AttendanceReport.jsx', 'utf8');

const tableHeaderTarget = `<th style={styles.th}>Department</th>
                      <th style={styles.th}>Present</th>
                      <th style={styles.th}>Absent</th>
                      <th style={styles.th}>Total Leaves</th>
                      <th style={styles.th}>Missing Punches</th>
                      <th style={styles.th}>Total Hrs</th>`;

const tableHeaderReplacement = `<th style={styles.th}>Department</th>
                      <th style={styles.th}>Total Working Days</th>
                      <th style={styles.th}>Present</th>
                      <th style={styles.th}>Absent</th>
                      <th style={styles.th}>Total Leaves</th>
                      <th style={styles.th}>Missing Punches</th>
                      <th style={styles.th}>Total Hrs</th>`;

code = code.replace(tableHeaderTarget, tableHeaderReplacement);

const tableRowTarget = `<td style={{ padding: "12px 20px" }}>{r.department_name || "-"}</td>
                        <td style={{ padding: "12px 20px", color: "#166534" }}>{r.total_present}</td>
                        <td style={{ padding: "12px 20px", color: "#991b1b" }}>{r.total_absent}</td>
                        <td style={{ padding: "12px 20px", color: "#d97706", fontWeight: "bold" }}>{r.total_leaves}</td>
                        <td style={{ padding: "12px 20px", color: "#dc2626" }}>{r.missing_punches}</td>
                        <td style={{ padding: "12px 20px" }}>{r.total_working_hours}</td>`;

const tableRowReplacement = `<td style={{ padding: "12px 20px" }}>{r.department_name || "-"}</td>
                        <td style={{ padding: "12px 20px", fontWeight: "bold" }}>{r.total_working_days || 0}</td>
                        <td style={{ padding: "12px 20px", color: "#166534" }}>{r.total_present}</td>
                        <td style={{ padding: "12px 20px", color: "#991b1b" }}>{r.total_absent}</td>
                        <td style={{ padding: "12px 20px", color: "#d97706", fontWeight: "bold" }}>{r.total_leaves}</td>
                        <td style={{ padding: "12px 20px", color: "#dc2626" }}>{r.missing_punches}</td>
                        <td style={{ padding: "12px 20px" }}>{r.total_working_hours}</td>`;

code = code.replace(tableRowTarget, tableRowReplacement);

fs.writeFileSync('frontend/src/pages/AttendanceReport.jsx', code);
console.log('AttendanceReport patched to add total working days column');
