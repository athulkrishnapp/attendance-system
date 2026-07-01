const pool = require("../db");
const xlsx = require("xlsx");
const fs = require("fs");
const ruleEngine = require("../utils/ruleEngine");

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
    const empIdMap = {};
    employeesRes.rows.forEach(emp => {
      const empData = {
        id: emp.id,
        shift_start_time: emp.shift_start_time,
        shift_end_time: emp.shift_end_time,
        grace_period_minutes: emp.grace_period_minutes,
        required_working_hours: emp.required_working_hours,
        half_day_mark_time: emp.half_day_mark_time
      };
      empMap[emp.employee_code] = empData;
      empIdMap[emp.id] = empData;
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

    const scans = [];

    for (const row of data) {
      const empInfo = empMap[row.employee_code];
      if (!empInfo) continue;
      const actualEmployeeId = empInfo.id;

      let scanDateObj;
      if (typeof row.scan_time === 'number') {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const utcDate = new Date(excelEpoch.getTime() + Math.round(row.scan_time * 86400000));
        scanDateObj = new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate(), utcDate.getUTCHours(), utcDate.getUTCMinutes(), utcDate.getUTCSeconds());
      } else if (typeof row.scan_time === 'string') {
        const cleanedStr = row.scan_time.trim().replace(/\//g, '-');
        const [datePart, timePart] = cleanedStr.split(' ');

        if (datePart && timePart) {
          let [p1, p2, p3] = datePart.split('-');
          let year, month, day;
          if (p1.length === 4) {
            year = p1; month = p2; day = p3;
          } else if (p3 && p3.length === 4) {
            day = p1; month = p2; year = p3;
          } else {
            year = p1; month = p2; day = p3;
          }
          const [hour, minute, second] = timePart.split(':');
          scanDateObj = new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
        } else {
          scanDateObj = new Date(row.scan_time);
        }
      } else {
        scanDateObj = new Date(row.scan_time);
      }

      if (isNaN(scanDateObj.getTime())) {
        continue;
      }

      scans.push({ employee_id: actualEmployeeId, scan_time: scanDateObj });
    }

    const count = await processAndSaveSummaries(scans, settings, empIdMap, holidayMap, leaveMap);

    res.status(200).json({
      message: `Smart calculation complete! ${count} daily records updated.`,
      recordsProcessed: data.length
    });

  } catch (err) {
    console.error("Smart Upload error:", err.message);
    res.status(500).json({ error: "Failed to process attendance file" });
  }
};

/**
 * Shared helper: build attendance summaries from an array of raw scans.
 * scans: [{ employee_id, scan_time: Date }]
 * Returns number of records written.
 */
