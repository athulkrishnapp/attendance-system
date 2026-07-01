const fs = require('fs');
let code = fs.readFileSync('backend/controllers/reportController.js', 'utf8');

code = code.replace(
  `res.status(500).json({ error: "Failed to generate master report." });`,
  `console.error(err); res.status(500).json({ error: err.message, stack: err.stack });`
);

fs.writeFileSync('backend/controllers/reportController.js', code);
