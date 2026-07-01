import { useState, useEffect } from "react";
import API, { api } from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const getTodayDate = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const todayFormatted = getTodayDate();

const RequestLeave = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const [leaves, setLeaves] = useState([]);
  const [regularizations, setRegularizations] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [viewMode, setViewMode] = useState('LEAVE');
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [activeTab, setActiveTab] = useState('ONGOING');
  const [backendWarnings, setBackendWarnings] = useState([]);
  const [backendStats, setBackendStats] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(null);

  
  const [leaveForm, setLeaveForm] = useState({ 
    start_date: "", 
    end_date: "",
    leave_type_id: "", 
    leave_portion: "FULL_DAY",
    hourly_duration: 1,
    reason: "",
    file: null
  });

  useEffect(() => { 
    fetchMyLeaves(); 
    fetchLeaveTypes();
  }, []);

  useEffect(() => {
    if (leaveForm.start_date && leaveForm.leave_type_id) {
      api.leaveRequests.validate({
        employee_id: user.id,
        start_date: leaveForm.start_date,
        end_date: leaveForm.end_date,
        leave_type_id: leaveForm.leave_type_id
      }).then(res => {
        setBackendWarnings(res.data.warnings || []);
        setBackendStats(res.data.stats || null);
      }).catch(err => console.error(err));
    } else {
      setBackendWarnings([]);
      setBackendStats(null);
    }
  }, [leaveForm.start_date, leaveForm.end_date, leaveForm.leave_type_id, user.id]);

  const fetchLeaveTypes = async () => {
    try {
      const res = await api.leaveTypes.getAll();
      setLeaveTypes(res.data);
      if (res.data.length > 0) {
        setLeaveForm(prev => ({ ...prev, leave_type_id: res.data[0].id }));
      }
    } catch (err) { console.error("Failed to load leave types"); }
  };

  const fetchMyLeaves = async () => {
    try {
      const res = await API.get(`/leaves/my-leaves/${user.id}`);
      setLeaves(res.data);
      const regRes = await API.get(`/attendance/regularize/my-requests/${user.id}`);
      setRegularizations(regRes.data);
    } catch (err) { console.error(err); }
  };

  const getSelectedLeaveType = () => leaveTypes.find(t => t.id == leaveForm.leave_type_id);

  const submitLeave = async (e) => {
    e.preventDefault();
    setMsg({ text: "", type: "" }); 
    
    const actualEndDate = leaveForm.end_date || leaveForm.start_date;
    const isActuallyMultiDay = leaveForm.start_date !== actualEndDate;

    const selectedStartDate = new Date(leaveForm.start_date);
    selectedStartDate.setHours(0,0,0,0);

    if (new Date(actualEndDate) < new Date(leaveForm.start_date)) {
      setMsg({ text: "End Date cannot be earlier than Start Date.", type: "error" });
      return;
    }

    const type = getSelectedLeaveType();
    if (type && type.requires_documentation && !leaveForm.file) {
      setMsg({ text: "This leave type requires supporting documentation. Please upload a file.", type: "error" });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("employee_id", user.id);
      formData.append("start_date", leaveForm.start_date);
      formData.append("end_date", actualEndDate);
      formData.append("leave_portion", isActuallyMultiDay ? "FULL_DAY" : leaveForm.leave_portion);
      
      if (leaveForm.leave_portion === 'HOURLY') {
        formData.append("hourly_duration", leaveForm.hourly_duration);
      }
      
      formData.append("leave_type_id", leaveForm.leave_type_id);
      formData.append("reason", leaveForm.reason);
      
      if (leaveForm.file) {
        formData.append("file", leaveForm.file);
      }

      await api.leaveRequests.request(formData);
      setMsg({ text: "Leave request submitted successfully.", type: "success" });
      setLeaveForm({ start_date: "", end_date: "", leave_type_id: leaveTypes.length > 0 ? leaveTypes[0].id : "", leave_portion: "FULL_DAY", hourly_duration: 1, reason: "", file: null });
      setTimeout(() => setMsg({ text: "", type: "" }), 3000);
      fetchMyLeaves(); 
    } catch (err) { 
      setMsg({ text: "Failed to submit request. Please check backend server.", type: "error" }); 
      console.error(err);
    }
  };

  const actualEndDateUI = leaveForm.end_date || leaveForm.start_date;
  const isMultiDay = leaveForm.start_date && actualEndDateUI && leaveForm.start_date !== actualEndDateUI;
  const selectedType = getSelectedLeaveType();

  // Helper for Status Badges
  const getStatusStyle = (status) => {
    if (!status) return styles.badgeWarning;
    if (status.includes('APPROVED')) return styles.badgeSuccess;
    if (status.includes('REJECTED')) return styles.badgeError;
    return styles.badgeWarning;
  };

  const ongoingLeaves = leaves.filter(l => l.status && l.status.startsWith('PENDING'));
  const historyLeaves = leaves.filter(l => !l.status || !l.status.startsWith('PENDING'));
  
  const ongoingRegs = regularizations.filter(r => r.status && r.status.startsWith('PENDING'));
  const historyRegs = regularizations.filter(r => !r.status || !r.status.startsWith('PENDING'));

  const renderRegTable = (data, isHistory) => (
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
                onMouseLeave={(e) => { if(isHistory) e.currentTarget.style.backgroundColor = 'transparent' }}>
              <td style={styles.td}>
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
              </td>
              <td style={styles.td}>
                <div style={{color: "var(--text-main)", fontWeight: "700", fontSize: "14px", whiteSpace: "nowrap"}}>
                  {r.requested_first_in ? r.requested_first_in.substring(0, 5) : '-'} to {r.requested_last_out ? r.requested_last_out.substring(0, 5) : '-'}
                </div>
              </td>
              {!isHistory && <td style={styles.td}>
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
              </td>}
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
  );

  const renderTable = (data, isHistory) => (
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
            const hourlyText = l.leave_portion === 'HOURLY' ? ` - ${l.hourly_duration}h` : '';
            
            return (
            <tr key={l.id} onClick={() => isHistory && setSelectedHistory({...l, type: 'LEAVE'})} style={{...styles.tr, cursor: isHistory ? 'pointer' : 'default'}}
                onMouseEnter={(e) => { if(isHistory) e.currentTarget.style.backgroundColor = '#f1f5f9' }}
                onMouseLeave={(e) => { if(isHistory) e.currentTarget.style.backgroundColor = 'transparent' }}>
              <td style={styles.td}>
                <div style={{color: "var(--text-main)", fontWeight: "600", fontSize: "14px", whiteSpace: "nowrap"}}>
                  {l.start_date === l.end_date 
                    ? new Date(l.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : `${new Date(l.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - ${new Date(l.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
                  }
                </div>
                <div style={{fontSize: "12px", color: "#6366f1", marginTop: "6px", fontWeight: "700", backgroundColor: "#e0e7ff", display: "inline-block", padding: "2px 8px", borderRadius: "12px"}}>{l.total_days} {l.total_days === 1 || l.total_days === 0.5 ? 'Day' : 'Days'}</div>
              </td>
              <td style={styles.td}>
                <div style={{color: "var(--text-main)", fontWeight: "700", fontSize: "14px"}}>{l.leave_type_name || l.leave_type || 'Unknown'}</div>
                <div style={{fontSize: "12px", color: "var(--text-muted)", marginTop: "6px"}}>{portionText}{hourlyText}</div>
              </td>
              {!isHistory && <td style={styles.td}>
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
              </td>}
              <td style={styles.td}>
                <span style={{...styles.badge, ...getStatusStyle(l.status)}}>
                  {l.status === 'PENDING' && l.pending_manager_name ? `PENDING MGR (${l.pending_manager_name}${l.pending_manager_level ? ` - ${l.pending_manager_level}` : ''})` :
                   l.status === 'PENDING_MANAGER' && l.pending_manager_name ? `PENDING MGR (${l.pending_manager_name}${l.pending_manager_level ? ` - ${l.pending_manager_level}` : ''})` : 
                   l.status === 'PENDING_ADMIN' ? 'PENDING ADMIN' :
                   l.status}
                </span>
              </td>
            </tr>
            );
          })}
          {data.length === 0 && (
            <tr>
              <td colSpan="6" style={{textAlign:"center", padding: "40px", color:"var(--text-muted)"}}>
                <span style={{fontSize: "24px", display: "block", marginBottom: "10px"}}>📭</span>
                No leave requests found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.main}>
        <Navbar />
        <div style={styles.contentPadding}>
          
          <div style={styles.headerSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={styles.pageTitle}>My Requests</h2>
                <p style={styles.pageSubtitle}>Apply for time off and track your request history.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => setShowApplyModal(true)} 
                  style={{...styles.activeTabBtn, backgroundColor: '#10b981'}}
                >+ Apply for Leave</button>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', marginTop: '10px' }}>
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
              
                <div style={styles.cardBody}>
                {msg.text && (
                  <div style={msg.type === "error" ? styles.errorMsg : styles.successMsg}>{msg.text}</div>
                )}
                
                {backendStats && backendStats.department && (
                  <div style={{...styles.purpleBanner, backgroundColor: "#f1f5f9", color: "#334155", borderLeft: "4px solid #94a3b8", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", padding: "15px"}}>
                    <div><strong>Shift:</strong> {backendStats.shift}</div>
                    <div><strong>Department:</strong> {backendStats.department}</div>
                    {backendStats.max_concurrent > 0 && (
                      <>
                        <div><strong>Dept Limit:</strong> {backendStats.max_concurrent}</div>
                        <div><strong>Approved Leaves:</strong> {backendStats.approved_leaves}</div>
                        <div style={{gridColumn: "span 2", marginTop: "5px", fontWeight: "bold", color: backendStats.available_slots === 0 ? "var(--badge-rejected-text)" : "var(--badge-approved-text)"}}>
                          Available Slots: {backendStats.available_slots}
                        </div>
                      </>
                    )}
                  </div>
                )}
                
                {backendWarnings.map((w, idx) => (
                  <div key={idx} style={styles.warningBanner}>
                    <strong>Warning:</strong> {w}
                  </div>
                ))}

                <form onSubmit={submitLeave} style={styles.form}>
                  <label style={styles.label}>Leave Type</label>
                  <select value={leaveForm.leave_type_id} onChange={e => {
                      setLeaveForm({...leaveForm, leave_type_id: e.target.value, start_date: "", end_date: ""}); 
                      setMsg({text: "", type: ""});
                    }} style={styles.input}>
                    {leaveTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>

                  <div style={{ display: "flex", gap: "15px" }}>
                    <div style={{flex: 1}}>
                      <label style={styles.label}>Start Date</label>
                      <input 
                        type="date" 
                        value={leaveForm.start_date} 
                        onChange={e => setLeaveForm({...leaveForm, start_date: e.target.value})} 
                        required 
                        style={styles.input} 
                        min={todayFormatted} 
                      />
                    </div>
                    <div style={{flex: 1}}>
                      <label style={styles.label}>End Date</label>
                      <input 
                        type="date" 
                        value={leaveForm.end_date} 
                        onChange={e => setLeaveForm({...leaveForm, end_date: e.target.value})} 
                        required 
                        style={styles.input} 
                        min={leaveForm.start_date || todayFormatted} 
                      />
                    </div>
                  </div>

                  {!isMultiDay && (
                    <div style={{ display: "flex", gap: "15px" }}>
                      <div style={{flex: 1}}>
                        <label style={styles.label}>Duration (For Single Day)</label>
                        <select value={leaveForm.leave_portion} onChange={e => setLeaveForm({...leaveForm, leave_portion: e.target.value})} style={styles.input}>
                          <option value="FULL_DAY">Full Day</option>
                          <option value="FIRST_HALF">Half Day (Forenoon)</option>
                          <option value="SECOND_HALF">Half Day (Afternoon)</option>
                          <option value="HOURLY">Hourly Duration</option>
                        </select>
                      </div>
                      
                      {leaveForm.leave_portion === 'HOURLY' && (
                        <div style={{flex: 1}}>
                          <label style={styles.label}>Hours</label>
                          <input 
                            type="number" 
                            min="1" 
                            max="8" 
                            step="0.5" 
                            value={leaveForm.hourly_duration} 
                            onChange={e => setLeaveForm({...leaveForm, hourly_duration: e.target.value})} 
                            required 
                            style={styles.input} 
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <label style={styles.label}>Reason</label>
                  <textarea placeholder="Briefly explain the reason for leave..." value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})} required style={{...styles.input, height: "100px", resize: "none"}} />
                  
                  {selectedType && selectedType.requires_documentation && (
                    <div>
                      <label style={styles.label}>Supporting Document (Required)</label>
                      <input 
                        type="file" 
                        onChange={e => setLeaveForm({...leaveForm, file: e.target.files[0]})} 
                        style={styles.fileInput}
                        required
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                    </div>
                  )}

                  <button type="submit" style={styles.submitBtn}>Submit Application</button>
                </form>
              </div>
              </div>
            </div>
            )}

            {/* FULL WIDTH: History Table */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
                  <h3 
                    style={{...styles.cardTitle, cursor: 'pointer', borderBottom: activeTab === 'ONGOING' ? '2px solid var(--primary)' : 'none', color: activeTab === 'ONGOING' ? 'var(--primary)' : 'var(--text-muted)', paddingBottom: '5px'}} 
                    onClick={() => setActiveTab('ONGOING')}
                  >
                    Ongoing Requests
                  </h3>
                  <h3 
                    style={{...styles.cardTitle, cursor: 'pointer', borderBottom: activeTab === 'HISTORY' ? '2px solid var(--primary)' : 'none', color: activeTab === 'HISTORY' ? 'var(--primary)' : 'var(--text-muted)', paddingBottom: '5px'}} 
                    onClick={() => setActiveTab('HISTORY')}
                  >
                    Request History
                  </h3>
                </div>
              </div>
              <div style={styles.cardBodyTable}>
                {viewMode === 'LEAVE' ? 
                  (activeTab === 'ONGOING' ? renderTable(ongoingLeaves, false) : renderTable(historyLeaves, true)) : 
                  (activeTab === 'ONGOING' ? renderRegTable(ongoingRegs, false) : renderRegTable(historyRegs, true))
                }
              </div>
            </div>

          </div>
        </div>
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
};

// Styles
const styles = {
  activeTabBtn: { backgroundColor: 'var(--primary)', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  inactiveTabBtn: { backgroundColor: '#e2e8f0', color: '#475569', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  closeBtn: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' },
  layout: { display: "flex", minHeight: "100vh", backgroundColor: "#f8fafc" },
  main: { flexGrow: 1, marginLeft: "260px" },
  contentPadding: { padding: "30px 40px" },
  
  headerSection: { marginBottom: "30px" },
  pageTitle: { margin: "0 0 8px 0", fontSize: "24px", color: "var(--text-main)", fontWeight: "700" },
  pageSubtitle: { margin: "0", fontSize: "14px", color: "var(--text-muted)", marginBottom: "15px" },

  gridContainer: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "30px" },
  
  card: { backgroundColor: "var(--bg-card)", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)", border: "1px solid var(--border)", overflow: "hidden", display: "flex", flexDirection: "column" },
  cardHeader: { backgroundColor: "#f8fafc", padding: "20px 25px", borderBottom: "1px solid var(--border)" },
  cardTitle: { fontSize: "18px", color: "var(--text-main)", margin: 0, fontWeight: "600" },
  cardBody: { padding: "25px" },
  cardBodyTable: { padding: "0" }, 

  infoBanner: { backgroundColor: "#eff6ff", color: "#1e3a8a", padding: "12px 16px", borderRadius: "8px", border: "1px solid #bfdbfe", fontSize: "14px", marginBottom: "10px", display: "flex", alignItems: "center" },
  purpleBanner: { backgroundColor: "#f3e8ff", color: "#6b21a8", padding: "12px 16px", borderRadius: "8px", border: "1px solid #d8b4fe", fontSize: "14px", marginBottom: "10px", display: "flex", alignItems: "center" },
  warningBanner: { backgroundColor: "#fffbeb", color: "#b45309", padding: "12px 16px", borderRadius: "8px", border: "1px solid #fde68a", fontSize: "14px", marginBottom: "20px", display: "flex", alignItems: "center" },
  form: { display: "flex", flexDirection: "column", gap: "18px" },
  label: { fontSize: "14px", fontWeight: "600", color: "#475569", marginBottom: "6px", display: "block" },
  input: { padding: "12px 16px", border: "1px solid #cbd5e1", borderRadius: "8px", width: "100%", outline: "none", fontSize: "14px", backgroundColor: "#fff", transition: "border-color 0.2s", color: "#0f172a" },
  fileInput: { padding: "10px", border: "1px dashed #cbd5e1", borderRadius: "8px", width: "100%", fontSize: "14px", backgroundColor: "#f8fafc", color: "#64748b" },
  
  submitBtn: { backgroundColor: "var(--primary)", color: "white", padding: "14px", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "15px", marginTop: "10px", transition: "opacity 0.2s" },
  
  table: { width: "100%", borderCollapse: "collapse" },
  stickyHeader: { position: "sticky", top: 0, backgroundColor: "#f8fafc", zIndex: 1 },
  th: { padding: "18px 25px", backgroundColor: "#f8fafc", fontSize: "13px", color: "var(--text-muted)", borderBottom: "1px solid #e2e8f0", textAlign: "left", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.5px" },
  tr: { borderBottom: "1px solid #f1f5f9", transition: "background-color 0.2s" },
  td: { padding: "16px 20px", color: "var(--text-main)", fontSize: "14px", verticalAlign: "middle" },
  
  badge: { padding: "6px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "600", display: "inline-block" },
  badgeSuccess: { backgroundColor: "#dcfce7", color: "#166534" },
  badgeError: { backgroundColor: "#fee2e2", color: "#991b1b" },
  badgeWarning: { backgroundColor: "#fef3c7", color: "#92400e" },

  successMsg: { padding: "14px", backgroundColor: "#f0fdf4", color: "#166534", borderRadius: "8px", fontSize: "14px", marginBottom: "20px", border: "1px solid #bbf7d0", fontWeight: "500" },
  errorMsg: { padding: "14px", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "8px", fontSize: "14px", marginBottom: "20px", border: "1px solid #fecaca", fontWeight: "500" },
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
  }
};

export default RequestLeave;