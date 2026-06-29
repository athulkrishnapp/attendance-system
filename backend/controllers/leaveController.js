const pool = require("../db");

exports.requestLeave = async (req, res) => {
  try {
    const { employee_id, start_date, end_date, reason, leave_type_id, leave_portion, hourly_duration } = req.body;

    // Ensure we have a valid end date for single-day leaves
    const finalEndDate = end_date || start_date;

    // Get employee's manager
    const empResult = await pool.query("SELECT manager_id FROM employees WHERE id = $1", [employee_id]);
    const managerId = empResult.rows[0]?.manager_id;
    const initialStatus = managerId ? 'PENDING_MANAGER' : 'PENDING_ADMIN';
    const documentUrl = req.file ? req.file.path : null;

    const query = `
      INSERT INTO leave_requests (employee_id, start_date, end_date, reason, leave_type_id, leave_portion, hourly_duration, status, document_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    
    const values = [employee_id, start_date, finalEndDate, reason, leave_type_id, leave_portion || 'FULL_DAY', hourly_duration || null, initialStatus, documentUrl];

    const result = await pool.query(query, values);
    
    res.status(201).json({ 
        message: "Leave requested successfully", 
        leave: result.rows[0] 
    });

  } catch (error) {
    console.error("Error requesting leave:", error.message);
    res.status(500).json({ error: "Server error while requesting leave." });
  }
};

exports.getMyLeaves = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM leave_requests WHERE employee_id = $1 ORDER BY applied_on DESC", [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch leaves" });
  }
};

exports.getAllLeaves = async (req, res) => {
  try {
    // Join with employees table so the Admin sees names, not just IDs
    const result = await pool.query(`
      SELECT l.*, e.name, e.employee_code, m.name as forwarded_by_name
      FROM leave_requests l
      JOIN employees e ON l.employee_id = e.id
      LEFT JOIN employees m ON l.forwarded_by_id = m.id
      ORDER BY l.applied_on DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch all leaves" });
  }
};

exports.updateLeaveStatus = async (req, res) => {
  try {
    const { leave_id, status } = req.body; // status will be 'APPROVED' or 'REJECTED'
    await pool.query("UPDATE leave_requests SET status = $1 WHERE id = $2", [status, leave_id]);
    res.json({ message: `Leave request ${status.toLowerCase()} successfully.` });
  } catch (err) {
    res.status(500).json({ error: "Failed to update leave status" });
  }
};

exports.approveLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("UPDATE leave_requests SET status = 'APPROVED' WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Leave request not found" });
    
    const leave = result.rows[0];
    
    const { employee_id, start_date, end_date, leave_portion } = leave;
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    
    for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;
        
        let coreStatus = 'LEAVE';
        let flag = 'LEAVE_APPROVED';
        
        if (leave_portion === 'FIRST_HALF') {
            coreStatus = 'HALF_DAY';
            flag = 'HALF_DAY_FN';
        } else if (leave_portion === 'SECOND_HALF') {
            coreStatus = 'HALF_DAY';
            flag = 'HALF_DAY_AN';
        }
        
        await pool.query(`
            INSERT INTO attendance_summary (employee_id, attendance_date, core_status, modifier_flags, remarks, working_hours)
            VALUES ($1, $2, $3, $4, 'Leave Approved', 0)
            ON CONFLICT (employee_id, attendance_date)
            DO UPDATE SET 
                core_status = EXCLUDED.core_status, 
                modifier_flags = COALESCE(attendance_summary.modifier_flags, '[]'::jsonb) || EXCLUDED.modifier_flags,
                remarks = 'Leave Approved'
        `, [employee_id, dateKey, coreStatus, JSON.stringify([flag])]);
    }

    res.json({ message: "Leave approved successfully.", leave });
  } catch (err) {
    res.status(500).json({ error: "Failed to approve leave" });
  }
};

exports.forwardLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { manager_id } = req.body;
    await pool.query("UPDATE leave_requests SET status = 'PENDING_ADMIN', forwarded_by_id = $1 WHERE id = $2", [manager_id, id]);
    res.json({ message: "Leave forwarded to Admin successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to forward leave" });
  }
};

exports.rejectLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;
    if (!rejection_reason) return res.status(400).json({ error: "Rejection reason is required." });
    
    const result = await pool.query("UPDATE leave_requests SET status = 'REJECTED', rejection_reason = $1 WHERE id = $2 RETURNING *", [rejection_reason, id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Leave request not found" });
    res.json({ message: "Leave rejected successfully.", leave: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to reject leave" });
  }
};

// Leave Types CRUD
exports.getLeaveTypes = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM leave_types ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch leave types" });
  }
};

exports.addLeaveType = async (req, res) => {
  try {
    const { name, min_advance_notice_days, requires_documentation, max_consecutive_days, is_active } = req.body;
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }
    const result = await pool.query(
      `INSERT INTO leave_types (name, min_advance_notice_days, requires_documentation, max_consecutive_days, is_active)
       VALUES ($1, COALESCE($2, 0), COALESCE($3, false), $4, COALESCE($5, true))
       RETURNING *`,
      [name, min_advance_notice_days, requires_documentation, max_consecutive_days, is_active]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to add leave type" });
  }
};

