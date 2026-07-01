const fs = require('fs');

let content = fs.readFileSync('frontend/src/pages/RequestLeave.jsx', 'utf8');

// 1. Add new state variables
const targetState = `  const [backendStats, setBackendStats] = useState(null);`;
const replacementState = `  const [backendStats, setBackendStats] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(null);`;
content = content.replace(targetState, replacementState);

// 2. Add isHistory parameter to renderRegTable
const targetRenderReg = `  const renderRegTable = (data) => (
    <div style={{ overflowY: "auto", maxHeight: "550px" }}>
      <table style={styles.table}>
        <thead style={styles.stickyHeader}>
          <tr>
            <th style={styles.th}>Date</th>
            <th style={styles.th}>Requested Times</th>
            <th style={styles.th}>Reason</th>
            <th style={styles.th}>Request Tracking</th>
            <th style={styles.th}>Manager Remarks</th>
            <th style={styles.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map(r => (
            <tr key={r.id} style={styles.tr}>`;
const replacementRenderReg = `  const renderRegTable = (data, isHistory) => (
    <div style={{ overflowY: "auto", maxHeight: "550px" }}>
      <table style={styles.table}>
        <thead style={styles.stickyHeader}>
          <tr>
            <th style={styles.th}>Date</th>
            <th style={styles.th}>Requested Times</th>
            {!isHistory && <th style={styles.th}>Reason</th>}
            {!isHistory && <th style={styles.th}>Request Tracking</th>}
            {!isHistory && <th style={styles.th}>Manager Remarks</th>}
            <th style={styles.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map(r => (
            <tr key={r.id} onClick={() => isHistory && setSelectedHistory({...r, type: 'REGULARIZATION'})} style={{...styles.tr, cursor: isHistory ? 'pointer' : 'default'}} 
                onMouseEnter={(e) => { if(isHistory) e.currentTarget.style.backgroundColor = '#f1f5f9' }}
                onMouseLeave={(e) => { if(isHistory) e.currentTarget.style.backgroundColor = 'transparent' }}>`;
content = content.replace(targetRenderReg, replacementRenderReg);

// Wrap Reason, Tracking, Remarks inside {!isHistory && ... } for REG
const targetRegCells = `              <td style={styles.td}>
                <div style={{fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.5", maxWidth: "250px"}}>{r.reason}</div>
              </td>
              <td style={styles.td}>
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
              </td>
              <td style={styles.td}>
                <div style={{fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.5", maxWidth: "250px"}}>{r.manager_remarks || '-'}</div>
              </td>`;

const replacementRegCells = `              {!isHistory && <td style={styles.td}>
                <div style={{fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.5", maxWidth: "250px"}}>{r.reason}</div>
              </td>}
              {!isHistory && <td style={styles.td}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
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
              </td>}
              {!isHistory && <td style={styles.td}>
                <div style={{fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.5", maxWidth: "250px"}}>{r.manager_remarks || '-'}</div>
              </td>}`;
content = content.replace(targetRegCells, replacementRegCells);

// Update renderTable for Leaves
const targetRenderLeave = `  const renderTable = (data) => (
    <div style={{ overflowY: "auto", maxHeight: "550px" }}>
      <table style={styles.table}>
        <thead style={styles.stickyHeader}>
          <tr>
            <th style={styles.th}>Date Range</th>
            <th style={styles.th}>Leave Type</th>
            <th style={styles.th}>Description</th>
            <th style={styles.th}>Request Tracking</th>
            <th style={styles.th}>Remarks</th>
            <th style={styles.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map(l => {
            const portionText = l.leave_portion ? l.leave_portion.replace('_', ' ') : l.duration;
            const hourlyText = l.leave_portion === 'HOURLY' ? \` - \${l.hourly_duration}h\` : '';
            
            return (
            <tr key={l.id} style={styles.tr}>`;

