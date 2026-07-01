const fs = require('fs');

const target1 = `<th style={styles.th}>Times</th>`;
const replacement1 = `<th style={styles.th}>Request Tracking</th>`;

const target2 = `              <td style={styles.td}>
                <div style={{fontSize: "12px", color: "var(--text-muted)"}}>
                  <div><strong>Sent:</strong> {new Date(l.applied_on).toLocaleString()}</div>
                  {l.forwarded_at && <div><strong>Fwd:</strong> {new Date(l.forwarded_at).toLocaleString()}</div>}
                  {l.resolved_at && <div><strong>Resolved:</strong> {new Date(l.resolved_at).toLocaleString()}</div>}
                </div>
              </td>`;

const replacement2 = `              <td style={styles.td}>
                <div style={{fontSize: "13px", color: "var(--text-main)", display: "flex", flexDirection: "column", gap: "6px"}}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    Sent
                    <span title={new Date(l.applied_on).toLocaleString()} style={styles.infoIcon}>i</span>
                  </div>
                  {l.forwarded_at && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      Fwd: Mgr
                      <span title={new Date(l.forwarded_at).toLocaleString()} style={styles.infoIcon}>i</span>
                    </div>
                  )}
                  {l.resolved_at && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      Resolved
                      <span title={new Date(l.resolved_at).toLocaleString()} style={styles.infoIcon}>i</span>
                    </div>
                  )}
                </div>
              </td>`;

const target3 = `            <th style={styles.th}>Updates</th>`;
const replacement3 = `            <th style={styles.th}>Request Tracking</th>`;

const target4 = `              <td style={styles.td}>
                <div style={{fontSize: "12px", color: "var(--text-muted)"}}>
                  <div><strong>Sent:</strong> {new Date(r.applied_on).toLocaleString()}</div>
                  {r.processed_on && <div><strong>Processed:</strong> {new Date(r.processed_on).toLocaleString()}</div>}
                </div>
              </td>`;

const replacement4 = `              <td style={styles.td}>
                <div style={{fontSize: "13px", color: "var(--text-main)", display: "flex", flexDirection: "column", gap: "6px"}}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    Sent
                    <span title={new Date(r.applied_on).toLocaleString()} style={styles.infoIcon}>i</span>
                  </div>
                  {r.processed_on && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      Resolved
                      <span title={new Date(r.processed_on).toLocaleString()} style={styles.infoIcon}>i</span>
                    </div>
                  )}
                </div>
              </td>`;

const target5 = `  errorMsg: { padding: "14px", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "8px", fontSize: "14px", marginBottom: "20px", border: "1px solid #fecaca", fontWeight: "500" }`;
const replacement5 = `  errorMsg: { padding: "14px", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "8px", fontSize: "14px", marginBottom: "20px", border: "1px solid #fecaca", fontWeight: "500" },
  infoIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    backgroundColor: '#e2e8f0',
    color: '#64748b',
    fontSize: '10px',
    fontWeight: 'bold',
    cursor: 'help',
    fontStyle: 'italic'
  }`;

let content = fs.readFileSync('frontend/src/pages/RequestLeave.jsx', 'utf8');
content = content.replace(target1, replacement1);
content = content.replace(target2, replacement2);
content = content.replace(target3, replacement3);
content = content.replace(target4, replacement4);
content = content.replace(target5, replacement5);
fs.writeFileSync('frontend/src/pages/RequestLeave.jsx', content);
console.log("Patched RequestLeave.jsx");
