const fs = require('fs');
let ctrl = fs.readFileSync('backend/controllers/attendanceController.js', 'utf8');

const targetProcess = `        let oldCoreStatus = summary.core_status;
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
        if (oldFlags.includes('EARLY_EXIT')) newFlags.push('PREV_EARLY_EXIT');`;

const replacementProcess = `        let oldCoreStatus = summary.core_status;
        
        // Use the requested times to correctly evaluate shift timing penalties
        const dateKey = summary.attendance_date.toISOString().split('T')[0];
        const { core_status: calculatedCoreStatus, modifier_flags: calculatedFlags } = await recalculateDailyAttendance(
          summary.employee_id, dateKey, requested_first_in || summary.first_in, requested_last_out || summary.last_out, workingHours
        );

        let coreStatus = calculatedCoreStatus;
        let newFlags = calculatedFlags || [];

        let oldFlags = [];
        try {
            if (summary.modifier_flags) {
                oldFlags = typeof summary.modifier_flags === 'string' ? JSON.parse(summary.modifier_flags) : summary.modifier_flags;
            }
        } catch(e) {}
        
        // Preserve PREV_ flags from before in case it was regularized multiple times
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
        if (oldFlags.includes('EARLY_EXIT') && !newFlags.includes('EARLY_EXIT')) newFlags.push('PREV_EARLY_EXIT');`;

if (ctrl.includes(targetProcess)) {
  ctrl = ctrl.replace(targetProcess, replacementProcess);
  fs.writeFileSync('backend/controllers/attendanceController.js', ctrl);
  console.log("Updated processRegularization to use recalculateDailyAttendance");
} else {
  console.log("Could not find target block in processRegularization");
}