const replacementRenderLeave = `  const renderTable = (data, isHistory) => (
    <div style={{ overflowY: "auto", maxHeight: "550px" }}>
      <table style={styles.table}>
        <thead style={styles.stickyHeader}>
          <tr>
            <th style={styles.th}>Date Range</th>
            <th style={styles.th}>Leave Type</th>
            {!isHistory && <th style={styles.th}>Description</th>}
            {!isHistory && <th style={styles.th}>Request Tracking</th>}
            {!isHistory && <th style={styles.th}>Remarks</th>}
            <th style={styles.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map(l => {
            const portionText = l.leave_portion ? l.leave_portion.replace('_', ' ') : l.duration;
            const hourlyText = l.leave_portion === 'HOURLY' ? \` - \${l.hourly_duration}h\` : '';
            
            return (
            <tr key={l.id} onClick={() => isHistory && setSelectedHistory({...l, type: 'LEAVE'})} style={{...styles.tr, cursor: isHistory ? 'pointer' : 'default'}}
                onMouseEnter={(e) => { if(isHistory) e.currentTarget.style.backgroundColor = '#f1f5f9' }}
                onMouseLeave={(e) => { if(isHistory) e.currentTarget.style.backgroundColor = 'transparent' }}>`;
content = content.replace(targetRenderLeave, replacementRenderLeave);

// Wrap Leave Cells
const targetLeaveCells = `              <td style={styles.td}>
                <div style={{fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.5", maxWidth: "250px"}}>
                  {l.reason}
                </div>
              </td>
              <td style={styles.td}>
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
              </td>
              <td style={styles.td}>
                <div style={{fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.5", maxWidth: "250px"}}>
                  {l.resolution_remarks ? l.resolution_remarks : '-'}
                </div>
              </td>`;

const replacementLeaveCells = `              {!isHistory && <td style={styles.td}>
                <div style={{fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.5", maxWidth: "250px"}}>
                  {l.reason}
                </div>
              </td>}
              {!isHistory && <td style={styles.td}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
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
              </td>}
              {!isHistory && <td style={styles.td}>
                <div style={{fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.5", maxWidth: "250px"}}>
                  {l.resolution_remarks ? l.resolution_remarks : '-'}
                </div>
              </td>}`;
content = content.replace(targetLeaveCells, replacementLeaveCells);


// Layout update
const targetLayout = `              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => setViewMode('LEAVE')} 
                  style={viewMode === 'LEAVE' ? styles.activeTabBtn : styles.inactiveTabBtn}
                >Leave Requests</button>
                <button 
                  onClick={() => setViewMode('REGULARIZATION')} 
                  style={viewMode === 'REGULARIZATION' ? styles.activeTabBtn : styles.inactiveTabBtn}
                >Regularization Requests</button>
              </div>
            </div>
          </div>

          <div style={viewMode === 'LEAVE' ? styles.gridContainer : {}}>
            
            {/* LEFT COLUMN: Apply Form */}
            {viewMode === 'LEAVE' && (
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Submit Leave Application</h3>
              </div>
              
              <div style={styles.cardBody}>`;

const replacementLayout = `              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => setShowApplyModal(true)} 
                  style={{...styles.activeTabBtn, backgroundColor: '#10b981'}}
                >+ Apply for Leave</button>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button 
                onClick={() => setViewMode('LEAVE')} 
                style={viewMode === 'LEAVE' ? styles.activeTabBtn : styles.inactiveTabBtn}
              >Leave Requests</button>
              <button 
                onClick={() => setViewMode('REGULARIZATION')} 
                style={viewMode === 'REGULARIZATION' ? styles.activeTabBtn : styles.inactiveTabBtn}
              >Regularization Requests</button>
            </div>
          </div>

          <div style={{width: '100%'}}>
            
            {showApplyModal && (
            <div style={styles.modalOverlay}>
              <div style={{...styles.card, width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto'}}>
                <div style={{...styles.cardHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <h3 style={styles.cardTitle}>Submit Leave Application</h3>
                  <button onClick={() => setShowApplyModal(false)} style={styles.closeBtn}>&times;</button>
                </div>
              
                <div style={styles.cardBody}>`;
content = content.replace(targetLayout, replacementLayout);


const targetLayoutEnd = `                  <button type="submit" style={styles.submitBtn}>Submit Application</button>
                </form>
              </div>
            </div>
            )}

            {/* RIGHT COLUMN: History Table */}
            <div style={styles.card}>`;

const replacementLayoutEnd = `                  <button type="submit" style={styles.submitBtn}>Submit Application</button>
                </form>
              </div>
              </div>
            </div>
            )}

            {/* FULL WIDTH: History Table */}
            <div style={styles.card}>`;
content = content.replace(targetLayoutEnd, replacementLayoutEnd);


