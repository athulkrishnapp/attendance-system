const fs = require('fs');
let inbox = fs.readFileSync('frontend/src/pages/ApprovalsInbox.jsx', 'utf8');

const targetInboxCells = `                            {item.modifier_flags && (
                              <div style={{marginTop: "2px", fontSize: "11px", color: "#b91c1c"}}>
                                {item.modifier_flags.replace(/[{}]/g, '').replace(/,/g, ', ')}
                              </div>
                            )}`;

const replacementInboxCells = `                            {item.modifier_flags && String(item.modifier_flags).trim() !== '' && String(item.modifier_flags).trim() !== '{}' && (
                              <div style={{marginTop: "2px", fontSize: "11px", color: "#b91c1c"}}>
                                {Array.isArray(item.modifier_flags) ? item.modifier_flags.join(', ') : String(item.modifier_flags).replace(/[{}]/g, '').replace(/,/g, ', ')}
                              </div>
                            )}`;

inbox = inbox.replace(targetInboxCells, replacementInboxCells);
fs.writeFileSync('frontend/src/pages/ApprovalsInbox.jsx', inbox);
console.log("Fixed ApprovalsInbox.jsx crash");
