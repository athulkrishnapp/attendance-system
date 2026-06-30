/**
 * Calculates core_status and modifier_flags based on "Working Hours Based" rules.
 */
function calculateWorkingHoursMode({ firstIn, lastOut, workingHours, expectedStartDate, expectedEndDate, halfDayThresholdDate, maxGraceDate, requiredHours, isWeekend, holidayName, approvedLeave }) {
    let core_status = 'PRESENT';
    let modifier_flags = [];

    if (!firstIn || !lastOut || isNaN(firstIn) || isNaN(lastOut)) {
        core_status = 'MISSING_PUNCH';
    } else if (workingHours === 0) {
        core_status = 'ABSENT';
    }

    if (isWeekend) {
        core_status = 'WEEKEND';
        if (workingHours > 0) modifier_flags.push('WEEKEND_WORK');
    } else if (holidayName) {
        core_status = 'HOLIDAY';
        if (workingHours > 0) modifier_flags.push('HOLIDAY_WORK');
    }

    const midWorkingHours = requiredHours / 2;

    if (approvedLeave) {
        if (approvedLeave.duration === 'Full Day') {
            core_status = 'LEAVE';
        } else if (approvedLeave.duration === 'Hourly') {
            modifier_flags.push('HOURLY_LEAVE');
        } else if (approvedLeave.duration === 'Half Day') {
            core_status = 'HALF_DAY';
            if (approvedLeave.leave_portion === 'FIRST_HALF') modifier_flags.push('HALF_DAY_FN');
            if (approvedLeave.leave_portion === 'SECOND_HALF') modifier_flags.push('HALF_DAY_AN');
            
            if (workingHours < midWorkingHours) {
                core_status = 'ABSENT';
            }
        }
    } else {
        if (core_status === 'PRESENT') {
            if (workingHours < midWorkingHours) {
                core_status = 'ABSENT';
            } else if (workingHours < requiredHours) {
                core_status = 'HALF_DAY'; // Absent for the other half essentially
            }
        }
    }

    if (core_status === 'PRESENT' || core_status === 'HALF_DAY') {
        if (firstIn > maxGraceDate) modifier_flags.push('LATE');
        if (workingHours > requiredHours) modifier_flags.push('OVERTIME');
        if (lastOut < expectedEndDate) modifier_flags.push('EARLY_EXIT');

        if (core_status === 'HALF_DAY' && workingHours > 0) {
            if (lastOut <= halfDayThresholdDate) modifier_flags.push('FIRST_HALF');
            else if (firstIn >= halfDayThresholdDate) modifier_flags.push('SECOND_HALF');
            else {
                modifier_flags.push('FIRST_HALF');
                modifier_flags.push('SECOND_HALF');
            }
        }
    }

    return { core_status, modifier_flags };
}

/**
 * Calculates core_status and modifier_flags based on "Shift Timing Based" rules.
 */
function calculateShiftTimingMode({ firstIn, lastOut, workingHours, expectedStartDate, expectedEndDate, halfDayThresholdDate, maxGraceDate, requiredHours, isWeekend, holidayName, approvedLeave }) {
    let core_status = 'PRESENT';
    let modifier_flags = [];

    if (!firstIn || !lastOut || isNaN(firstIn) || isNaN(lastOut)) {
        core_status = 'MISSING_PUNCH';
    } else if (workingHours === 0) {
        core_status = 'ABSENT';
    }

    if (isWeekend) {
        core_status = 'WEEKEND';
        if (workingHours > 0) modifier_flags.push('WEEKEND_WORK');
    } else if (holidayName) {
        core_status = 'HOLIDAY';
        if (workingHours > 0) modifier_flags.push('HOLIDAY_WORK');
    }

    if (approvedLeave) {
        if (approvedLeave.duration === 'Full Day') {
            core_status = 'LEAVE';
        } else if (approvedLeave.duration === 'Hourly') {
            modifier_flags.push('HOURLY_LEAVE');
        } else if (approvedLeave.duration === 'Half Day') {
            core_status = 'HALF_DAY';
            if (approvedLeave.leave_portion === 'FIRST_HALF') {
                modifier_flags.push('HALF_DAY_FN');
                // Works second half. Must check in by Mid Time, check out by Shift End
                if (firstIn > halfDayThresholdDate || lastOut < expectedEndDate) {
                    core_status = 'ABSENT';
                }
            } else if (approvedLeave.leave_portion === 'SECOND_HALF') {
                modifier_flags.push('HALF_DAY_AN');
                // Works first half. Must check in by Shift Start (with grace), check out on/after Mid Time
                if (firstIn > maxGraceDate || lastOut < halfDayThresholdDate) {
                    core_status = 'ABSENT';
                }
            }
        }
    } else {
        if (core_status === 'PRESENT') {
            // Strict timing check
            if (firstIn >= halfDayThresholdDate || lastOut <= halfDayThresholdDate || workingHours < (requiredHours / 2)) {
                core_status = 'ABSENT';
            }
        }
    }

    if (core_status === 'PRESENT' || core_status === 'HALF_DAY') {
        if (firstIn > maxGraceDate) modifier_flags.push('LATE');
        if (workingHours > requiredHours) modifier_flags.push('OVERTIME');
        if (lastOut < expectedEndDate) modifier_flags.push('EARLY_EXIT');

        if (core_status === 'HALF_DAY' && workingHours > 0) {
            if (lastOut <= halfDayThresholdDate) modifier_flags.push('FIRST_HALF');
            else if (firstIn >= halfDayThresholdDate) modifier_flags.push('SECOND_HALF');
        }
    }

    return { core_status, modifier_flags };
}

exports.calculateAttendance = function(mode, params) {
    if (mode === 'SHIFT_TIMING') {
        return calculateShiftTimingMode(params);
    }
    return calculateWorkingHoursMode(params);
};