async function processAndSaveSummaries(scans, settings, empIdMap, holidayMap, leaveMap) {
  const formatTime = (d) =>
    String(d.getHours()).padStart(2, '0') + ':' +
    String(d.getMinutes()).padStart(2, '0') + ':' +
    String(d.getSeconds()).padStart(2, '0');

  // Group scans by employee_id + logical date
  const dailySummaries = {};
  const uniqueDates = new Set();
  for (const { employee_id, scan_time } of scans) {
    const empInfo = empIdMap[employee_id];
    if (!empInfo) continue;

    const shiftStartStr = empInfo.shift_start_time || settings.shift_start_time || '09:00:00';
    const [shiftHr, shiftMin] = shiftStartStr.split(':').map(Number);

    let logicalDateObj = new Date(scan_time);
    const boundary = new Date(
      scan_time.getFullYear(), scan_time.getMonth(), scan_time.getDate(),
      shiftHr, shiftMin, 0
    );
    boundary.setHours(boundary.getHours() - 4); // 4-hour pre-shift window
    if (scan_time < boundary) {
      logicalDateObj.setDate(logicalDateObj.getDate() - 1);
    }

    const dateKey = `${logicalDateObj.getFullYear()}-${String(logicalDateObj.getMonth() + 1).padStart(2, '0')}-${String(logicalDateObj.getDate()).padStart(2, '0')}`;
    uniqueDates.add(dateKey);
    const key = `${employee_id}_${dateKey}`;
    if (!dailySummaries[key]) {
      dailySummaries[key] = { employee_id, attendance_date: dateKey, scans: [] };
    }
    dailySummaries[key].scans.push(scan_time);
  }

  // Generate blank records for all active employees for all processed dates
  for (const dateKey of uniqueDates) {
    for (const empId in empIdMap) {
      const key = `${empId}_${dateKey}`;
      if (!dailySummaries[key]) {
        dailySummaries[key] = { employee_id: parseInt(empId, 10), attendance_date: dateKey, scans: [] };
      }
    }
  }

  let count = 0;
  for (const key in dailySummaries) {
    const record = dailySummaries[key];
    record.scans.sort((a, b) => a - b);

    const empInfo = empIdMap[record.employee_id];
    const shiftStartTime  = empInfo?.shift_start_time  || settings.shift_start_time  || '09:00:00';
    const gracePeriod     = (empInfo?.grace_period_minutes  != null) ? empInfo.grace_period_minutes  : settings.grace_period_minutes;
    const requiredHours   = (empInfo?.required_working_hours != null) ? parseFloat(empInfo.required_working_hours) : parseFloat(settings.required_working_hours);
    const shiftEndHrStr   = empInfo?.shift_end_time    || settings.shift_end_time    || '18:00:00';
    const halfDayMark     = empInfo?.half_day_mark_time || '13:00:00';

    const [logicalYear, logicalMonth, logicalDay] = record.attendance_date.split('-').map(Number);
    const [sHr, sMin] = shiftStartTime.split(':').map(Number);
    const [eHr, eMin] = shiftEndHrStr.split(':').map(Number);
    const [hHr, hMin] = halfDayMark.split(':').map(Number);

    const expectedStartDate      = new Date(logicalYear, logicalMonth - 1, logicalDay, sHr, sMin, 0);
    const maxGraceDate           = new Date(expectedStartDate.getTime() + gracePeriod * 60000);
    const expectedEndDate        = new Date(logicalYear, logicalMonth - 1, logicalDay, eHr, eMin, 0);
    const halfDayThresholdDate   = new Date(logicalYear, logicalMonth - 1, logicalDay, hHr, hMin, 0);

    if (halfDayThresholdDate < expectedStartDate) halfDayThresholdDate.setDate(halfDayThresholdDate.getDate() + 1);
    if (expectedEndDate < expectedStartDate)       expectedEndDate.setDate(expectedEndDate.getDate() + 1);

    let firstIn = null;
    let lastOut = null;
    if (record.scans.length === 1) {
      firstIn = record.scans[0];
      lastOut = null;
    } else if (record.scans.length > 1) {
      firstIn = record.scans[0];
      lastOut = record.scans[record.scans.length - 1];
      if (Math.abs(lastOut - firstIn) < 60000) { // same-minute spam → single punch
        lastOut = null;
      }
    }

    const workingHours = (firstIn && lastOut)
      ? parseFloat(((lastOut - firstIn) / (1000 * 60 * 60)).toFixed(2))
      : 0;

    const refDate      = firstIn || lastOut || expectedStartDate;
    const holidayName  = holidayMap[record.attendance_date];
    const workingDays  = settings.working_days || [1, 2, 3, 4, 5, 6];
    const isWeekend    = !workingDays.includes(refDate.getDay());
    const approvedLeave = leaveMap[record.employee_id]?.[record.attendance_date];

    const { core_status, modifier_flags } = ruleEngine.calculateAttendance({
      firstIn, lastOut, workingHours,
      expectedStartDate, expectedEndDate, halfDayThresholdDate,
      maxGraceDate, requiredHours, isWeekend, holidayName, approvedLeave
    });

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
      firstIn  ? formatTime(firstIn)  : null,
      lastOut  ? formatTime(lastOut)  : null,
      workingHours,
      core_status,
      JSON.stringify(modifier_flags),
      null
    ]);
    count++;
  }
  return count;
}


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

exports.getMyRegularizations = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT r.*, a.attendance_date, a.core_status, a.modifier_flags
      FROM regularization_requests r
      JOIN attendance_summary a ON r.attendance_summary_id = a.id
      WHERE r.employee_id = $1
      ORDER BY r.applied_on DESC
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error("Failed to fetch my regularizations:", err);
    res.status(500).json({ error: "Failed to fetch my regularizations." });
  }
};

