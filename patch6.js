const fs = require('fs');
let content = fs.readFileSync('backend/routes/attendanceRoutes.js', 'utf8');

const target = `router.get("/regularize/pending", attendanceController.getAllRegularizations);`;
const replacement = `router.get("/regularize/pending", attendanceController.getAllRegularizations);
router.get("/regularize/my-requests/:id", attendanceController.getMyRegularizations);`;

content = content.replace(target, replacement);
fs.writeFileSync('backend/routes/attendanceRoutes.js', content);
console.log("Patched attendanceRoutes.js");
