const pool = require("../db");
const xlsx = require("xlsx");

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
    const { shift_start_time, shift_end_time, grace_period_minutes, required_working_hours, casual_leave_notice_days, financial_year_start_month, financial_year_end_month, working_days, calculation_mode } = req.body;
    await pool.query(
      `UPDATE company_settings 
       SET shift_start_time=$1, shift_end_time=$2, grace_period_minutes=$3, required_working_hours=$4, casual_leave_notice_days=$5, financial_year_start_month=$6, financial_year_end_month=$7, working_days=$8, calculation_mode=$9
       WHERE id=1`,
      [shift_start_time, shift_end_time, grace_period_minutes, required_working_hours, casual_leave_notice_days || 0, financial_year_start_month || 1, financial_year_end_month || 12, working_days || [1,2,3,4,5,6], calculation_mode || 'WORKING_HOURS']
    );
    res.json({ message: "Settings updated successfully" });
  } catch (err) {
    console.error("Update Settings Error:", err);
    res.status(500).json({ error: err.message || "Failed to update settings" });
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

// Add to controllers/settingsController.js
exports.updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const { holiday_date, description } = req.body;
    await pool.query(
      "UPDATE company_holidays SET holiday_date = $1, description = $2 WHERE id = $3",
      [holiday_date, description, id]
    );
    res.json({ message: "Holiday updated" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update holiday" });
  }
};

exports.deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM company_holidays WHERE id = $1", [id]);
    res.json({ message: "Holiday deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete holiday" });
  }
};

exports.uploadHolidays = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    
    let inserted = 0;
    for (const row of data) {
      const dateVal = row.Date;
      const descVal = row.Description || "Holiday";
      if (dateVal) {
        let finalDate = dateVal;
        if (typeof dateVal === 'number') {
          // Convert Excel date serial to JS Date
          finalDate = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
        }
        await pool.query(
          "INSERT INTO company_holidays (holiday_date, description) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [finalDate, descVal]
        );
        inserted++;
      }
    }
    res.json({ message: `Successfully uploaded ${inserted} holidays` });
  } catch (err) {
    console.error("Excel upload error:", err);
    res.status(500).json({ error: "Failed to process Excel file" });
  }
};

// Shifts CRUD
exports.getShifts = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM shifts WHERE is_active = true ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch shifts" });
  }
};

exports.addShift = async (req, res) => {
  try {
    const { shift_name, shift_start_time, shift_end_time, half_day_mark_time, grace_period_minutes, required_working_hours, is_active } = req.body;
    if (!shift_name || !shift_start_time || !shift_end_time) {
      return res.status(400).json({ error: "shift_name, shift_start_time, and shift_end_time are required" });
    }
    const result = await pool.query(
      `INSERT INTO shifts (shift_name, shift_start_time, shift_end_time, half_day_mark_time, grace_period_minutes, required_working_hours, is_active)
       VALUES ($1, $2, $3, COALESCE($4, '13:00:00'), COALESCE($5, 15), COALESCE($6, 8.0), COALESCE($7, true))
       RETURNING *`,
      [shift_name, shift_start_time, shift_end_time, half_day_mark_time, grace_period_minutes, required_working_hours, is_active]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to add shift" });
  }
};

exports.updateShift = async (req, res) => {
  try {
    const { id } = req.params;
    const { shift_name, shift_start_time, shift_end_time, half_day_mark_time, grace_period_minutes, required_working_hours, is_active } = req.body;
    if (!shift_name || !shift_start_time || !shift_end_time) {
      return res.status(400).json({ error: "shift_name, shift_start_time, and shift_end_time are required" });
    }
    const result = await pool.query(
      `UPDATE shifts
       SET shift_name = $1, shift_start_time = $2, shift_end_time = $3, half_day_mark_time = $4, grace_period_minutes = $5, required_working_hours = $6, is_active = $7
       WHERE id = $8
       RETURNING *`,
      [shift_name, shift_start_time, shift_end_time, half_day_mark_time, grace_period_minutes, required_working_hours, is_active, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Shift not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update shift" });
  }
};

exports.deleteShift = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("UPDATE shifts SET is_active = false WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Shift not found" });
    }
    res.json({ message: "Shift deleted successfully", shift: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete shift" });
  }
};

// Departments CRUD
exports.getDepartments = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, COUNT(e.id) as total_employees
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id AND e.is_active = true
      WHERE d.is_active = true
      GROUP BY d.id
      ORDER BY d.id
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch departments" });
  }
};

