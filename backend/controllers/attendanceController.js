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

    for (const row of data) {
      const actualEmployeeId = codeToIdMap[row.employee_code];
      if (!actualEmployeeId) {
        console.warn(`Skipping row: Unknown employee_code ${row.employee_code}`);
        continue; 
      }

      await pool.query(
        "INSERT INTO attendance_logs (employee_id, scan_time, source, device_id) VALUES ($1, $2, $3, $4)",
        [actualEmployeeId, row.scan_time, 'EXCEL', 'MAIN_GATE']
      );

      const scanDateObj = new Date(row.scan_time);
      const dateKey = scanDateObj.toISOString().split('T')[0]; 
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

    // 4. The SMART Processing Engine
    for (const key in dailySummaries) {
      const record = dailySummaries[key];
      record.scans.sort((a, b) => a - b); 

      const firstIn = record.scans[0];
      const lastOut = record.scans[record.scans.length - 1];

      const diffMs = lastOut - firstIn;
      const workingHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

      const dayOfWeek = firstIn.getDay(); 
      const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
      const holidayName = holidayMap[record.attendance_date];

      let remarks = "";
      
      const expectedStartTime = new Date(`${record.attendance_date}T${settings.shift_start_time}`);
      const maxGraceTime = new Date(expectedStartTime.getTime() + settings.grace_period_minutes * 60000);
      
      const expectedEndTime = new Date(`${record.attendance_date}T${settings.shift_end_time || '18:00:00'}`);
      const overtimeThreshold = new Date(expectedEndTime.getTime() + 30 * 60000); // 30 mins post-checkout

      if (firstIn > maxGraceTime && !isWeekend && !holidayName) {
        remarks = "LATE ARRIVAL";
      }

      let status = 'ABSENT';
      if (workingHours >= settings.required_working_hours) {
        status = 'PRESENT';
      } else if (workingHours >= (settings.required_working_hours / 2)) {
        status = 'HALF_DAY';
      } else if (workingHours > 0) {
        status = 'SHORT_LEAVE';
      }

      // Overtime Logic Evaluation
      if (isWeekend && workingHours > 0) {
        status = 'OVERTIME';
        remarks = "Weekend Shift";
      } else if (holidayName && workingHours > 0) {
        status = 'OVERTIME';
        remarks = `Worked on ${holidayName}`;
      } else if (!isWeekend && !holidayName && lastOut >= overtimeThreshold) {
        const otHours = ((lastOut - expectedEndTime) / (1000 * 60 * 60)).toFixed(1);
        remarks = remarks ? `${remarks}, OT: ${otHours}h` : `OT: ${otHours}h`;
      }

      const firstInTime = firstIn.toTimeString().split(' ')[0];
      const lastOutTime = lastOut.toTimeString().split(' ')[0];

      await pool.query(`
        INSERT INTO attendance_summary 
          (employee_id, attendance_date, first_in, last_out, working_hours, status, remarks)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (employee_id, attendance_date) 
        DO UPDATE SET 
          first_in = EXCLUDED.first_in,
          last_out = EXCLUDED.last_out,
          working_hours = EXCLUDED.working_hours,
          status = EXCLUDED.status,
          remarks = EXCLUDED.remarks
      `, [
        record.employee_id,
        record.attendance_date,
        firstInTime,
        lastOutTime,
        workingHours,
        status,
        remarks
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