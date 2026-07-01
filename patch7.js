const fs = require('fs');

const target1 = `  const [leaves, setLeaves] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);`;
const replacement1 = `  const [leaves, setLeaves] = useState([]);
  const [regularizations, setRegularizations] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [viewMode, setViewMode] = useState('LEAVE');`;

const target2 = `  const fetchMyLeaves = async () => {
    try {
      const res = await API.get(\`/leaves/my-leaves/\${user.id}\`);
      setLeaves(res.data);
    } catch (err) { console.error(err); }
  };`;
const replacement2 = `  const fetchMyLeaves = async () => {
    try {
      const res = await API.get(\`/leaves/my-leaves/\${user.id}\`);
      setLeaves(res.data);
      const regRes = await API.get(\`/attendance/regularize/my-requests/\${user.id}\`);
      setRegularizations(regRes.data);
    } catch (err) { console.error(err); }
  };`;

const target3 = `  const ongoingLeaves = leaves.filter(l => l.status && l.status.startsWith('PENDING'));
  const historyLeaves = leaves.filter(l => !l.status || !l.status.startsWith('PENDING'));`;
const replacement3 = `  const ongoingLeaves = leaves.filter(l => l.status && l.status.startsWith('PENDING'));
  const historyLeaves = leaves.filter(l => !l.status || !l.status.startsWith('PENDING'));
  
  const ongoingRegs = regularizations.filter(r => r.status && r.status.startsWith('PENDING'));
  const historyRegs = regularizations.filter(r => !r.status || !r.status.startsWith('PENDING'));

  const renderRegTable = (data) => (
    <div style={{ overflowY: "auto", maxHeight: "550px" }}>
      <table style={styles.table}>
        <thead style={styles.stickyHeader}>
          <tr>
            <th style={styles.th}>Date</th>
            <th style={styles.th}>Requested Times</th>
            <th style={styles.th}>Reason</th>
            <th style={styles.th}>Updates</th>
            <th style={styles.th}>Manager Remarks</th>
            <th style={styles.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map(r => (
            <tr key={r.id} style={styles.tr}>
              <td style={styles.td}>
                {new Date(r.attendance_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                <div style={{fontSize: "12px", color: "var(--text-muted)", marginTop: "4px"}}>{r.core_status || 'Unknown'}</div>
              </td>
              <td style={styles.td}>
                <div style={{fontWeight: '600', color: "var(--text-main)"}}>
                  {r.requested_first_in || '-'} to {r.requested_last_out || '-'}
                </div>
              </td>
              <td style={styles.td}>
                <div style={{fontSize: "12px", color: "var(--text-muted)"}}>{r.reason}</div>
              </td>
              <td style={styles.td}>
                <div style={{fontSize: "12px", color: "var(--text-muted)"}}>
                  <div><strong>Sent:</strong> {new Date(r.applied_on).toLocaleString()}</div>
                  {r.processed_on && <div><strong>Processed:</strong> {new Date(r.processed_on).toLocaleString()}</div>}
                </div>
              </td>
              <td style={styles.td}>
                <div style={{fontSize: "12px", color: "var(--text-muted)"}}>{r.manager_remarks || '-'}</div>
              </td>
              <td style={styles.td}>
                <span style={{...styles.badge, ...getStatusStyle(r.status)}}>
                  {r.status === 'PENDING_MANAGER' ? 'PENDING MGR' : r.status === 'PENDING_ADMIN' ? 'PENDING ADMIN' : r.status}
                </span>
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan="6" style={{textAlign:"center", padding: "40px", color:"var(--text-muted)"}}>
                <span style={{fontSize: "24px", display: "block", marginBottom: "10px"}}>📭</span>
                No regularization requests found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );`;

const target4 = `          <div style={styles.headerSection}>
            <h2 style={styles.pageTitle}>Leave Management</h2>
            <p style={styles.pageSubtitle}>Apply for time off and track your request history.</p>
          </div>`;
const replacement4 = `          <div style={styles.headerSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={styles.pageTitle}>My Requests</h2>
                <p style={styles.pageSubtitle}>Apply for time off and track your request history.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
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
          </div>`;

const target5 = `          <div style={styles.gridContainer}>
            
            {/* LEFT COLUMN: Apply Form */}
            <div style={styles.card}>`;
const replacement5 = `          <div style={viewMode === 'LEAVE' ? styles.gridContainer : {}}>
            
            {/* LEFT COLUMN: Apply Form */}
            {viewMode === 'LEAVE' && (
            <div style={styles.card}>`;

const target6 = `              </div>
            </div>

            {/* RIGHT COLUMN: History Table */}`;
const replacement6 = `              </div>
            </div>
            )}

            {/* RIGHT COLUMN: History Table */}`;

const target7 = `              <div style={styles.cardBodyTable}>
                {activeTab === 'ONGOING' ? renderTable(ongoingLeaves) : renderTable(historyLeaves)}
              </div>`;
const replacement7 = `              <div style={styles.cardBodyTable}>
                {viewMode === 'LEAVE' ? 
                  (activeTab === 'ONGOING' ? renderTable(ongoingLeaves) : renderTable(historyLeaves)) : 
                  (activeTab === 'ONGOING' ? renderRegTable(ongoingRegs) : renderRegTable(historyRegs))
                }
              </div>`;

const target8 = `// Styles
const styles = {`;
const replacement8 = `// Styles
const styles = {
  activeTabBtn: { backgroundColor: 'var(--primary)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  inactiveTabBtn: { backgroundColor: '#e2e8f0', color: '#475569', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },`;

let content = fs.readFileSync('frontend/src/pages/RequestLeave.jsx', 'utf8');
content = content.replace(target1, replacement1);
content = content.replace(target2, replacement2);
content = content.replace(target3, replacement3);
content = content.replace(target4, replacement4);
content = content.replace(target5, replacement5);
content = content.replace(target6, replacement6);
content = content.replace(target7, replacement7);
content = content.replace(target8, replacement8);
fs.writeFileSync('frontend/src/pages/RequestLeave.jsx', content);
console.log("Patched RequestLeave.jsx");
