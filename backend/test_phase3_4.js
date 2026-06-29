const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "attendance_system",
  password: "123",
  port: 5432,
});

const baseUrl = "http://localhost:5001";

async function assertResponse(res, method, path, expectedStatus = 200) {
  if (res.status !== expectedStatus) {
    const text = await res.text();
    throw new Error(`[FAIL] ${method} ${path} returned status ${res.status} (expected ${expectedStatus}). Response: ${text}`);
  }
  const data = await res.json();
  console.log(`[PASS] ${method} ${path} -> status ${res.status}`);
  return data;
}

async function runTests() {
  try {
    console.log("=== STARTING PHASE 3 & 4 VERIFICATION TESTS ===\n");

    // 1. Setup Test Data
    console.log("1. Setting up test data...");
    
    // Create an employee
    const newEmp = await assertResponse(await fetch(`${baseUrl}/employees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee_code: "EMP-P4-TEST",
        name: "Phase4 Tester",
        email: "p4tester@example.com",
        password: "pass",
        role_id: 2
      })
    }), "POST", "/employees");

    // Create a Leave Type
    const newLeaveType = await assertResponse(await fetch(`${baseUrl}/leaves/types`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "P4 Leave Type",
        min_advance_notice_days: 1,
        requires_documentation: false,
        max_consecutive_days: 5,
        is_active: true
      })
    }), "POST", "/leaves/types");

    // 2. Test Granular Leaves
    console.log("\n2. Testing Granular Leaves...");
    
    // Request Leave
    const leaveReq = await assertResponse(await fetch(`${baseUrl}/leaves/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee_id: newEmp.id,
        start_date: "2026-07-01",
        end_date: "2026-07-01",
        reason: "Dentist Appointment",
        leave_type_id: newLeaveType.id,
        leave_portion: "SECOND_HALF",
        hourly_duration: 4.0
      })
    }), "POST", "/leaves/request", 201);

    if (leaveReq.leave.leave_portion !== "SECOND_HALF" || Number(leaveReq.leave.hourly_duration) !== 4.0) {
       throw new Error(`[FAIL] Leave request did not save granular details properly.`);
    }

    // Approve Leave
    const approvedLeave = await assertResponse(await fetch(`${baseUrl}/leaves/${leaveReq.leave.id}/approve`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" }
    }), "PUT", `/leaves/${leaveReq.leave.id}/approve`);
    
    if (approvedLeave.leave.status !== 'APPROVED') {
      throw new Error(`[FAIL] Leave approval failed. Expected 'APPROVED' got '${approvedLeave.leave.status}'`);
    }

    // 3. Test Regularization Workflow
    console.log("\n3. Testing Regularization Workflow...");

    // Insert dummy attendance summary directly via DB (simulating a MISSING_PUNCH upload)
    const summaryRes = await pool.query(
      `INSERT INTO attendance_summary (employee_id, attendance_date, first_in, last_out, working_hours, core_status) 
       VALUES ($1, '2026-06-25', '09:15:00', NULL, 0, 'MISSING_PUNCH') RETURNING *`,
      [newEmp.id]
    );
    const summaryId = summaryRes.rows[0].id;

    // Request Regularization
    await assertResponse(await fetch(`${baseUrl}/attendance/regularize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attendance_summary_id: summaryId,
        employee_id: newEmp.id,
        requested_first_in: "09:00:00",
        requested_last_out: "18:00:00",
        reason: "Forgot to punch out"
      })
    }), "POST", "/attendance/regularize", 201);

    // Verify it appears in pending
    const pendingList = await assertResponse(await fetch(`${baseUrl}/attendance/regularize/pending`), "GET", "/attendance/regularize/pending");
    const regTicket = pendingList.find(r => r.attendance_summary_id === summaryId);
    if (!regTicket) throw new Error("[FAIL] Regularization request did not appear in pending list.");

    // Process Regularization (Approve)
    const processRes = await assertResponse(await fetch(`${baseUrl}/attendance/regularize/${regTicket.id}/process`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "APPROVED",
        manager_remarks: "Approved as requested.",
        processed_by: newEmp.id // using self for test
      })
    }), "PUT", `/attendance/regularize/${regTicket.id}/process`);

    // Fetch the updated attendance_summary directly to verify
    const updatedSummaryRes = await pool.query("SELECT * FROM attendance_summary WHERE id = $1", [summaryId]);
    const updatedSummary = updatedSummaryRes.rows[0];

    console.log("Updated Attendance Summary:");
    console.log(updatedSummary);

    if (updatedSummary.core_status !== 'PRESENT') {
      throw new Error(`[FAIL] core_status was not updated to PRESENT. Got: ${updatedSummary.core_status}`);
    }
    if (updatedSummary.regularization_status !== 'APPROVED') {
      throw new Error(`[FAIL] regularization_status was not updated to APPROVED. Got: ${updatedSummary.regularization_status}`);
    }
    if (Number(updatedSummary.working_hours) !== 9.0) {
      throw new Error(`[FAIL] working_hours was not correctly calculated. Got: ${updatedSummary.working_hours}`);
    }
    const flags = updatedSummary.modifier_flags;
    if (!flags || !flags.includes("REGULARIZED")) {
       throw new Error(`[FAIL] modifier_flags does not contain 'REGULARIZED'. Got: ${JSON.stringify(flags)}`);
    }

    // 4. Clean up
    console.log("\n4. Cleaning up test data...");
    await pool.query("DELETE FROM regularization_requests WHERE id = $1", [regTicket.id]);
    await pool.query("DELETE FROM attendance_summary WHERE id = $1", [summaryId]);
    await pool.query("DELETE FROM leave_requests WHERE id = $1", [leaveReq.leave.id]);
    await pool.query("DELETE FROM leave_types WHERE id = $1", [newLeaveType.id]);
    await pool.query("DELETE FROM employees WHERE id = $1", [newEmp.id]);

    console.log("\n=== ALL TESTS PASSED SUCCESSFULLY ===");
    process.exit(0);

  } catch (error) {
    console.error("\n*** VERIFICATION FAILED ***");
    console.error(error.message);
    process.exit(1);
  }
}

runTests();
