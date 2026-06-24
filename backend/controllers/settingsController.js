const pool = require("../db");

exports.getSettings = async (req, res) => {
  try {
    const settings = await pool.query("SELECT * FROM company_settings LIMIT 1");
    const holidays = await pool.query("SELECT * FROM company_holidays ORDER BY holiday_date ASC");
    res.json({ settings: settings.rows[0], holidays: holidays.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { shift_start_time, shift_end_time, grace_period_minutes, required_working_hours } = req.body;
    await pool.query(
      `UPDATE company_settings 
       SET shift_start_time=$1, shift_end_time=$2, grace_period_minutes=$3, required_working_hours=$4 
       WHERE id=1`,
      [shift_start_time, shift_end_time, grace_period_minutes, required_working_hours]
    );
    res.json({ message: "Settings updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update settings" });
  }
};

exports.addHoliday = async (req, res) => {
  try {
    const { holiday_date, description } = req.body;
    await pool.query(
      "INSERT INTO company_holidays (holiday_date, description) VALUES ($1, $2)",
      [holiday_date, description]
    );
    res.json({ message: "Holiday added successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to add holiday. Date might already exist." });
  }
};