exports.addDepartment = async (req, res) => {
  try {
    const { department_name, max_concurrent_leaves } = req.body;
    if (!department_name) {
      return res.status(400).json({ error: "department_name is required" });
    }
    const result = await pool.query(
      "INSERT INTO departments (department_name, max_concurrent_leaves) VALUES ($1, $2) RETURNING *",
      [department_name, max_concurrent_leaves]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to add department" });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { department_name, max_concurrent_leaves } = req.body;
    if (!department_name) {
      return res.status(400).json({ error: "department_name is required" });
    }
    const result = await pool.query(
      "UPDATE departments SET department_name = $1, max_concurrent_leaves = $2 WHERE id = $3 RETURNING *",
      [department_name, max_concurrent_leaves, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Department not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update department" });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("UPDATE departments SET is_active = false WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Department not found" });
    }
    res.json({ message: "Department deleted successfully", department: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete department" });
  }
};

// Employee Levels CRUD
exports.getLevels = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM employee_levels WHERE is_active = true ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch employee levels" });
  }
};

exports.addLevel = async (req, res) => {
  try {
    console.log("Adding level:", req.body);
    const { level_name } = req.body;
    if (!level_name) {
      console.log("level_name missing");
      return res.status(400).json({ error: "level_name is required" });
    }
    const result = await pool.query(
      "INSERT INTO employee_levels (level_name) VALUES ($1) ON CONFLICT (level_name) DO UPDATE SET is_active = true WHERE employee_levels.is_active = false RETURNING *",
      [level_name]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: "A level with this name already exists." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error adding level:", err);
    if (err.code === '23505') {
      return res.status(400).json({ error: "A level with this name already exists." });
    }
    res.status(500).json({ error: "Failed to add employee level" });
  }
};

exports.updateLevel = async (req, res) => {
  try {
    const { id } = req.params;
    const { level_name } = req.body;
    if (!level_name) {
      return res.status(400).json({ error: "level_name is required" });
    }
    const result = await pool.query(
      "UPDATE employee_levels SET level_name = $1 WHERE id = $2 RETURNING *",
      [level_name, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Employee level not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: "A level with this name already exists." });
    }
    res.status(500).json({ error: "Failed to update employee level" });
  }
};

exports.deleteLevel = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("UPDATE employee_levels SET is_active = false WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Employee level not found" });
    }
    res.json({ message: "Employee level deleted successfully", level: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete employee level" });
  }
};
exports.getCustomLeaves = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const year = new Date().getFullYear();
    const result = await pool.query(
      "SELECT leave_type_id, allocated_days FROM custom_leave_allocations WHERE employee_id = $1 AND year = $2",
      [employee_id, year]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch custom leaves" });
  }
};

exports.setCustomLeaves = async (req, res) => {
  try {
    const { employee_id, allocations } = req.body; // allocations: [{leave_type_id, allocated_days}]
    const year = new Date().getFullYear();
    
    // Begin transaction
    await pool.query('BEGIN');
    
    for (let alloc of allocations) {
      await pool.query(`
        INSERT INTO custom_leave_allocations (employee_id, leave_type_id, year, allocated_days)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (employee_id, leave_type_id, year) 
        DO UPDATE SET allocated_days = EXCLUDED.allocated_days
      `, [employee_id, alloc.leave_type_id, year, alloc.allocated_days]);
    }
    
    await pool.query('COMMIT');
    res.json({ message: "Custom leave allocations saved successfully" });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: "Failed to save custom leaves" });
  }
};
