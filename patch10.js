const fs = require('fs');

const target1 = `            const portionText = l.leave_portion ? l.leave_portion.replace('_', ' ') : l.duration;
            const portionDisplay = l.leave_portion === 'HOURLY' ? \` (\${l.hourly_duration}h)\` : \` (\${portionText})\`;
            
            return (
            <tr key={l.id} style={styles.tr}>
              <td style={styles.td}>
                {l.start_date === l.end_date 
                  ? new Date(l.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                  : \`\${new Date(l.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - \${new Date(l.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}\`
                }
                <div style={{fontSize: "12px", color: "var(--text-muted)", marginTop: "4px"}}>{l.total_days} Days</div>
              </td>
              <td style={styles.td}>
                <strong style={{color: "var(--text-main)"}}>{l.leave_type_name || l.leave_type || 'Unknown'} {portionDisplay}</strong>
              </td>`;

const replacement1 = `            const portionText = l.leave_portion ? l.leave_portion.replace('_', ' ') : l.duration;
            const hourlyText = l.leave_portion === 'HOURLY' ? \` - \${l.hourly_duration}h\` : '';
            
            return (
            <tr key={l.id} style={styles.tr}>
              <td style={styles.td}>
                <div style={{color: "var(--text-main)", fontWeight: "600", fontSize: "14px"}}>
                  {l.start_date === l.end_date 
                    ? new Date(l.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : \`\${new Date(l.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - \${new Date(l.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}\`
                  }
                </div>
                <div style={{fontSize: "12px", color: "var(--text-muted)", marginTop: "6px", fontWeight: "500"}}>{l.total_days} Days</div>
              </td>
              <td style={styles.td}>
                <div style={{color: "var(--text-main)", fontWeight: "700", fontSize: "14px"}}>{l.leave_type_name || l.leave_type || 'Unknown'}</div>
                <div style={{fontSize: "12px", color: "var(--text-muted)", marginTop: "6px"}}>{portionText}{hourlyText}</div>
              </td>`;

const target2 = `              <td style={styles.td}>
                <div style={{fontSize: "12px", color: "var(--text-muted)"}}>
                  {l.reason}
                </div>
              </td>`;

const replacement2 = `              <td style={styles.td}>
                <div style={{fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.5", maxWidth: "250px"}}>
                  {l.reason}
                </div>
              </td>`;

const target3 = `              <td style={styles.td}>
                <div style={{fontSize: "12px", color: "var(--text-muted)"}}>
                  {l.resolution_remarks ? l.resolution_remarks : '-'}
                </div>
              </td>`;

const replacement3 = `              <td style={styles.td}>
                <div style={{fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.5", maxWidth: "250px"}}>
                  {l.resolution_remarks ? l.resolution_remarks : '-'}
                </div>
              </td>`;

const target4 = `              <td style={styles.td}>
                {new Date(r.attendance_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                <div style={{fontSize: "12px", color: "var(--text-muted)", marginTop: "4px"}}>{r.core_status || 'Unknown'}</div>
              </td>
              <td style={styles.td}>
                <div style={{fontWeight: '600', color: "var(--text-main)"}}>
                  {r.requested_first_in || '-'} to {r.requested_last_out || '-'}
                </div>
              </td>`;

const replacement4 = `              <td style={styles.td}>
                <div style={{color: "var(--text-main)", fontWeight: "600", fontSize: "14px"}}>
                  {new Date(r.attendance_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                <div style={{fontSize: "12px", color: "var(--text-muted)", marginTop: "6px", fontWeight: "500"}}>{r.core_status || 'Unknown'}</div>
              </td>
              <td style={styles.td}>
                <div style={{color: "var(--text-main)", fontWeight: "700", fontSize: "14px"}}>
                  {r.requested_first_in ? r.requested_first_in.substring(0, 5) : '-'} to {r.requested_last_out ? r.requested_last_out.substring(0, 5) : '-'}
                </div>
                <div style={{fontSize: "12px", color: "var(--text-muted)", marginTop: "6px"}}>Requested Timings</div>
              </td>`;

const target5 = `              <td style={styles.td}>
                <div style={{fontSize: "12px", color: "var(--text-muted)"}}>{r.reason}</div>
              </td>`;

const replacement5 = `              <td style={styles.td}>
                <div style={{fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.5", maxWidth: "250px"}}>{r.reason}</div>
              </td>`;

const target6 = `              <td style={styles.td}>
                <div style={{fontSize: "12px", color: "var(--text-muted)"}}>{r.manager_remarks || '-'}</div>
              </td>`;

const replacement6 = `              <td style={styles.td}>
                <div style={{fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.5", maxWidth: "250px"}}>{r.manager_remarks || '-'}</div>
              </td>`;

const target7 = `  th: { padding: "16px 25px", backgroundColor: "#f8fafc", fontSize: "13px", color: "var(--text-muted)", borderBottom: "1px solid var(--border)", textAlign: "left", textTransform: "uppercase", fontWeight: "600" },
  tr: { borderBottom: "1px solid var(--border)", transition: "background-color 0.2s" },
  td: { padding: "16px 25px", color: "var(--text-main)", fontSize: "14px", verticalAlign: "middle" },`;

const replacement7 = `  th: { padding: "18px 25px", backgroundColor: "#f8fafc", fontSize: "13px", color: "var(--text-muted)", borderBottom: "1px solid #e2e8f0", textAlign: "left", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.5px" },
  tr: { borderBottom: "1px solid #f1f5f9", transition: "background-color 0.2s" },
  td: { padding: "24px 25px", color: "var(--text-main)", fontSize: "14px", verticalAlign: "top" },`;

let content = fs.readFileSync('frontend/src/pages/RequestLeave.jsx', 'utf8');
content = content.replace(target1, replacement1);
content = content.replace(target2, replacement2);
content = content.replace(target3, replacement3);
content = content.replace(target4, replacement4);
content = content.replace(target5, replacement5);
content = content.replace(target6, replacement6);
content = content.replace(target7, replacement7);
fs.writeFileSync('frontend/src/pages/RequestLeave.jsx', content);
console.log("Patched RequestLeave.jsx spacing");
