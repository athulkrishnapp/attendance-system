const fs = require('fs');

// 1. Revert backend routes
let routesCode = fs.readFileSync('backend/routes/reportRoutes.js', 'utf8');
routesCode = routesCode.replace(
  `router.get('/master', reportController.getMasterReport);\nrouter.get('/yearly', reportController.getYearlyMasterReport);`,
  `router.get('/master', reportController.getMasterReport);`
);
fs.writeFileSync('backend/routes/reportRoutes.js', routesCode);

// 2. Revert backend controllers
let ctrlCode = fs.readFileSync('backend/controllers/reportController.js', 'utf8');
const yearlyStart = ctrlCode.indexOf('const getYearlyMasterReport');
if (yearlyStart !== -1) {
  const exportsStart = ctrlCode.indexOf('module.exports = {', yearlyStart);
  ctrlCode = ctrlCode.substring(0, yearlyStart) + ctrlCode.substring(exportsStart);
  ctrlCode = ctrlCode.replace(`,\n  getYearlyMasterReport,\n};`, `\n};`);
  fs.writeFileSync('backend/controllers/reportController.js', ctrlCode);
}

// 3. Revert frontend api
let apiCode = fs.readFileSync('frontend/src/services/api.js', 'utf8');
apiCode = apiCode.replace(
  `master: (year, month) => API.get(\`/reports/master?year=\${year}&month=\${month}\`),\n    yearlyMaster: (year) => API.get(\`/reports/yearly?year=\${year}\`),`,
  `master: (year, month) => API.get(\`/reports/master?year=\${year}&month=\${month}\`),`
);
fs.writeFileSync('frontend/src/services/api.js', apiCode);

console.log('Reverted yearly API features');
