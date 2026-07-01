const fs = require('fs');
let ctrl = fs.readFileSync('backend/controllers/attendanceController.js', 'utf8');

// 1. Update getMyRegularizations
const targetGetMy = `exports.getMyRegularizations = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(\`
      SELECT r.*, a.attendance_date, a.core_status 
      FROM regularization_requests r
      JOIN attendance_summary a ON r.attendance_summary_id = a.id
      WHERE r.employee_id = $1
      ORDER BY r.applied_on DESC
    \`, [id]);`;

const replacementGetMy = `exports.getMyRegularizations = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(\`
      SELECT r.*, a.attendance_date, a.core_status, a.modifier_flags, a.first_in as actual_first_in, a.last_out as actual_last_out
      FROM regularization_requests r
      JOIN attendance_summary a ON r.attendance_summary_id = a.id
      WHERE r.employee_id = $1
      ORDER BY r.applied_on DESC
    \`, [id]);`;

if (ctrl.includes(targetGetMy)) {
    ctrl = ctrl.replace(targetGetMy, replacementGetMy);
}

// 2. Update processRegularization
const targetProcess = `        let coreStatus = summary.core_status;
        if (coreStatus === 'MISSING_PUNCH') {
          coreStatus = 'PRESENT';
        }

        await pool.query(
          \`UPDATE attendance_summary
           SET first_in = $1, last_out = $2, working_hours = $3, core_status = $4,
               regularization_status = 'APPROVED', regularization_manager_id = $5,
               modifier_flags = COALESCE(modifier_flags, '[]'::jsonb) || '["REGULARIZED"]'::jsonb
           WHERE id = $6\`,
          [requested_first_in || summary.first_in, requested_last_out || summary.last_out, workingHours, coreStatus, processed_by, attendance_summary_id]
        );`;

const replacementProcess = `        let oldCoreStatus = summary.core_status;
        let coreStatus = oldCoreStatus;
        
        if (['MISSING_PUNCH', 'ABSENT', 'HALF_DAY'].includes(coreStatus)) {
          coreStatus = 'PRESENT';
        }

        let oldFlags = [];
        try {
            if (summary.modifier_flags) {
                oldFlags = typeof summary.modifier_flags === 'string' ? JSON.parse(summary.modifier_flags) : summary.modifier_flags;
            }
        } catch(e) {}
        
        let newFlags = oldFlags.filter(f => f !== 'LATE' && f !== 'EARLY_EXIT' && !f.startsWith('PREV_'));
        if (!newFlags.includes('REGULARIZED')) newFlags.push('REGULARIZED');
        
        if (oldCoreStatus !== 'PRESENT') {
            newFlags.push('PREV_' + oldCoreStatus);
        }
        if (oldFlags.includes('LATE')) newFlags.push('PREV_LATE');
        if (oldFlags.includes('EARLY_EXIT')) newFlags.push('PREV_EARLY_EXIT');

        await pool.query(
          \`UPDATE attendance_summary
           SET first_in = $1, last_out = $2, working_hours = $3, core_status = $4,
               regularization_status = 'APPROVED', regularization_manager_id = $5,
               modifier_flags = $6::jsonb
           WHERE id = $7\`,
          [requested_first_in || summary.first_in, requested_last_out || summary.last_out, workingHours, coreStatus, processed_by, JSON.stringify(newFlags), attendance_summary_id]
        );`;

if (ctrl.includes(targetProcess)) {
    ctrl = ctrl.replace(targetProcess, replacementProcess);
}

fs.writeFileSync('backend/controllers/attendanceController.js', ctrl);
console.log("Patched attendanceController logic");
