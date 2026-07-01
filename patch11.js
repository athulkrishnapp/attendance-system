const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/RequestLeave.jsx', 'utf8');

const target1 = `              <td style={styles.td}>
                <div style={{color: "var(--text-main)", fontWeight: "600", fontSize: "14px"}}>
                  {l.start_date === l.end_date 
                    ? new Date(l.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : \`\${new Date(l.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - \${new Date(l.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}\`
                  }
                </div>
                <div style={{fontSize: "12px", color: "var(--text-muted)", marginTop: "6px", fontWeight: "500"}}>{l.total_days} Days</div>
              </td>`;

const replacement1 = `              <td style={styles.td}>
                <div style={{color: "var(--text-main)", fontWeight: "600", fontSize: "14px"}}>
                  {l.start_date === l.end_date ? (
                    <div>{new Date(l.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div>{new Date(l.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      <div style={{ color: '#94a3b8', fontSize: '11px', fontStyle: 'italic' }}>to</div>
                      <div>{new Date(l.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    </div>
                  )}
                </div>
                <div style={{fontSize: "12px", color: "#6366f1", marginTop: "8px", fontWeight: "700", backgroundColor: "#e0e7ff", display: "inline-block", padding: "2px 8px", borderRadius: "12px"}}>{l.total_days} {l.total_days === 1 || l.total_days === 0.5 ? 'Day' : 'Days'}</div>
              </td>`;

const target2 = `              <td style={styles.td}>
                <div style={{color: "var(--text-main)", fontWeight: "600", fontSize: "14px"}}>
                  {new Date(r.attendance_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                <div style={{fontSize: "12px", color: "var(--text-muted)", marginTop: "6px", fontWeight: "500"}}>{r.core_status || 'Unknown'}</div>
              </td>`;

const replacement2 = `              <td style={styles.td}>
                <div style={{color: "var(--text-main)", fontWeight: "600", fontSize: "14px"}}>
                  {new Date(r.attendance_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                <div style={{fontSize: "12px", color: "#6366f1", marginTop: "8px", fontWeight: "700", backgroundColor: "#e0e7ff", display: "inline-block", padding: "2px 8px", borderRadius: "12px"}}>{r.core_status || 'Unknown'}</div>
              </td>`;

const target3 = `                <div style={{color: "var(--text-main)", fontWeight: "700", fontSize: "14px"}}>
                  {r.requested_first_in ? r.requested_first_in.substring(0, 5) : '-'} to {r.requested_last_out ? r.requested_last_out.substring(0, 5) : '-'}
                </div>
                <div style={{fontSize: "12px", color: "var(--text-muted)", marginTop: "6px"}}>Requested Timings</div>`;

const replacement3 = `                <div style={{color: "var(--text-main)", fontWeight: "700", fontSize: "14px", display: "flex", flexDirection: "column", gap: "2px"}}>
                  <div>{r.requested_first_in ? r.requested_first_in.substring(0, 5) : '-'}</div>
                  <div style={{ color: '#94a3b8', fontSize: '11px', fontStyle: 'italic', fontWeight: "normal" }}>to</div>
                  <div>{r.requested_last_out ? r.requested_last_out.substring(0, 5) : '-'}</div>
                </div>
                <div style={{fontSize: "12px", color: "var(--text-muted)", marginTop: "8px"}}>Requested Timings</div>`;

content = content.replace(target1, replacement1);
content = content.replace(target2, replacement2);
content = content.replace(target3, replacement3);
fs.writeFileSync('frontend/src/pages/RequestLeave.jsx', content);
console.log("Patched RequestLeave.jsx Date Range spacing");
