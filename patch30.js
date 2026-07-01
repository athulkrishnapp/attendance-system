const fs = require('fs');
let code = fs.readFileSync('frontend/src/services/api.js', 'utf8');

code = code.replace(
  `master: (year, month) => API.get(\`/reports/master?year=\${year}&month=\${month}\`),`,
  `master: (year, month) => API.get(\`/reports/master?year=\${year}&month=\${month}\`),
    yearlyMaster: (year) => API.get(\`/reports/yearly?year=\${year}\`),`
);

fs.writeFileSync('frontend/src/services/api.js', code);
console.log('Added yearlyMaster to frontend API');
