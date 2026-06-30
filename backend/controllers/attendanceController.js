const pool = require("../db");
const xlsx = require("xlsx");
const fs = require("fs");

exports.uploadAttendance = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Please upload an Excel file" });
    }

    // 1. Fetch Company Settings & Holidays from Database
    const settingsRes = await pool.query("SELECT * FROM company_settings LIMIT 1");
    const settings = settingsRes.rows[0] || {
      shift_start_time: '09:00:00',
      shift_end_time: '18:00:00', // Default fallback
      grace_period_minutes: 15,
      required_working_hours: 8
    };

    const holidaysRes = await pool.query("SELECT holiday_date, description FROM company_holidays");
    const holidayMap = {};
    holidaysRes.rows.forEach(h => {
      const dateStr = h.holiday_date.toISOString().split('T')[0];
      holidayMap[dateStr] = h.description;
    });

    const employeesRes = await pool.query(`
      SELECT e.id, e.employee_code, s.shift_start_time, s.shift_end_time, s.grace_period_minutes, s.required_working_hours, s.half_day_mark_time
      FROM employees e
      LEFT JOIN shifts s ON e.shift_id = s.id
    `);
    const empMap = {};
    employeesRes.rows.forEach(emp => {
      empMap[emp.employee_code] = {
        id: emp.id,
        shift_start_time: emp.shift_start_time,
        shift_end_time: emp.shift_end_time,
        grace_period_minutes: emp.grace_period_minutes,
        required_working_hours: emp.required_working_hours,
        half_day_mark_time: emp.half_day_mark_time
      };
    });

    const leavesRes = await pool.query(`
      SELECT employee_id, start_date, end_date, duration, leave_portion, hourly_duration 
      FROM leave_requests 
      WHERE status = 'APPROVED'
    `);
    
    // Helper to format Date to YYYY-MM-DD in local time
    const formatDate = (dateObj) => {
        const d = new Date(dateObj);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const leaveMap = {}; // leaveMap[empId][dateStr] = leaveDetails
    leavesRes.rows.forEach(leave => {
        let current = new Date(leave.start_date);
        const end = new Date(leave.end_date);
        
        while (current <= end) {
            const dateStr = formatDate(current);
            if (!leaveMap[leave.employee_id]) leaveMap[leave.employee_id] = {};
            leaveMap[leave.employee_id][dateStr] = leave;
            current.setDate(current.getDate() + 1);
        }
    });

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    await pool.query(
      "INSERT INTO upload_history (file_name, uploaded_by, records_imported) VALUES ($1, $2, $3) RETURNING id",
      [req.file.originalname, 1, data.length]
    );

    const dailySummaries = {};

    // Inside attendanceController.js - Replace the loop logic

    for (const row of data) {
      const empInfo = empMap[row.employee_code];
      if (!empInfo) continue;
      const actualEmployeeId = empInfo.id;

      // Robust parsing: Enforce Local Timezone interpretation to prevent UTC shift
      let scanDateObj;
      if (typeof row.scan_time === 'number') {
        // Excel serial date (which includes date and time)
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const utcDate = new Date(excelEpoch.getTime() + Math.round(row.scan_time * 86400000));
        // Construct LOCAL date using UTC parts to prevent shift
        scanDateObj = new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate(), utcDate.getUTCHours(), utcDate.getUTCMinutes(), utcDate.getUTCSeconds());
      } else if (typeof row.scan_time === 'string') {
        // Try strict manual parsing first to prevent timezone shifts
        const cleanedStr = row.scan_time.trim().replace(/\//g, '-');
        const [datePart, timePart] = cleanedStr.split(' ');

        if (datePart && timePart) {
          const [year, month, day] = datePart.split('-');
          const [hour, minute, second] = timePart.split(':');
          scanDateObj = new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
        } else {
          scanDateObj = new Date(row.scan_time);
        }
      } else {
        scanDateObj = new Date(row.scan_time);
      }

      if (isNaN(scanDateObj.getTime())) {
        continue; // Prevent Invalid Dates from entering the array and destroying the sort function
      }

      const shiftStartTimeStr = empInfo.shift_start_time || settings.shift_start_time || '09:00:00';
      const [shiftHr, shiftMin] = shiftStartTimeStr.split(':').map(Number);
      
      let logicalDateObj = new Date(scanDateObj);
      const boundaryTime = new Date(scanDateObj.getFullYear(), scanDateObj.getMonth(), scanDateObj.getDate(), shiftHr, shiftMin, 0);
      boundaryTime.setHours(boundaryTime.getHours() - 4);

      if (scanDateObj < boundaryTime) {
        logicalDateObj.setDate(logicalDateObj.getDate() - 1);
      }

      const yearStr = logicalDateObj.getFullYear();
      const monthStr = String(logicalDateObj.getMonth() + 1).padStart(2, '0');
      const dayStr = String(logicalDateObj.getDate()).padStart(2, '0');
      const dateKey = `${yearStr}-${monthStr}-${dayStr}`;

      await pool.query(
        "INSERT INTO attendance_logs (employee_id, scan_time, source, device_id) VALUES ($1, $2, $3, $4)",
        [actualEmployeeId, scanDateObj, 'EXCEL', 'MAIN_GATE']
      );

      const summaryKey = `${actualEmployeeId}_${dateKey}`;
      if (!dailySummaries[summaryKey]) {
        dailySummaries[summaryKey] = {
          employee_id: actualEmployeeId,
          attendance_date: dateKey,
          scans: []
        };
      }
      dailySummaries[summaryKey].scans.push(scanDateObj);
    }

    for (const key in dailySummaries) {
      const record = dailySummaries[key];
      record.scans.sort((a, b) => a - b);

      const firstIn = record.scans[0];
      const lastOut = record.scans[record.scans.length - 1];
      const workingHours = parseFloat(((lastOut - firstIn) / (1000 * 60 * 60)).toFixed(2));

      const holidayName = holidayMap[record.attendance_date];
      const dayOfWeek = firstIn.getDay();
      const workingDays = settings.working_days || [1, 2, 3, 4, 5, 6];
      const isWeekend = !workingDays.includes(dayOfWeek);

      // Fetch employee shift or use defaults
      const empInfo = Object.values(empMap).find(e => e.id === record.employee_id);
      const shiftStartTime = empInfo?.shift_start_time || settings.shift_start_time;
      const gracePeriod = empInfo?.grace_period_minutes !== null && empInfo?.grace_period_minutes !== undefined ? empInfo.grace_period_minutes : settings.grace_period_minutes;
      const requiredHours = empInfo?.required_working_hours !== null && empInfo?.required_working_hours !== undefined ? parseFloat(empInfo.required_working_hours) : parseFloat(settings.required_working_hours);

      // Determine Status
      let core_status = 'PRESENT';
      let modifier_flags = [];

      if (record.scans.length === 1) core_status = 'MISSING_PUNCH';
      else if (workingHours === 0) core_status = 'ABSENT';

      // Apply Overrides
      if (isWeekend) {
        core_status = 'WEEKEND';
        if (workingHours > 0) modifier_flags.push('WEEKEND_WORK');
      } else if (holidayName) {
        core_status = 'HOLIDAY';
        if (workingHours > 0) modifier_flags.push('HOLIDAY_WORK');
      }

      // Apply Leaves
      const approvedLeave = leaveMap[record.employee_id]?.[record.attendance_date];
      
      if (approvedLeave) {
        if (approvedLeave.duration === 'Full Day') {
          core_status = 'LEAVE';
        } else if (approvedLeave.duration === 'Hourly') {
          modifier_flags.push('HOURLY_LEAVE');
        } else if (approvedLeave.duration === 'Half Day') {
          core_status = 'HALF_DAY';
          if (approvedLeave.leave_portion === 'FIRST_HALF') modifier_flags.push('HALF_DAY_FN');
          if (approvedLeave.leave_portion === 'SECOND_HALF') modifier_flags.push('HALF_DAY_AN');
        }
      }

      if (core_status === 'PRESENT') {
        const [shiftHr, shiftMin] = shiftStartTime.split(':').map(Number);
        const [logicalYear, logicalMonth, logicalDay] = record.attendance_date.split('-').map(Number);
        
        const expectedStartDate = new Date(logicalYear, logicalMonth - 1, logicalDay, shiftHr, shiftMin, 0);
        const maxGraceDate = new Date(expectedStartDate.getTime() + (gracePeriod * 60000));
        
        const shiftEndHrStr = empInfo?.shift_end_time || settings.shift_end_time || '18:00:00';
        const [shiftEndHr, shiftEndMin] = shiftEndHrStr.split(':').map(Number);
        const expectedEndDate = new Date(logicalYear, logicalMonth - 1, logicalDay, shiftEndHr, shiftEndMin, 0);
        
        const halfDayThreshold = empInfo?.half_day_mark_time || '13:00:00';
        const [halfHr, halfMin] = halfDayThreshold.split(':').map(Number);
        const halfDayThresholdDate = new Date(logicalYear, logicalMonth - 1, logicalDay, halfHr, halfMin, 0);
        
        if (halfDayThresholdDate < expectedStartDate) {
            halfDayThresholdDate.setDate(halfDayThresholdDate.getDate() + 1);
        }
        if (expectedEndDate < expectedStartDate) {
            expectedEndDate.setDate(expectedEndDate.getDate() + 1);
        }

        const halfRequiredHours = requiredHours / 2;
        
        if (workingHours < halfRequiredHours) {
            core_status = 'HALF_DAY';
        } else if (firstIn >= halfDayThresholdDate || lastOut <= halfDayThresholdDate) {
            core_status = 'HALF_DAY';
        } else {
            if (firstIn > maxGraceDate) modifier_flags.push('LATE');
            if (workingHours > requiredHours) modifier_flags.push('OVERTIME');
            if (lastOut < expectedEndDate) modifier_flags.push('EARLY_EXIT');
        }

        // Flag for which half they worked, ONLY if it's a half day
        if (core_status === 'HALF_DAY' && workingHours > 0) {
            if (lastOut <= halfDayThresholdDate) modifier_flags.push('FIRST_HALF');
            else if (firstIn >= halfDayThresholdDate) modifier_flags.push('SECOND_HALF');
            else {
                modifier_flags.push('FIRST_HALF');
                modifier_flags.push('SECOND_HALF');
            }
        }
      }

      await pool.query(`
        INSERT INTO attendance_summary 
          (employee_id, attendance_date, first_in, last_out, working_hours, core_status, modifier_flags, remarks)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (employee_id, attendance_date) 
        DO UPDATE SET first_in = EXCLUDED.first_in, last_out = EXCLUDED.last_out, 
                      working_hours = EXCLUDED.working_hours, core_status = EXCLUDED.core_status, 
                      modifier_flags = EXCLUDED.modifier_flags, remarks = EXCLUDED.remarks
      `, [
        record.employee_id,
        record.attendance_date,
        String(firstIn.getHours()).padStart(2, '0') + ':' + String(firstIn.getMinutes()).padStart(2, '0') + ':' + String(firstIn.getSeconds()).padStart(2, '0'),
        String(lastOut.getHours()).padStart(2, '0') + ':' + String(lastOut.getMinutes()).padStart(2, '0') + ':' + String(lastOut.getSeconds()).padStart(2, '0'),
        workingHours,
        core_status,
        JSON.stringify(modifier_flags),
        "Processed"
      ]);
    }
    res.status(200).json({
      message: "Smart calculation complete!",
      recordsProcessed: data.length
    });

  } catch (err) {
    console.error("Smart Upload error:", err.message);
    res.status(500).json({ error: "Failed to process attendance file" });
  }
};

