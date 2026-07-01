const fs = require('fs');

// Patch reportController.js to exclude e.id = 1 (Super Admin)
let reportContent = fs.readFileSync('backend/controllers/reportController.js', 'utf8');
reportContent = reportContent.replace(/WHERE e.is_active = true/g, "WHERE e.is_active = true AND e.id != 1");
fs.writeFileSync('backend/controllers/reportController.js', reportContent);
console.log("Patched reportController.js");

// Patch ruleEngine.js to properly evaluate 0 punches
let ruleContent = fs.readFileSync('backend/utils/ruleEngine.js', 'utf8');
const targetRule = `    // --- Step 3: Derived time boundaries ---
    const shiftStart          = expectedStartDate      ? new Date(expectedStartDate)      : null;`;

const replacementRule = `    if (!firstIn && !lastOut) {
        return { core_status: 'ABSENT', modifier_flags: modifier_flags };
    }

    // --- Step 3: Derived time boundaries ---
    const shiftStart          = expectedStartDate      ? new Date(expectedStartDate)      : null;`;

ruleContent = ruleContent.replace(targetRule, replacementRule);
fs.writeFileSync('backend/utils/ruleEngine.js', ruleContent);
console.log("Patched ruleEngine.js");

