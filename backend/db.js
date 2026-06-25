const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "attendance_system",
  password: "123",
  port: 5432,
});

// Add this test connection
pool.connect()
  .then(() => console.log("✅ Connected to Postgres Database successfully!"))
  .catch(err => console.error("❌ Database Connection Error:", err.stack));

module.exports = pool;