exports.getAllRegularizations = async (req, res) => {
  try {
    const { requester_id, is_super_admin } = req.query;
    let queryParams = [];
    let whereClause = "";

    if (is_super_admin !== 'true' && requester_id) {
      whereClause = "WHERE e.manager_id = $1 OR (r.forwarded_by_id IS NOT NULL AND m.manager_id = $1)";
      queryParams.push(requester_id);
    }

    const result = await pool.query(`
      SELECT r.*, e.name as employee_name, e.employee_code, m.name as forwarded_by_name,
             e.manager_id as employee_manager_id,
             m.manager_id as forwarder_manager_id,
             ans.first_in as actual_first_in, ans.last_out as actual_last_out,
             ans.attendance_date, ans.core_status, ans.modifier_flags
      FROM regularization_requests r
      JOIN employees e ON r.employee_id = e.id
      LEFT JOIN employees m ON r.forwarded_by_id = m.id
      LEFT JOIN attendance_summary ans ON r.attendance_summary_id = ans.id
      ${whereClause}
      ORDER BY r.applied_on ASC
    `, queryParams);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch regularizations." });
  }
};

const recalculateDailyAttendance = async (employee_id, dateKey, firstIn, lastOut, workingHours) => {
  // Fetch global settings
  const settingsRes = await pool.query("SELECT * FROM company_settings LIMIT 1");
  const settings = settingsRes.rows[0] || {
    shift_start_time: '09:00:00', shift_end_time: '18:00:00',
    grace_period_minutes: 15, required_working_hours: 8
  };

  // Fetch employee shift details
  const empRes = await pool.query(`
    SELECT e.id, s.shift_start_time, s.shift_end_time, s.grace_period_minutes, s.required_working_hours, s.half_day_mark_time
    FROM employees e
    LEFT JOIN shifts s ON e.shift_id = s.id
    WHERE e.id = $1
  `, [employee_id]);
  const empInfo = empRes.rows[0];

  // Fetch holiday map
  const holidaysRes = await pool.query("SELECT holiday_date, description FROM company_holidays");
  const holidayMap = {};
  holidaysRes.rows.forEach(h => {
    holidayMap[h.holiday_date.toISOString().split('T')[0]] = h.description;
  });

  // Fetch leaves
  const leavesRes = await pool.query(`
    SELECT employee_id, start_date, end_date, duration, leave_portion 
    FROM leave_requests WHERE status = 'APPROVED' AND employee_id = $1
  `, [employee_id]);
  const leaveMap = {};
  leavesRes.rows.forEach(l => {
    let current = new Date(l.start_date);
    const end = new Date(l.end_date);
    while (current <= end) {
      const dStr = current.toISOString().split('T')[0];
      leaveMap[dStr] = { duration: l.duration, leave_portion: l.leave_portion };
      current.setDate(current.getDate() + 1);
    }
  });

  // Set up timings
  const shiftStartTime  = empInfo?.shift_start_time  || settings.shift_start_time  || '09:00:00';
  const gracePeriod     = (empInfo?.grace_period_minutes  != null) ? empInfo.grace_period_minutes  : settings.grace_period_minutes;
  const requiredHours   = (empInfo?.required_working_hours != null) ? parseFloat(empInfo.required_working_hours) : parseFloat(settings.required_working_hours);
  const shiftEndHrStr   = empInfo?.shift_end_time    || settings.shift_end_time    || '18:00:00';
  const halfDayMark     = empInfo?.half_day_mark_time || '13:00:00';

  const [logicalYear, logicalMonth, logicalDay] = dateKey.split('-').map(Number);
  const [sHr, sMin] = shiftStartTime.split(':').map(Number);
  const [eHr, eMin] = shiftEndHrStr.split(':').map(Number);
  const [hHr, hMin] = halfDayMark.split(':').map(Number);

  const expectedStartDate      = new Date(logicalYear, logicalMonth - 1, logicalDay, sHr, sMin, 0);
  const maxGraceDate           = new Date(expectedStartDate.getTime() + gracePeriod * 60000);
  const expectedEndDate        = new Date(logicalYear, logicalMonth - 1, logicalDay, eHr, eMin, 0);
  const halfDayThresholdDate   = new Date(logicalYear, logicalMonth - 1, logicalDay, hHr, hMin, 0);
  const refDate                = new Date(logicalYear, logicalMonth - 1, logicalDay);

  const holidayName  = holidayMap[dateKey];
  const workingDays  = settings.working_days || [1, 2, 3, 4, 5, 6];
  const isWeekend    = !workingDays.includes(refDate.getDay());
  const approvedLeave = leaveMap[dateKey];

  const firstInDate = firstIn ? new Date(`${dateKey}T${firstIn}Z`) : null;
  const lastOutDate = lastOut ? new Date(`${dateKey}T${lastOut}Z`) : null;

  return ruleEngine.calculateAttendance({
    firstIn: firstInDate, lastOut: lastOutDate, workingHours,
    expectedStartDate, expectedEndDate, halfDayThresholdDate,
    maxGraceDate, requiredHours, isWeekend, holidayName, approvedLeave
  });
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

        let oldCoreStatus = summary.core_status;
        
        // Re-evaluate attendance using requested times
        const dateKey = summary.attendance_date.toISOString().split('T')[0];
        const fIn = requested_first_in || summary.first_in;
        const lOut = requested_last_out || summary.last_out;
        
        const { core_status: calculatedCoreStatus, modifier_flags: calculatedFlags } = await recalculateDailyAttendance(
          summary.employee_id, dateKey, fIn, lOut, workingHours
        );

        let coreStatus = calculatedCoreStatus;
        let newFlags = calculatedFlags || [];

        let oldFlags = [];
        try {
            if (summary.modifier_flags) {
                oldFlags = typeof summary.modifier_flags === 'string' ? JSON.parse(summary.modifier_flags) : summary.modifier_flags;
            }
        } catch(e) {}
        
        // Preserve PREV_ flags from earlier regularizations
        oldFlags.forEach(f => {
          if (f.startsWith('PREV_') && !newFlags.includes(f)) {
            newFlags.push(f);
          }
        });

        if (!newFlags.includes('REGULARIZED')) newFlags.push('REGULARIZED');
        
        if (oldCoreStatus !== coreStatus) {
            newFlags.push('PREV_' + oldCoreStatus);
        }
        if (oldFlags.includes('LATE') && !newFlags.includes('LATE')) newFlags.push('PREV_LATE');
        if (oldFlags.includes('EARLY_EXIT') && !newFlags.includes('EARLY_EXIT')) newFlags.push('PREV_EARLY_EXIT');

        await pool.query(
          `UPDATE attendance_summary
           SET first_in = $1, last_out = $2, working_hours = $3, core_status = $4,
               regularization_status = 'APPROVED', regularization_manager_id = $5,
               modifier_flags = $6::jsonb
           WHERE id = $7`,
          [fIn, lOut, workingHours, coreStatus, processed_by, JSON.stringify(newFlags), attendance_summary_id]
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

    const mgrResult = await pool.query("SELECT manager_id FROM employees WHERE id = $1", [manager_id]);
    const nextManagerId = mgrResult.rows[0]?.manager_id;
    
    let newStatus = 'PENDING_MANAGER';
    if (!nextManagerId || nextManagerId === 1) {
      newStatus = 'PENDING_ADMIN';
    }

    await pool.query("UPDATE regularization_requests SET status = $1, forwarded_by_id = $2 WHERE id = $3", [newStatus, manager_id, id]);
    await pool.query("UPDATE attendance_summary SET regularization_status = $1 WHERE id = $2", [newStatus, attendance_summary_id]);
    res.json({ message: "Regularization forwarded successfully." });
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

    const settingsRes = await pool.query("SELECT visible_flags FROM company_settings LIMIT 1");
    const visibleFlags = settingsRes.rows[0]?.visible_flags || [];

    const result = await pool.query(
      `SELECT a.*, e.name, e.employee_code, d.department_name, s.shift_name, lt.name as leave_type_name
       FROM attendance_summary a 
       JOIN employees e ON a.employee_id = e.id 
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN shifts s ON e.shift_id = s.id
       LEFT JOIN leave_requests lr ON a.employee_id = lr.employee_id 
            AND lr.status = 'APPROVED' 
            AND a.attendance_date >= lr.start_date AND a.attendance_date <= lr.end_date
       LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
       WHERE a.attendance_date = $1
       ORDER BY e.name ASC`,
      [date]
    );

    const maskedRows = result.rows.map(row => {
      let flags = row.modifier_flags;
      if (typeof flags === 'string') {
        try { flags = JSON.parse(flags); } catch(e) { flags = []; }
      }
      if (flags && Array.isArray(flags)) {
        row.modifier_flags = flags.filter(flag => visibleFlags.includes(flag));
      } else {
        row.modifier_flags = [];
      }
      return row;
    });

    res.json(maskedRows);
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