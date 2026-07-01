const fs = require('fs');
let code = fs.readFileSync('backend/routes/reportRoutes.js', 'utf8');

code = code.replace(
  `router.get('/master', reportController.getMasterReport);`,
  `router.get('/master', reportController.getMasterReport);\nrouter.get('/yearly', reportController.getYearlyMasterReport);`
);

fs.writeFileSync('backend/routes/reportRoutes.js', code);
console.log('Added /yearly route');
