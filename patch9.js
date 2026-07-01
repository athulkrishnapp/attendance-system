const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/RequestLeave.jsx', 'utf8');

const target2 = `              <td style={styles.td}>
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

const replacement2 = `              <td style={styles.td}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                  
                  {/* Step 1: Sent */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#3b82f6', marginTop: '4px' }}></div>
                      {(l.forwarded_at || l.resolved_at) && <div style={{ width: '2px', flexGrow: 1, backgroundColor: '#e2e8f0', minHeight: '15px', margin: '2px 0' }}></div>}
                    </div>
                    <div style={{ paddingBottom: (l.forwarded_at || l.resolved_at) ? '8px' : '0' }}>
                      <div style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: '600', lineHeight: '1.2' }}>Sent</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{new Date(l.applied_on).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>

                  {/* Step 2: Forwarded */}
                  {l.forwarded_at && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#8b5cf6', marginTop: '4px' }}></div>
                        {l.resolved_at && <div style={{ width: '2px', flexGrow: 1, backgroundColor: '#e2e8f0', minHeight: '15px', margin: '2px 0' }}></div>}
                      </div>
                      <div style={{ paddingBottom: l.resolved_at ? '8px' : '0' }}>
                        <div style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: '600', lineHeight: '1.2' }}>Forwarded by Mgr</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{new Date(l.forwarded_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Resolved */}
                  {l.resolved_at && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: l.status === 'APPROVED' ? '#10b981' : '#ef4444', marginTop: '4px' }}></div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: '600', lineHeight: '1.2' }}>Resolved</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{new Date(l.resolved_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  )}

                </div>
              </td>`;

const target4 = `              <td style={styles.td}>
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

const replacement4 = `              <td style={styles.td}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                  
                  {/* Step 1: Sent */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#3b82f6', marginTop: '4px' }}></div>
                      {r.processed_on && <div style={{ width: '2px', flexGrow: 1, backgroundColor: '#e2e8f0', minHeight: '15px', margin: '2px 0' }}></div>}
                    </div>
                    <div style={{ paddingBottom: r.processed_on ? '8px' : '0' }}>
                      <div style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: '600', lineHeight: '1.2' }}>Sent</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{new Date(r.applied_on).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>

                  {/* Step 2: Resolved */}
                  {r.processed_on && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: r.status === 'APPROVED' ? '#10b981' : '#ef4444', marginTop: '4px' }}></div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: '600', lineHeight: '1.2' }}>Resolved</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{new Date(r.processed_on).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  )}

                </div>
              </td>`;

content = content.replace(target2, replacement2);
content = content.replace(target4, replacement4);
fs.writeFileSync('frontend/src/pages/RequestLeave.jsx', content);
console.log("Patched RequestLeave.jsx again");
