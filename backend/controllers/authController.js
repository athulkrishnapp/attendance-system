const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const JWT_SECRET = "super_secret_key_change_this_later"; // Hardcoded for your 2hr deadline

// Register a new employee/admin
exports.register = async (req, res) => {
  try {
    const { employee_code, name, email, password, role_id } = req.body;

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert into database
    const newEmployee = await pool.query(
      "INSERT INTO employees (employee_code, name, email, password, role_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email",
      [employee_code, name, email, hashedPassword, role_id]
    );

    res.status(201).json({ message: "User registered successfully", user: newEmployee.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error during registration" });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await pool.query("SELECT * FROM employees WHERE email = $1", [email]);
    if (user.rows.length === 0) {
      return res.status(401).json({ error: "Invalid Credentials" });
    }

    // Validate password
    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid Credentials" });
    }

    // Generate Token
    const token = jwt.sign({ id: user.rows[0].id, role_id: user.rows[0].role_id }, JWT_SECRET, { expiresIn: "1h" });

    res.json({ token, user: { id: user.rows[0].id, name: user.rows[0].name, role_id: user.rows[0].role_id } });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error during login" });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { employee_id, new_password } = req.body;
    
    // Hash the new password securely
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    await pool.query("UPDATE employees SET password = $1 WHERE id = $2", [hashedPassword, employee_id]);
    
    res.json({ message: "Password updated successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update password" });
  }
};