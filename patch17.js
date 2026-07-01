const fs = require('fs');
let inbox = fs.readFileSync('frontend/src/pages/ApprovalsInbox.jsx', 'utf8');

// 1. Add state for Approve Modal
const targetModalState = `  // Reject Modal State (Shared)
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectType, setRejectType] = useState(""); // 'leave' or 'regularization'
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");`;

const replacementModalState = `  // Reject Modal State (Shared)
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectType, setRejectType] = useState(""); // 'leave' or 'regularization'
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  // Approve Modal State (Shared)
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveType, setApproveType] = useState("");
  const [approveId, setApproveId] = useState(null);
  const [approveRemarks, setApproveRemarks] = useState("");`;

inbox = inbox.replace(targetModalState, replacementModalState);

// 2. Change handleApprove methods to open modal
const targetApproveHandlers = `  // Status and Action Handlers
  const handleApproveLeave = async (id) => {
    const remarks = window.prompt("Enter approval remarks (optional):");
    if (remarks === null) return; // Cancelled
    try {
      await api.leaveRequests.approve(id, { resolver_id: user.id, remarks });
      fetchData();
    } catch (err) { alert("Failed to approve request"); }
  };
  const handleForwardLeave = async (id) => {
    try {
      await api.leaveRequests.forward(id, { manager_id: user.id });
      fetchData();
    } catch (err) { alert("Failed to forward request"); }
  };

  const handleApproveReg = async (id) => {
    const remarks = window.prompt("Enter approval remarks (optional):");
    if (remarks === null) return; // Cancelled
    try {
      await api.regularizations.process(id, { 
        status: 'APPROVED', 
        manager_remarks: remarks || 'Approved', 
        processed_by: user.id 
      });
      fetchData();
    } catch (err) { alert("Failed to process regularization"); }
  };`;

const replacementApproveHandlers = `  // Status and Action Handlers
  const openApproveModal = (type, id) => {
    setApproveType(type);
    setApproveId(id);
    setApproveRemarks("");
    setShowApproveModal(true);
  };

  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    try {
      if (approveType === 'leave') {
        await api.leaveRequests.approve(approveId, { resolver_id: user.id, remarks: approveRemarks || 'Approved' });
      } else if (approveType === 'regularization') {
        await api.regularizations.process(approveId, { 
          status: 'APPROVED', 
          manager_remarks: approveRemarks || 'Approved', 
          processed_by: user.id 
        });
      }
      setShowApproveModal(false);
      fetchData();
    } catch (err) { alert("Failed to approve request"); }
  };

  const handleForwardLeave = async (id) => {
    try {
      await api.leaveRequests.forward(id, { manager_id: user.id });
      fetchData();
    } catch (err) { alert("Failed to forward request"); }
  };

  const handleForwardReg = async (id, attendance_summary_id) => {
    try {
      await api.regularizations.forward(id, { manager_id: user.id, attendance_summary_id });
      fetchData();
    } catch (err) { alert("Failed to forward regularization"); }
  };`;

inbox = inbox.replace(targetApproveHandlers, replacementApproveHandlers);

// 3. Update onClick handlers for Approve buttons
const targetApproveButtons = `                            {(isSuperAdmin || isSubAdmin) && (
                              <button style={styles.approveBtn} onClick={() => {
                                if(activeTab==='leaves') handleApproveLeave(item.id);
                                else if(activeTab==='regularizations') handleApproveReg(item.id);
                                else handleBalanceAction(item.id, 'APPROVED');
                              }}>Approve</button>
                            )}`;

const replacementApproveButtons = `                            {(isSuperAdmin || isSubAdmin) && (
                              <button style={styles.approveBtn} onClick={() => {
                                if(activeTab==='leaves') openApproveModal('leave', item.id);
                                else if(activeTab==='regularizations') openApproveModal('regularization', item.id);
                                else handleBalanceAction(item.id, 'APPROVED');
                              }}>Approve</button>
                            )}`;

inbox = inbox.replace(targetApproveButtons, replacementApproveButtons);

const targetRejectModal = `        {showRejectModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalCard}>
              <h3 style={styles.modalTitle}>Reject {rejectType === 'leave' ? 'Leave' : 'Regularization'}</h3>
              <form onSubmit={handleRejectSubmit}>
                <label style={styles.label}>Reason for Rejection</label>
                <textarea 
                  value={rejectReason} 
                  onChange={(e) => setRejectReason(e.target.value)}
                  style={styles.textarea}
                  required
                  placeholder="Enter rejection reason..."
                />
                <div style={{display: "flex", gap: "10px", justifyContent: "flex-end"}}>
                  <button type="button" onClick={() => setShowRejectModal(false)} style={styles.cancelBtn}>Cancel</button>
                  <button type="submit" style={styles.rejectBtn}>Confirm Reject</button>
                </div>
              </form>
            </div>
          </div>
        )}`;

const replacementRejectModal = `        {showRejectModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalCard}>
              <h3 style={styles.modalTitle}>Reject {rejectType === 'leave' ? 'Leave' : 'Regularization'}</h3>
              <form onSubmit={handleRejectSubmit}>
                <label style={styles.label}>Reason for Rejection</label>
                <textarea 
                  value={rejectReason} 
                  onChange={(e) => setRejectReason(e.target.value)}
                  style={styles.textarea}
                  required
                  placeholder="Enter rejection reason..."
                />
                <div style={{display: "flex", gap: "10px", justifyContent: "flex-end"}}>
                  <button type="button" onClick={() => setShowRejectModal(false)} style={styles.cancelBtn}>Cancel</button>
                  <button type="submit" style={styles.rejectBtn}>Confirm Reject</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showApproveModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalCard}>
              <h3 style={styles.modalTitle}>Approve {approveType === 'leave' ? 'Leave' : 'Regularization'}</h3>
              <form onSubmit={handleApproveSubmit}>
                <label style={styles.label}>Approval Remarks (Optional)</label>
                <textarea 
                  value={approveRemarks} 
                  onChange={(e) => setApproveRemarks(e.target.value)}
                  style={styles.textarea}
                  placeholder="Enter any remarks..."
                />
                <div style={{display: "flex", gap: "10px", justifyContent: "flex-end"}}>
                  <button type="button" onClick={() => setShowApproveModal(false)} style={styles.cancelBtn}>Cancel</button>
                  <button type="submit" style={styles.approveBtn}>Confirm Approve</button>
                </div>
              </form>
            </div>
          </div>
        )}`;

inbox = inbox.replace(targetRejectModal, replacementRejectModal);

// Also remove handleForwardReg definition which is duplicated if I matched it wrong
// Wait, I only matched up to handleApproveReg. handleForwardReg was below it.
// Let's check if handleForwardReg is duplicated now.
fs.writeFileSync('frontend/src/pages/ApprovalsInbox.jsx', inbox);
console.log("Replaced window.prompt with custom Approve modal in ApprovalsInbox.jsx");
