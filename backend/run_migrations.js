const pool = require("./db");
const fs = require("fs");

async function run() {
  try {
    const sql = fs.readFileSync("/home/user/.gemini/antigravity-ide/brain/f043e9f6-76a0-4b65-b477-7473b62126e5/scratch/migrations3.sql", "utf8");
    await pool.query(sql);
    console.log("Migrations ran successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}
run();