const targetTableRender = `              <div style={styles.cardBodyTable}>
                {viewMode === 'LEAVE' ? 
                  (activeTab === 'ONGOING' ? renderTable(ongoingLeaves) : renderTable(historyLeaves)) : 
                  (activeTab === 'ONGOING' ? renderRegTable(ongoingRegs) : renderRegTable(historyRegs))
                }
              </div>`;

const replacementTableRender = `              <div style={styles.cardBodyTable}>
                {viewMode === 'LEAVE' ? 
                  (activeTab === 'ONGOING' ? renderTable(ongoingLeaves, false) : renderTable(historyLeaves, true)) : 
                  (activeTab === 'ONGOING' ? renderRegTable(ongoingRegs, false) : renderRegTable(historyRegs, true))
                }
              </div>`;
content = content.replace(targetTableRender, replacementTableRender);

const targetModalInsert = `        </div>
      </div>
    </div>
  );
};`;

const replacementModalInsert = `        </div>
      </div>
      
      {selectedHistory && (
        <div style={styles.modalOverlay} onClick={() => setSelectedHistory(null)}>
          <div style={{...styles.card, width: '90%', maxWidth: '500px'}} onClick={e => e.stopPropagation()}>
            <div style={{...styles.cardHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h3 style={styles.cardTitle}>Request Details</h3>
              <button onClick={() => setSelectedHistory(null)} style={styles.closeBtn}>&times;</button>
            </div>
            <div style={{padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px'}}>
              <div>
                <strong style={{display: 'block', marginBottom: '8px', color: '#475569'}}>Reason</strong>
                <div style={{backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', color: '#334155', lineHeight: '1.5'}}>{selectedHistory.reason}</div>
              </div>
              <div>
                <strong style={{display: 'block', marginBottom: '8px', color: '#475569'}}>Tracking Timeline</strong>
                <div style={{backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px'}}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#3b82f6', marginTop: '4px' }}></div>
                      {(selectedHistory.forwarded_at || selectedHistory.resolved_at || selectedHistory.processed_on) && <div style={{ width: '2px', flexGrow: 1, backgroundColor: '#e2e8f0', minHeight: '15px', margin: '2px 0' }}></div>}
                    </div>
                    <div style={{ paddingBottom: (selectedHistory.forwarded_at || selectedHistory.resolved_at || selectedHistory.processed_on) ? '8px' : '0' }}>
                      <div style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: '600', lineHeight: '1.2' }}>Sent</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{new Date(selectedHistory.applied_on).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                  {selectedHistory.forwarded_at && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#8b5cf6', marginTop: '4px' }}></div>
                        {selectedHistory.resolved_at && <div style={{ width: '2px', flexGrow: 1, backgroundColor: '#e2e8f0', minHeight: '15px', margin: '2px 0' }}></div>}
                      </div>
                      <div style={{ paddingBottom: selectedHistory.resolved_at ? '8px' : '0' }}>
                        <div style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: '600', lineHeight: '1.2' }}>Forwarded by Mgr</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{new Date(selectedHistory.forwarded_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  )}
                  {(selectedHistory.resolved_at || selectedHistory.processed_on) && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: selectedHistory.status === 'APPROVED' ? '#10b981' : '#ef4444', marginTop: '4px' }}></div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-main)', fontSize: '13px', fontWeight: '600', lineHeight: '1.2' }}>Resolved</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{new Date(selectedHistory.resolved_at || selectedHistory.processed_on).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <strong style={{display: 'block', marginBottom: '8px', color: '#475569'}}>Remarks</strong>
                <div style={{backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', color: '#334155', lineHeight: '1.5'}}>{selectedHistory.resolution_remarks || selectedHistory.manager_remarks || '-'}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};`;
content = content.replace(targetModalInsert, replacementModalInsert);

const targetStyles = `  activeTabBtn: { backgroundColor: 'var(--primary)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  inactiveTabBtn: { backgroundColor: '#e2e8f0', color: '#475569', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },`;
const replacementStyles = `  activeTabBtn: { backgroundColor: 'var(--primary)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  inactiveTabBtn: { backgroundColor: '#e2e8f0', color: '#475569', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  closeBtn: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' },`;
content = content.replace(targetStyles, replacementStyles);

fs.writeFileSync('frontend/src/pages/RequestLeave.jsx', content);
console.log("Patched layout structure in RequestLeave.jsx");
