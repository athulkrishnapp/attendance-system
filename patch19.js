const fs = require('fs');
let inbox = fs.readFileSync('frontend/src/pages/ApprovalsInbox.jsx', 'utf8');

const targetFix = `  const handleForwardReg = async (id, attendance_summary_id) => {
  const handleBalanceAction = async (id, status) => {`;

const replacementFix = `  const handleForwardReg = async (id, attendance_summary_id) => {
    try {
      await api.regularizations.forward(id, { manager_id: user.id, attendance_summary_id });
      fetchData();
    } catch (err) { alert("Failed to forward regularization"); }
  };

  const handleBalanceAction = async (id, status) => {`;

if (inbox.includes(targetFix)) {
  inbox = inbox.replace(targetFix, replacementFix);
  fs.writeFileSync('frontend/src/pages/ApprovalsInbox.jsx', inbox);
  console.log("Fixed handleForwardReg syntax error");
} else {
  console.log("Could not find target string.");
}
