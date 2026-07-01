const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/RequestLeave.jsx', 'utf8');

const target1 = `              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => setShowApplyModal(true)} 
                  style={{...styles.activeTabBtn, backgroundColor: '#10b981'}}
                >+ Apply for Leave</button>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>`;

const replacement1 = `              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => setShowApplyModal(true)} 
                  style={{...styles.activeTabBtn, backgroundColor: '#10b981'}}
                >+ Apply for Leave</button>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', marginTop: '10px' }}>`;
content = content.replace(target1, replacement1);

const targetTitle = `  pageTitle: { margin: "0 0 5px 0", fontSize: "24px", color: "var(--text-main)", fontWeight: "700" },
  pageSubtitle: { margin: "0", fontSize: "14px", color: "var(--text-muted)" },`;

const replacementTitle = `  pageTitle: { margin: "0 0 8px 0", fontSize: "24px", color: "var(--text-main)", fontWeight: "700" },
  pageSubtitle: { margin: "0", fontSize: "14px", color: "var(--text-muted)", marginBottom: "15px" },`;
content = content.replace(targetTitle, replacementTitle);

const targetPadding = `  td: { padding: "24px 25px", color: "var(--text-main)", fontSize: "14px", verticalAlign: "top" },`;
const replacementPadding = `  td: { padding: "16px 20px", color: "var(--text-main)", fontSize: "14px", verticalAlign: "middle" },`;
content = content.replace(targetPadding, replacementPadding);

const targetDateLeave = `              <td style={styles.td}>
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

const replacementDateLeave = `              <td style={styles.td}>
                <div style={{color: "var(--text-main)", fontWeight: "600", fontSize: "14px", whiteSpace: "nowrap"}}>
                  {l.start_date === l.end_date 
                    ? new Date(l.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : \`\${new Date(l.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - \${new Date(l.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}\`
                  }
                </div>
                <div style={{fontSize: "12px", color: "#6366f1", marginTop: "6px", fontWeight: "700", backgroundColor: "#e0e7ff", display: "inline-block", padding: "2px 8px", borderRadius: "12px"}}>{l.total_days} {l.total_days === 1 || l.total_days === 0.5 ? 'Day' : 'Days'}</div>
              </td>`;
content = content.replace(targetDateLeave, replacementDateLeave);


const targetRegTimes = `              <td style={styles.td}>
                <div style={{color: "var(--text-main)", fontWeight: "700", fontSize: "14px", display: "flex", flexDirection: "column", gap: "2px"}}>
                  <div>{r.requested_first_in ? r.requested_first_in.substring(0, 5) : '-'}</div>
                  <div style={{ color: '#94a3b8', fontSize: '11px', fontStyle: 'italic', fontWeight: "normal" }}>to</div>
                  <div>{r.requested_last_out ? r.requested_last_out.substring(0, 5) : '-'}</div>
                </div>
                <div style={{fontSize: "12px", color: "var(--text-muted)", marginTop: "8px"}}>Requested Timings</div>
              </td>`;

const replacementRegTimes = `              <td style={styles.td}>
                <div style={{color: "var(--text-main)", fontWeight: "700", fontSize: "14px", whiteSpace: "nowrap"}}>
                  {r.requested_first_in ? r.requested_first_in.substring(0, 5) : '-'} to {r.requested_last_out ? r.requested_last_out.substring(0, 5) : '-'}
                </div>
              </td>`;
content = content.replace(targetRegTimes, replacementRegTimes);

fs.writeFileSync('frontend/src/pages/RequestLeave.jsx', content);
console.log("Patched RequestLeave.jsx row styling");
