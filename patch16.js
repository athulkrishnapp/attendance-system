const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/ApprovalsInbox.jsx', 'utf8');

const targetApproveReg = `  const handleApproveReg = async (id) => {
    try {
      await api.regularizations.process(id, { status: 'APPROVED', manager_remarks: 'Approved', processed_by: user.id });
      fetchData();
    } catch (err) { alert("Failed to process regularization"); }
  };`;

const replacementApproveReg = `  const handleApproveReg = async (id) => {
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

content = content.replace(targetApproveReg, replacementApproveReg);
fs.writeFileSync('frontend/src/pages/ApprovalsInbox.jsx', content);
console.log("Patched ApprovalsInbox.jsx for regularization approval remarks");