exports.requestRegularization = async (req, res) => {
  try {
    const { attendance_summary_id, employee_id, requested_first_in, requested_last_out, reason } = req.body;

    const empResult = await pool.query("SELECT manager_id FROM employees WHERE id = $1", [employee_id]);
    const managerId = empResult.rows[0]?.manager_id;
    const initialStatus = managerId ? 'PENDING_MANAGER' : 'PENDING_ADMIN';

    // Insert into regularization_requests
    await pool.query(
      `INSERT INTO regularization_requests 
       (attendance_summary_id, employee_id, requested_first_in, requested_last_out, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [attendance_summary_id, employee_id, requested_first_in, requested_last_out, reason, initialStatus]
    );

    // Update attendance_summary
    await pool.query(
      "UPDATE attendance_summary SET regularization_status = $1 WHERE id = $2",
      [initialStatus, attendance_summary_id]
    );

    res.status(201).json({ message: "Regularization requested successfully." });
  } catch (err) {
    console.error("Regularization error:", err);
    res.status(500).json({ error: "Failed to request regularization." });
  }
};

exports.getPendingRegularizations = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, e.name as employee_name, e.employee_code, m.name as forwarded_by_name
      FROM regularization_requests r
      JOIN employees e ON r.employee_id = e.id
      LEFT JOIN employees m ON r.forwarded_by_id = m.id
      WHERE r.status IN ('PENDING_MANAGER', 'PENDING_ADMIN', 'PENDING')
      ORDER BY r.applied_on ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch pending regularizations." });
  }
};

exports.processRegularization = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, manager_remarks, processed_by, rejection_reason } = req.body;

    if (status === 'REJECTED' && !rejection_reason) {
      return res.status(400).json({ error: "Rejection reason is required." });
    }

    const result = await pool.query(
      `UPDATE regularization_requests 
       SET status = $1, manager_remarks = $2, processed_by = $3, processed_on = CURRENT_TIMESTAMP, rejection_reason = $4
       WHERE id = $5
       RETURNING *`,
      [status, manager_remarks, processed_by, rejection_reason || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Regularization request not found." });
    }

    const regRequest = result.rows[0];

    if (status === 'APPROVED') {
      const { requested_first_in, requested_last_out, attendance_summary_id } = regRequest;

      const summaryResult = await pool.query("SELECT * FROM attendance_summary WHERE id = $1", [attendance_summary_id]);
      if (summaryResult.rows.length > 0) {
        const summary = summaryResult.rows[0];

        let workingHours = summary.working_hours;
        if (requested_first_in && requested_last_out) {
          const firstInDate = new Date(`1970-01-01T${requested_first_in}Z`);
          const lastOutDate = new Date(`1970-01-01T${requested_last_out}Z`);
          workingHours = parseFloat(((lastOutDate - firstInDate) / (1000 * 60 * 60)).toFixed(2));
        }

        let coreStatus = summary.core_status;
        if (coreStatus === 'MISSING_PUNCH') {
          coreStatus = 'PRESENT';
        }

        await pool.query(
          `UPDATE attendance_summary 
           SET first_in = $1, last_out = $2, working_hours = $3, core_status = $4, 
               regularization_status = 'APPROVED', regularization_manager_id = $5,
               modifier_flags = COALESCE(modifier_flags, '[]'::jsonb) || '["REGULARIZED"]'::jsonb
           WHERE id = $6`,
          [requested_first_in || summary.first_in, requested_last_out || summary.last_out, workingHours, coreStatus, processed_by, attendance_summary_id]
        );
      }
    } else {
      await pool.query(
        "UPDATE attendance_summary SET regularization_status = 'REJECTED' WHERE id = $1",
        [regRequest.attendance_summary_id]
      );
    }

    res.json({ message: `Regularization ${status.toLowerCase()} successfully.`, regularization: regRequest });
  } catch (err) {
    console.error("Process Regularization Error:", err);
    res.status(500).json({ error: "Failed to process regularization." });
  }
};

exports.forwardRegularization = async (req, res) => {
  try {
    const { id } = req.params;
    const { manager_id, attendance_summary_id } = req.body;
    await pool.query("UPDATE regularization_requests SET status = 'PENDING_ADMIN', forwarded_by_id = $1 WHERE id = $2", [manager_id, id]);
    await pool.query("UPDATE attendance_summary SET regularization_status = 'PENDING_ADMIN' WHERE id = $1", [attendance_summary_id]);
    res.json({ message: "Regularization forwarded to Admin successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to forward regularization" });
  }
};

// --- NEW CALENDAR & EDIT ENDPOINTS ---

// 1. Get uploaded dates for a specific month
exports.getCalendarStatus = async (req, res) => {
  try {
    const { month } = req.params; // Expected format: YYYY-MM

    // Fetch uploaded attendance dates
    const result = await pool.query(
      `SELECT DISTINCT TO_CHAR(attendance_date, 'YYYY-MM-DD') as date 
       FROM attendance_summary 
       WHERE TO_CHAR(attendance_date, 'YYYY-MM') = $1`,
      [month]
    );
    const uploadedDates = result.rows.map(row => row.date);

    // Fetch company holidays for the same month
    const holidayResult = await pool.query(
      `SELECT
      TO_CHAR(holiday_date,'YYYY-MM-DD') AS holiday_date,
      description
      FROM company_holidays
      WHERE TO_CHAR(holiday_date,'YYYY-MM')=$1`,
      [month]
    );
    const holidays = holidayResult.rows;

    // Fetch working days
    const settingsResult = await pool.query("SELECT working_days FROM company_settings LIMIT 1");
    const workingDays = settingsResult.rows[0]?.working_days || [1, 2, 3, 4, 5, 6];

    // Return ALL arrays to the frontend
    res.json({ uploadedDates, holidays, workingDays });
  } catch (err) {
    console.error("Calendar fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch calendar data" });
  }
};

// 2. Get all employee records for a specific day (to show in the Edit Modal)
exports.getAttendanceByDate = async (req, res) => {
  try {
    const { date } = req.params; // Expected format: YYYY-MM-DD

    const result = await pool.query(
      `SELECT a.*, e.name, e.employee_code, d.department_name, s.shift_name 
       FROM attendance_summary a 
       JOIN employees e ON a.employee_id = e.id 
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN shifts s ON e.shift_id = s.id
       WHERE a.attendance_date = $1
       ORDER BY e.name ASC`,
      [date]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Fetch by date error:", err.message);
    res.status(500).json({ error: "Failed to fetch date attendance" });
  }
};

// 3. Update a specific attendance record manually
exports.updateAttendanceRecord = async (req, res) => {
  try {
    const { id } = req.params; // The ID of the attendance_summary row
    const { first_in, last_out, working_hours, status, remarks } = req.body;

    await pool.query(
      `UPDATE attendance_summary 
       SET first_in = $1, last_out = $2, working_hours = $3, status = $4, remarks = $5
       WHERE id = $6`,
      [first_in, last_out, working_hours, status, remarks, id]
    );

    res.json({ message: "Record updated successfully" });
  } catch (err) {
    console.error("Update record error:", err.message);
    res.status(500).json({ error: "Failed to update record" });
  }
};