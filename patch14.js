const fs = require('fs');
let content = fs.readFileSync('backend/controllers/attendanceController.js', 'utf8');

const targetQuery = `    const result = await pool.query(\`
      SELECT r.*, e.name as employee_name, e.employee_code, m.name as forwarded_by_name,
             e.manager_id as employee_manager_id,
             m.manager_id as forwarder_manager_id
      FROM regularization_requests r
      JOIN employees e ON r.employee_id = e.id
      LEFT JOIN employees m ON r.forwarded_by_id = m.id
      \${whereClause}
      ORDER BY r.applied_on ASC
    \`, queryParams);`;

const replacementQuery = `    const result = await pool.query(\`
      SELECT r.*, e.name as employee_name, e.employee_code, m.name as forwarded_by_name,
             e.manager_id as employee_manager_id,
             m.manager_id as forwarder_manager_id,
             ans.first_in as actual_first_in, ans.last_out as actual_last_out,
             ans.attendance_date, ans.core_status, ans.modifier_flags
      FROM regularization_requests r
      JOIN employees e ON r.employee_id = e.id
      LEFT JOIN employees m ON r.forwarded_by_id = m.id
      LEFT JOIN attendance_summary ans ON r.attendance_summary_id = ans.id
      \${whereClause}
      ORDER BY r.applied_on ASC
    \`, queryParams);`;
content = content.replace(targetQuery, replacementQuery);
fs.writeFileSync('backend/controllers/attendanceController.js', content);
console.log("Patched attendanceController.js");

let inbox = fs.readFileSync('frontend/src/pages/ApprovalsInbox.jsx', 'utf8');

const targetInboxHeaders = `                  {activeTab === 'regularizations' && (
                    <tr>
                      <th style={styles.th}>Employee</th>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Actual Swipes</th>
                      <th style={styles.th}>Requested Times</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  )}`;

const replacementInboxHeaders = `                  {activeTab === 'regularizations' && (
                    <tr>
                      <th style={styles.th}>Employee</th>
                      <th style={styles.th}>Date & Problem</th>
                      <th style={styles.th}>Description (Reason)</th>
                      <th style={styles.th}>Actual vs Requested</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  )}`;
inbox = inbox.replace(targetInboxHeaders, replacementInboxHeaders);

const targetInboxCells = `                      {activeTab === 'regularizations' && (
                        <>
                          <td style={styles.td}>{new Date(item.attendance_date || item.applied_on).toLocaleDateString()}</td>
                          <td style={styles.td}>
                            In: {item.actual_first_in || '-'} <br/>
                            Out: {item.actual_last_out || '-'}
                          </td>
                          <td style={styles.td}>
                            In: <strong>{item.requested_first_in || '-'}</strong> <br/>
                            Out: <strong>{item.requested_last_out || '-'}</strong>
                          </td>
                        </>
                      )}`;

const replacementInboxCells = `                      {activeTab === 'regularizations' && (
                        <>
                          <td style={styles.td}>
                            <div style={{fontWeight: "600"}}>{new Date(item.attendance_date || item.applied_on).toLocaleDateString()}</div>
                            {item.core_status && (
                              <div style={{marginTop: "4px"}}>
                                <span style={{fontSize: "11px", backgroundColor: "#fee2e2", color: "#991b1b", padding: "2px 6px", borderRadius: "12px", fontWeight: "bold"}}>{item.core_status}</span>
                              </div>
                            )}
                            {item.modifier_flags && (
                              <div style={{marginTop: "2px", fontSize: "11px", color: "#b91c1c"}}>
                                {item.modifier_flags.replace(/[{}]/g, '').replace(/,/g, ', ')}
                              </div>
                            )}
                          </td>
                          <td style={styles.td}>
                            <div style={{fontSize: "13px", maxWidth: "200px", whiteSpace: "normal", wordWrap: "break-word"}}>{item.reason}</div>
                          </td>
                          <td style={styles.td}>
                            <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px", backgroundColor: "#f8fafc", padding: "8px", borderRadius: "6px"}}>
                              <div>
                                <div style={{color: "var(--text-muted)", marginBottom: "2px", fontSize: "11px"}}>Actual</div>
                                <div>In: {item.actual_first_in ? item.actual_first_in.substring(0,5) : '-'}</div>
                                <div>Out: {item.actual_last_out ? item.actual_last_out.substring(0,5) : '-'}</div>
                              </div>
                              <div>
                                <div style={{color: "var(--text-muted)", marginBottom: "2px", fontSize: "11px"}}>Requested</div>
                                <div style={{fontWeight: "bold", color: "var(--primary)"}}>In: {item.requested_first_in ? item.requested_first_in.substring(0,5) : '-'}</div>
                                <div style={{fontWeight: "bold", color: "var(--primary)"}}>Out: {item.requested_last_out ? item.requested_last_out.substring(0,5) : '-'}</div>
                              </div>
                            </div>
                          </td>
                        </>
                      )}`;
inbox = inbox.replace(targetInboxCells, replacementInboxCells);

fs.writeFileSync('frontend/src/pages/ApprovalsInbox.jsx', inbox);
console.log("Patched ApprovalsInbox.jsx");
