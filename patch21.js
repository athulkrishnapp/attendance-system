const fs = require('fs');

// 1. Update RequestLeave.jsx
let reqLeave = fs.readFileSync('frontend/src/pages/RequestLeave.jsx', 'utf8');

const targetReqLeave = `              <td style={styles.td}>
                <div style={{color: "var(--text-main)", fontWeight: "600", fontSize: "14px"}}>
                  {new Date(r.attendance_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                <div style={{fontSize: "12px", color: "#6366f1", marginTop: "8px", fontWeight: "700", backgroundColor: "#e0e7ff", display: "inline-block", padding: "2px 8px", borderRadius: "12px"}}>{r.core_status || 'Unknown'}</div>
              </td>`;

const replacementReqLeave = `              <td style={styles.td}>
                <div style={{color: "var(--text-main)", fontWeight: "600", fontSize: "14px"}}>
                  {new Date(r.attendance_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                <div style={{fontSize: "12px", color: "#6366f1", marginTop: "8px", fontWeight: "700", backgroundColor: "#e0e7ff", display: "inline-block", padding: "2px 8px", borderRadius: "12px"}}>
                  {(() => {
                    let prevFlags = [];
                    try {
                      const mFlags = Array.isArray(r.modifier_flags) ? r.modifier_flags : (r.modifier_flags ? JSON.parse(r.modifier_flags) : []);
                      prevFlags = mFlags.filter(f => f.startsWith('PREV_')).map(f => f.replace('PREV_', ''));
                    } catch(e) {}
                    const currentStatus = r.core_status || 'Unknown';
                    if (prevFlags.length > 0) {
                      return (
                        <>
                          <span style={{ textDecoration: 'line-through', color: '#94a3b8', marginRight: '6px' }}>{prevFlags.join(', ')}</span>
                          → {currentStatus}
                        </>
                      );
                    }
                    return currentStatus;
                  })()}
                </div>
              </td>`;

reqLeave = reqLeave.replace(targetReqLeave, replacementReqLeave);
fs.writeFileSync('frontend/src/pages/RequestLeave.jsx', reqLeave);

// 2. Update ApprovalsInbox.jsx
let inbox = fs.readFileSync('frontend/src/pages/ApprovalsInbox.jsx', 'utf8');
const targetInbox = `                          <td style={styles.td}>
                            <div style={{fontWeight: "600"}}>{new Date(item.attendance_date || item.applied_on).toLocaleDateString()}</div>
                            {item.core_status && (
                              <div style={{marginTop: "4px"}}>
                                <span style={{fontSize: "11px", backgroundColor: "#fee2e2", color: "#991b1b", padding: "2px 6px", borderRadius: "12px", fontWeight: "bold"}}>{item.core_status}</span>
                              </div>
                            )}
                            {item.modifier_flags && String(item.modifier_flags).trim() !== '' && String(item.modifier_flags).trim() !== '{}' && (
                              <div style={{marginTop: "2px", fontSize: "11px", color: "#b91c1c"}}>
                                {Array.isArray(item.modifier_flags) ? item.modifier_flags.join(', ') : String(item.modifier_flags).replace(/[{}]/g, '').replace(/,/g, ', ')}
                              </div>
                            )}
                          </td>`;

const replacementInbox = `                          <td style={styles.td}>
                            <div style={{fontWeight: "600"}}>{new Date(item.attendance_date || item.applied_on).toLocaleDateString()}</div>
                            {(() => {
                              let prevFlags = [];
                              let currentFlags = [];
                              try {
                                const mFlags = Array.isArray(item.modifier_flags) ? item.modifier_flags : (item.modifier_flags && String(item.modifier_flags).trim() !== '{}' ? JSON.parse(String(item.modifier_flags).replace(/[{}]/g, '[]')) : []);
                                // Quick fix for Postgres string representations if it's "{LATE}" we should parse it correctly, but let's assume it's just JSON or array in our backend change.
                                // Actually backend now returns JSON.
                                const safeFlags = Array.isArray(mFlags) ? mFlags : (typeof item.modifier_flags === 'string' ? item.modifier_flags.replace(/[{}]/g, '').split(',').map(s=>s.trim()).filter(Boolean) : []);
                                prevFlags = safeFlags.filter(f => f.startsWith('PREV_')).map(f => f.replace('PREV_', ''));
                                currentFlags = safeFlags.filter(f => !f.startsWith('PREV_'));
                              } catch(e) {}
                              
                              const currentStatus = item.core_status;
                              return (
                                <>
                                  {currentStatus && (
                                    <div style={{marginTop: "4px"}}>
                                      <span style={{fontSize: "11px", backgroundColor: "#fee2e2", color: "#991b1b", padding: "2px 6px", borderRadius: "12px", fontWeight: "bold"}}>
                                        {prevFlags.length > 0 ? (
                                          <><span style={{ textDecoration: 'line-through', opacity: 0.7, marginRight: '4px' }}>{prevFlags.join(', ')}</span> → {currentStatus}</>
                                        ) : currentStatus}
                                      </span>
                                    </div>
                                  )}
                                  {currentFlags.length > 0 && (
                                    <div style={{marginTop: "2px", fontSize: "11px", color: "#b91c1c"}}>
                                      {currentFlags.join(', ')}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </td>`;

inbox = inbox.replace(targetInbox, replacementInbox);
fs.writeFileSync('frontend/src/pages/ApprovalsInbox.jsx', inbox);
console.log("Patched RequestLeave.jsx and ApprovalsInbox.jsx UI");
