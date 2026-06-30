const pool = require("../db");
const { computeWarningsAndStats } = require("./helpers");

exports.requestLeave = async (req, res) => {
  try {
    const { employee_id, start_date, end_date, reason, leave_type_id, leave_portion, hourly_duration } = req.body;

    // Ensure we have a valid end date for single-day leaves
    const finalEndDate = end_date || start_date;

    // Get employee's manager
    const empResult = await pool.query("SELECT manager_id, role_id FROM employees WHERE id = $1", [employee_id]);
    const managerId = empResult.rows[0]?.manager_id;
    const roleId = empResult.rows[0]?.role_id;
    
    let initialStatus = 'PENDING_MANAGER';
    if (!managerId) {
      initialStatus = 'APPROVED'; // If no manager (like Super Admin), maybe auto-approve, though Super Admin doesn't request.
    } else if (managerId === 1) {
      // Sub Admin requesting leave goes directly to Super Admin
      initialStatus = 'PENDING_ADMIN';
    }

    const documentUrl = req.file ? req.file.path : null;
    const { warnings, stats } = await computeWarningsAndStats(employee_id, leave_type_id, start_date, finalEndDate);

    const query = `
      INSERT INTO leave_requests (employee_id, start_date, end_date, reason, leave_type_id, leave_portion, hourly_duration, status, document_url, warnings)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;
    
    const values = [employee_id, start_date, finalEndDate, reason, leave_type_id, leave_portion || 'FULL_DAY', hourly_duration || null, initialStatus, documentUrl, JSON.stringify(warnings)];

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

exports.validateLeave = async (req, res) => {
  try {
    const { employee_id, start_date, end_date, leave_type_id } = req.body;
    if (!employee_id || !start_date) {
      return res.json({ warnings: [], stats: {} });
    }
    const finalEndDate = end_date || start_date;
    const { warnings, stats } = await computeWarningsAndStats(employee_id, leave_type_id, start_date, finalEndDate);
    res.json({ warnings, stats });
  } catch (err) {
    console.error("Error validating leave:", err.message);
    res.status(500).json({ error: "Server error while validating leave." });
  }
};

exports.getMyLeaves = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        l.*, 
        t.name as leave_type_name, 
        e.name as resolved_by_name, 
        f.name as forwarded_by_name,
        CASE 
          WHEN l.leave_portion = 'FULL_DAY' THEN (l.end_date - l.start_date) + 1
          WHEN l.leave_portion IN ('FIRST_HALF', 'SECOND_HALF', 'HALF_DAY') THEN 0.5
          WHEN l.leave_portion = 'HOURLY' THEN l.hourly_duration / 8.0
          ELSE 1
        END as total_days,
        CASE 
          WHEN l.status = 'PENDING_MANAGER' AND l.forwarded_by_id IS NOT NULL THEN fwd_mgr.name
          WHEN l.status IN ('PENDING', 'PENDING_MANAGER') THEN emp_mgr.name
          ELSE NULL
        END as pending_manager_name,
        CASE 
          WHEN l.status = 'PENDING_MANAGER' AND l.forwarded_by_id IS NOT NULL THEN fwd_mgr_level.level_name
          WHEN l.status IN ('PENDING', 'PENDING_MANAGER') THEN emp_mgr_level.level_name
          ELSE NULL
        END as pending_manager_level
      FROM leave_requests l
      LEFT JOIN leave_types t ON l.leave_type_id = t.id
      LEFT JOIN employees e ON l.resolved_by_id = e.id
      LEFT JOIN employees f ON l.forwarded_by_id = f.id
      LEFT JOIN employees req_emp ON l.employee_id = req_emp.id
      LEFT JOIN employees emp_mgr ON req_emp.manager_id = emp_mgr.id
      LEFT JOIN employee_levels emp_mgr_level ON emp_mgr.level_id = emp_mgr_level.id
      LEFT JOIN employees fwd_mgr ON f.manager_id = fwd_mgr.id
      LEFT JOIN employee_levels fwd_mgr_level ON fwd_mgr.level_id = fwd_mgr_level.id
      WHERE l.employee_id = $1 ORDER BY l.applied_on DESC
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch leaves" });
  }
};

exports.getAllLeaves = async (req, res) => {
  try {
    const { requester_id, is_super_admin } = req.query;
    let queryParams = [];
    let whereClause = "";

    if (is_super_admin !== 'true' && requester_id) {
      whereClause = "WHERE e.manager_id = $1 OR (l.forwarded_by_id IS NOT NULL AND m.manager_id = $1)";
      queryParams.push(requester_id);
    }

    const result = await pool.query(`
      SELECT l.*, t.name as leave_type_name, e.name, e.employee_code, m.name as forwarded_by_name,
             e.manager_id as employee_manager_id,
             m.manager_id as forwarder_manager_id,
             d.department_name,
             d.max_concurrent_leaves,
             s.shift_name,
             (
               SELECT COUNT(DISTINCT lr2.employee_id)
               FROM leave_requests lr2
               JOIN employees e2 ON lr2.employee_id = e2.id
               WHERE e2.department_id = e.department_id 
                 AND lr2.status = 'APPROVED'
                 AND lr2.employee_id != e.id
                 AND (lr2.start_date <= l.end_date AND lr2.end_date >= l.start_date)
             ) as concurrent_leaves,
             CASE 
               WHEN l.leave_portion = 'FULL_DAY' THEN (l.end_date - l.start_date) + 1
               WHEN l.leave_portion IN ('FIRST_HALF', 'SECOND_HALF', 'HALF_DAY') THEN 0.5
               WHEN l.leave_portion = 'HOURLY' THEN l.hourly_duration / 8.0
               ELSE 1
             END as total_days
      FROM leave_requests l
      JOIN employees e ON l.employee_id = e.id
      LEFT JOIN employees m ON l.forwarded_by_id = m.id
      LEFT JOIN leave_types t ON l.leave_type_id = t.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN shifts s ON e.shift_id = s.id
      ${whereClause}
      ORDER BY l.applied_on DESC
    `, queryParams);
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
    const { admin_id, remarks } = req.body;
    const result = await pool.query(
      "UPDATE leave_requests SET status = 'APPROVED', resolved_by_id = $1, resolved_at = CURRENT_TIMESTAMP, resolution_remarks = $2 WHERE id = $3 RETURNING *", 
      [admin_id || null, remarks || null, id]
    );
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
    const { manager_id, remarks } = req.body;
    
    const mgrResult = await pool.query("SELECT manager_id FROM employees WHERE id = $1", [manager_id]);
    const nextManagerId = mgrResult.rows[0]?.manager_id;
    
    let newStatus = 'PENDING_MANAGER';
    if (!nextManagerId || nextManagerId === 1) {
      newStatus = 'PENDING_ADMIN';
    }

    await pool.query(
      "UPDATE leave_requests SET status = $1, forwarded_by_id = $2, forwarded_at = CURRENT_TIMESTAMP, resolution_remarks = $3 WHERE id = $4", 
      [newStatus, manager_id, remarks || null, id]
    );
    res.json({ message: "Leave forwarded successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to forward leave" });
  }
};

exports.rejectLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason, resolver_id } = req.body;
    if (!rejection_reason) return res.status(400).json({ error: "Rejection reason is required." });
    
    const result = await pool.query("UPDATE leave_requests SET status = 'REJECTED', resolution_remarks = $1, resolved_by_id = $2, resolved_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *", [rejection_reason, resolver_id || null, id]);
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
    const { name, min_advance_notice_days, requires_documentation, max_consecutive_days, is_active, is_encashable, is_carry_forwardable } = req.body;
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }
    const result = await pool.query(
      `INSERT INTO leave_types (name, min_advance_notice_days, requires_documentation, max_consecutive_days, is_active, is_encashable, is_carry_forwardable)
       VALUES ($1, COALESCE($2, 0), COALESCE($3, false), $4, COALESCE($5, true), COALESCE($6, false), COALESCE($7, false))
       RETURNING *`,
      [name, min_advance_notice_days, requires_documentation, max_consecutive_days, is_active, is_encashable, is_carry_forwardable]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to add leave type" });
  }
};

exports.updateLeaveType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, min_advance_notice_days, requires_documentation, max_consecutive_days, is_active, is_encashable, is_carry_forwardable } = req.body;
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }
    const result = await pool.query(
      `UPDATE leave_types
       SET name = $1, min_advance_notice_days = $2, requires_documentation = $3, max_consecutive_days = $4, is_active = $5, is_encashable = $6, is_carry_forwardable = $7
       WHERE id = $8
       RETURNING *`,
      [name, min_advance_notice_days, requires_documentation, max_consecutive_days, is_active, is_encashable, is_carry_forwardable, id]
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
    
    // Get level_id for the employee
    const empRes = await pool.query("SELECT level_id FROM employees WHERE id = $1", [id]);
    if (empRes.rows.length === 0) return res.status(404).json({ error: "Employee not found" });
    const levelId = empRes.rows[0]?.level_id || null;

    // Get all leave types
    const leaveTypesRes = await pool.query("SELECT id as leave_type_id, name as leave_type_name, is_encashable, is_carry_forwardable FROM leave_types WHERE is_active = true");
    const leaveTypes = leaveTypesRes.rows;

    // Get entitlements for this level
    let entitlements = [];
    if (levelId) {
      const entitlementsRes = await pool.query(
        "SELECT leave_type_id, annual_quota FROM leave_entitlements WHERE level_id = $1", [levelId]
      );
      entitlements = entitlementsRes.rows;
    }

    const takenRes = await pool.query(
      `SELECT leave_type_id, SUM(
          CASE 
            WHEN leave_portion = 'FULL_DAY' THEN (end_date - start_date) + 1
            WHEN leave_portion IN ('FIRST_HALF', 'SECOND_HALF', 'HALF_DAY') THEN 0.5
            WHEN leave_portion = 'HOURLY' THEN hourly_duration / 8.0
            ELSE 1
          END
        ) as days_taken
       FROM leave_requests
       WHERE employee_id = $1 AND status = 'APPROVED'
       GROUP BY leave_type_id`, [id]
    );
    const taken = takenRes.rows;

    const requestedRes = await pool.query(
      `SELECT leave_type_id, SUM(
          CASE 
            WHEN leave_portion = 'FULL_DAY' THEN (end_date - start_date) + 1
            WHEN leave_portion IN ('FIRST_HALF', 'SECOND_HALF', 'HALF_DAY') THEN 0.5
            WHEN leave_portion = 'HOURLY' THEN hourly_duration / 8.0
            ELSE 1
          END
        ) as days_requested
       FROM leave_requests
       WHERE employee_id = $1 AND status IN ('PENDING', 'PENDING_MANAGER', 'PENDING_ADMIN')
       GROUP BY leave_type_id`, [id]
    );
    const requested = requestedRes.rows;

    // Get custom allocations
    const year = new Date().getFullYear();
    const customRes = await pool.query(
      "SELECT leave_type_id, allocated_days FROM custom_leave_allocations WHERE employee_id = $1 AND year = $2",
      [id, year]
    );
    const customAllocations = customRes.rows;

    // Get surrendered leaves (approved encashments / carry forwards)
    const surrenderedRes = await pool.query(
      `SELECT leave_type_id, SUM(days) as surrendered_days
       FROM leave_balance_actions
       WHERE employee_id = $1 AND status = 'APPROVED' AND EXTRACT(YEAR FROM applied_on) = $2
       GROUP BY leave_type_id`, [id, year]
    );
    const surrendered = surrenderedRes.rows;

    const balances = leaveTypes.map(lt => {
      const takenRecord = taken.find(t => t.leave_type_id === lt.leave_type_id);
      const daysTaken = takenRecord ? parseFloat(takenRecord.days_taken) : 0;
      
      const surrenderedRecord = surrendered.find(s => s.leave_type_id === lt.leave_type_id);
      const daysSurrendered = surrenderedRecord ? parseFloat(surrenderedRecord.surrendered_days) : 0;
      
      const requestedRecord = requested.find(r => r.leave_type_id === lt.leave_type_id);
      const daysRequested = requestedRecord ? parseFloat(requestedRecord.days_requested) : 0;
      
      const customRecord = customAllocations.find(c => c.leave_type_id === lt.leave_type_id);
      const entRecord = entitlements.find(e => e.leave_type_id === lt.leave_type_id);
      
      let allocated = 0;
      if (customRecord) {
        allocated = parseFloat(customRecord.allocated_days);
      } else if (entRecord) {
        allocated = parseFloat(entRecord.annual_quota);
      }
      
      return {
        leave_type_id: lt.leave_type_id,
        leave_type_name: lt.leave_type_name,
        is_encashable: lt.is_encashable,
        is_carry_forwardable: lt.is_carry_forwardable,
        annual_quota: allocated,
        days_taken: daysTaken,
        days_surrendered: daysSurrendered,
        days_requested: daysRequested,
        balance: allocated - daysTaken - daysSurrendered - daysRequested
      };
    }); // removed the filter to show all leaves

    res.json(balances);
  } catch (err) {
    console.error("Failed to fetch leave balances:", err);
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

exports.getBalanceActions = async (req, res) => {
  try {
    const { employeeId } = req.query;
    let query = `
      SELECT ba.*, e.name as employee_name, e.employee_code, e.department_id, lt.name as leave_type_name
      FROM leave_balance_actions ba
      JOIN employees e ON ba.employee_id = e.id
      JOIN leave_types lt ON ba.leave_type_id = lt.id
    `;
    let values = [];
    if (employeeId) {
      query += ` WHERE ba.employee_id = $1 `;
      values.push(employeeId);
    }
    query += ` ORDER BY ba.applied_on DESC`;

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch balance actions" });
  }
};

exports.updateBalanceActionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolved_by } = req.body; // 'APPROVED' or 'REJECTED'

    await pool.query('BEGIN');
    
    // Update the action
    const updateRes = await pool.query(
      `UPDATE leave_balance_actions 
       SET status = $1, resolved_by = $2, resolved_on = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING *`,
      [status, resolved_by, id]
    );

    if (updateRes.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: "Action not found" });
    }

    const action = updateRes.rows[0];

    // If carry forward is approved, add it to next year's custom allocation
    if (status === 'APPROVED' && action.action_type === 'CARRY_FORWARD') {
      const nextYear = new Date().getFullYear() + 1;
      
      // Check if custom allocation exists for next year
      const checkRes = await pool.query(
        "SELECT id, allocated_days FROM custom_leave_allocations WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3",
        [action.employee_id, action.leave_type_id, nextYear]
      );

      if (checkRes.rows.length > 0) {
        // Update existing custom allocation
        await pool.query(
          "UPDATE custom_leave_allocations SET allocated_days = allocated_days + $1 WHERE id = $2",
          [action.days, checkRes.rows[0].id]
        );
      } else {
        // Need to know what standard allocation would be to add to it, or just set it to standard + days.
        // Get employee level
        const empRes = await pool.query("SELECT level_id FROM employees WHERE id = $1", [action.employee_id]);
        const levelId = empRes.rows[0]?.level_id;
        
        let standardQuota = 0;
        if (levelId) {
          const entRes = await pool.query("SELECT annual_quota FROM leave_entitlements WHERE level_id = $1 AND leave_type_id = $2", [levelId, action.leave_type_id]);
          if (entRes.rows.length > 0) {
            standardQuota = parseFloat(entRes.rows[0].annual_quota);
          }
        }

        const totalNextYear = standardQuota + parseFloat(action.days);

        await pool.query(
          "INSERT INTO custom_leave_allocations (employee_id, leave_type_id, allocated_days, year) VALUES ($1, $2, $3, $4)",
          [action.employee_id, action.leave_type_id, totalNextYear, nextYear]
        );
      }
    }

    await pool.query('COMMIT');
    res.json({ message: "Action updated successfully", action });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error("Error updating balance action:", err);
    res.status(500).json({ error: "Failed to update balance action" });
  }
};