const fs = require('fs');
let inbox = fs.readFileSync('frontend/src/pages/ApprovalsInbox.jsx', 'utf8');

// The replacement I previously did for Reject Modal and Approve Modal
const targetModalOld = `      {showRejectModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>Reject Request</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              style={{...styles.input, width: '100%', height: '100px', marginBottom: '15px', resize: 'none'}}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowRejectModal(false)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={handleRejectSubmit} style={styles.rejectModalBtn}>Confirm Reject</button>
            </div>
          </div>
        </div>
      )}`;

const replacementModalNew = `      {showRejectModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>Reject Request</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              style={{...styles.input, width: '100%', height: '100px', marginBottom: '15px', resize: 'none'}}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowRejectModal(false)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={handleRejectSubmit} style={styles.rejectModalBtn}>Confirm Reject</button>
            </div>
          </div>
        </div>
      )}

      {showApproveModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3>Approve Request</h3>
            <textarea
              value={approveRemarks}
              onChange={(e) => setApproveRemarks(e.target.value)}
              placeholder="Approval remarks (optional)..."
              style={{...styles.input, width: '100%', height: '100px', marginBottom: '15px', resize: 'none'}}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowApproveModal(false)} style={styles.cancelBtn}>Cancel</button>
              <button onClick={handleApproveSubmit} style={{...styles.approveBtn, padding: '10px 16px'}}>Confirm Approve</button>
            </div>
          </div>
        </div>
      )}`;

inbox = inbox.replace(targetModalOld, replacementModalNew);

// Since my previous replace failed because I used the wrong target string 
// (I tried replacing a structure with <form> that didn't exist in ApprovalsInbox.jsx),
// it means the old replace failed silently, and my manual 'sed' to delete lines 96-101 probably caused a syntax error by deleting the WRONG lines.
fs.writeFileSync('frontend/src/pages/ApprovalsInbox.jsx', inbox);
console.log("Replaced native prompt with custom Approve modal");