exports.updateLeaveType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, min_advance_notice_days, requires_documentation, max_consecutive_days, is_active } = req.body;
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }
    const result = await pool.query(
      `UPDATE leave_types
       SET name = $1, min_advance_notice_days = $2, requires_documentation = $3, max_consecutive_days = $4, is_active = $5
       WHERE id = $6
       RETURNING *`,
      [name, min_advance_notice_days, requires_documentation, max_consecutive_days, is_active, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Leave type not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update leave type" });
  }
};

exports.deleteLeaveType = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM leave_types WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Leave type not found" });
    res.json({ message: "Leave type deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete leave type" });
  }
};

// Leave Entitlements
exports.getLeaveEntitlements = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT le.*, el.level_name, lt.name as leave_type_name
      FROM leave_entitlements le
      LEFT JOIN employee_levels el ON le.level_id = el.id
      LEFT JOIN leave_types lt ON le.leave_type_id = lt.id
      ORDER BY le.id
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch leave entitlements" });
  }
};

exports.addLeaveEntitlement = async (req, res) => {
  try {
    const { level_id, leave_type_id, annual_quota } = req.body;
    if (level_id === undefined || leave_type_id === undefined || annual_quota === undefined) {
      return res.status(400).json({ error: "level_id, leave_type_id, and annual_quota are required" });
    }
    const result = await pool.query(
      `INSERT INTO leave_entitlements (level_id, leave_type_id, annual_quota)
       VALUES ($1, $2, $3)
       ON CONFLICT (level_id, leave_type_id)
       DO UPDATE SET annual_quota = EXCLUDED.annual_quota
       RETURNING *`,
      [level_id, leave_type_id, annual_quota]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to add leave entitlement" });
  }
};

exports.updateLeaveEntitlement = async (req, res) => {
  try {
    const { id } = req.params;
    const { level_id, leave_type_id, annual_quota } = req.body;
    if (level_id === undefined || leave_type_id === undefined || annual_quota === undefined) {
      return res.status(400).json({ error: "level_id, leave_type_id, and annual_quota are required" });
    }
    const result = await pool.query(
      `UPDATE leave_entitlements SET level_id = $1, leave_type_id = $2, annual_quota = $3 WHERE id = $4 RETURNING *`,
      [level_id, leave_type_id, annual_quota, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Entitlement not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update entitlement" });
  }
};

exports.deleteLeaveEntitlement = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM leave_entitlements WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Entitlement not found" });
    res.json({ message: "Entitlement deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete entitlement" });
  }
};

// Leave Balances
exports.getLeaveBalances = async (req, res) => {
  try {
    const { id } = req.params; 
    
    const empRes = await pool.query("SELECT level_id FROM employees WHERE id = $1", [id]);
    const levelId = empRes.rows[0]?.level_id;
    if (!levelId) return res.status(404).json({ error: "Employee level not found" });

    const entitlementsRes = await pool.query(
      `SELECT le.annual_quota, lt.id as leave_type_id, lt.name as leave_type_name
       FROM leave_entitlements le
       JOIN leave_types lt ON le.leave_type_id = lt.id
       WHERE le.level_id = $1`, [levelId]
    );

    const takenRes = await pool.query(
      `SELECT leave_type_id, SUM(
          CASE 
            WHEN leave_portion = 'FULL_DAY' THEN EXTRACT(DAY FROM (end_date - start_date)) + 1
            WHEN leave_portion IN ('FIRST_HALF', 'SECOND_HALF', 'HALF_DAY') THEN 0.5
            WHEN leave_portion = 'HOURLY' THEN hourly_duration / 8.0
            ELSE 1
          END
        ) as days_taken
       FROM leave_requests
       WHERE employee_id = $1 AND status = 'APPROVED'
       GROUP BY leave_type_id`, [id]
    );

    const balances = entitlementsRes.rows.map(ent => {
      const takenRecord = takenRes.rows.find(t => t.leave_type_id === ent.leave_type_id);
      const daysTaken = takenRecord ? parseFloat(takenRecord.days_taken) : 0;
      return {
        leave_type_id: ent.leave_type_id,
        leave_type_name: ent.leave_type_name,
        annual_quota: parseFloat(ent.annual_quota),
        days_taken: daysTaken,
        balance: parseFloat(ent.annual_quota) - daysTaken
      };
    });

    res.json(balances);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch leave balances" });
  }
};

exports.requestBalanceAction = async (req, res) => {
  try {
    const { employee_id, leave_type_id, action_type, days } = req.body;
    await pool.query(
      `INSERT INTO leave_balance_actions (employee_id, leave_type_id, action_type, days, status)
       VALUES ($1, $2, $3, $4, 'PENDING')`,
      [employee_id, leave_type_id, action_type, days]
    );
    res.json({ message: "Request submitted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to request balance action" });
  }
};