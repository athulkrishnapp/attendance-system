const pool = require("../db");
const xlsx = require("xlsx");

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

    const employeesRes = await pool.query("SELECT id, employee_code FROM employees");
    const codeToIdMap = {};
    employeesRes.rows.forEach(emp => {
      codeToIdMap[emp.employee_code] = emp.id;
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
      const actualEmployeeId = codeToIdMap[row.employee_code];
      if (!actualEmployeeId) continue; 

      // Robust parsing: Handle string OR already-parsed Date object
      let scanDateObj;
      if (typeof row.scan_time === 'string') {
        const [datePart, timePart] = row.scan_time.split(' ');
        const [year, month, day] = datePart.split('-');
        const [hour, minute, second] = timePart ? timePart.split(':') : [0,0,0];
        scanDateObj = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
      } else {
        // Excel library often parses dates into objects directly
        scanDateObj = new Date(row.scan_time);
      }
      
      const dateKey = scanDateObj.toISOString().split('T')[0]; 
      
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
      const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

      // Determine Status
      let status = 'PRESENT';
      if (record.scans.length === 1) status = 'MISSING_PUNCH';
      else if (workingHours === 0) status = 'ABSENT';
      else if (workingHours < settings.required_working_hours / 2) status = 'SHORT_LEAVE';
      else if (workingHours < settings.required_working_hours) status = 'HALF_DAY';

      // Apply Overrides
      if (isWeekend) status = workingHours > 0 ? 'WEEKEND_WORK' : 'WEEKEND_OFF';
      else if (holidayName) status = workingHours > 0 ? 'HOLIDAY_WORK' : 'HOLIDAY';
      else {
          // Late and Overtime logic
          const expectedStartTime = new Date(`${record.attendance_date}T${settings.shift_start_time}Z`);
          const maxGrace = new Date(expectedStartTime.getTime() + (settings.grace_period_minutes * 60000));
          
          if (firstIn > maxGrace) status = 'LATE';
          else if (workingHours > settings.required_working_hours + 1) status = 'OVERTIME';
      }

      await pool.query(`
        INSERT INTO attendance_summary 
          (employee_id, attendance_date, first_in, last_out, working_hours, status, remarks)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (employee_id, attendance_date) 
        DO UPDATE SET first_in = EXCLUDED.first_in, last_out = EXCLUDED.last_out, 
                      working_hours = EXCLUDED.working_hours, status = EXCLUDED.status, remarks = EXCLUDED.remarks
      `, [record.employee_id, record.attendance_date, firstIn.toTimeString().split(' ')[0], lastOut.toTimeString().split(' ')[0], workingHours, status, "Processed"]);
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
    const { id } = req.body;
    await pool.query(
      "UPDATE attendance_summary SET regularization_status = 'PENDING' WHERE id = $1",
      [id]
    );
    res.json({ message: "Regularization requested successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to request regularization." });
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

    // Return BOTH arrays to the frontend
    res.json({ uploadedDates, holidays });
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
      `SELECT a.*, e.name, e.employee_code 
       FROM attendance_summary a 
       JOIN employees e ON a.employee_id = e.id 
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