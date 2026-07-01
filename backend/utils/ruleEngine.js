/**
 * Global definitions and system overrides evaluation.
 */
function evaluateSystemOverrides({ firstIn, lastOut, workingHours, isWeekend, holidayName, approvedLeave }) {
    let core_status = null;
    let modifier_flags = [];

    if (!firstIn || !lastOut || isNaN(new Date(firstIn).getTime()) || isNaN(new Date(lastOut).getTime())) {
        core_status = 'MISSING_PUNCH';
    } else if (workingHours === 0) {
        core_status = 'ABSENT';
    } else if (isWeekend) {
        core_status = 'WEEKEND';
        if (workingHours > 0) modifier_flags.push('WEEKEND_WORK');
    } else if (holidayName) {
        core_status = 'HOLIDAY';
        if (workingHours > 0) modifier_flags.push('HOLIDAY_WORK');
    } else if (approvedLeave && approvedLeave.duration === 'Full Day') {
        core_status = 'LEAVE';
    }

    return { core_status, modifier_flags };
}

/**
 * Calculates core_status and modifier_flags based on "Working Hours Based" rules.
 */
function calculateWorkingHoursMode(params) {
    const { firstIn, lastOut, workingHours, expectedStartDate, expectedEndDate, maxGraceDate, requiredHours, approvedLeave } = params;
    
    let { core_status, modifier_flags } = evaluateSystemOverrides(params);

    const shiftStart = expectedStartDate;
    const shiftStartWithGrace = maxGraceDate;
    const shiftEnd = expectedEndDate;
    const midHours = requiredHours / 2;

    let graceTime = 0;
    if (shiftStart && shiftStartWithGrace) {
        graceTime = new Date(shiftStartWithGrace).getTime() - new Date(shiftStart).getTime();
    }
    
    let shiftEndMinusGrace = shiftEnd;
    if (shiftEnd) {
        shiftEndMinusGrace = new Date(new Date(shiftEnd).getTime() - graceTime);
    }

    // 1. Core Status Calculation:
    if (!core_status) {
        if (workingHours >= requiredHours) {
            core_status = 'PRESENT';
        } else if (workingHours >= midHours && workingHours < requiredHours) {
            if (approvedLeave && approvedLeave.duration === 'Half Day') {
                core_status = 'HALF_DAY';
            } else {
                core_status = 'ABSENT';
            }
        } else if (workingHours < midHours) {
            core_status = 'ABSENT';
        }
    }

    // 2. Modifier Flags Calculation (Hourly):
    if (firstIn && shiftStart && shiftStartWithGrace) {
        if (firstIn > shiftStart && firstIn <= shiftStartWithGrace) {
            modifier_flags.push('LATE');
        }
    }

    if (lastOut && shiftEnd && shiftEndMinusGrace) {
        if (lastOut < shiftEnd && lastOut >= shiftEndMinusGrace) {
            modifier_flags.push('EARLY_EXIT');
        }
    }

    if (workingHours > requiredHours) {
        modifier_flags.push('OVERTIME');
    }

    return { core_status, modifier_flags };
}

/**
 * Calculates core_status and modifier_flags based on "Shift Timing Based" rules.
 */
function calculateShiftTimingMode(params) {
    const { firstIn, lastOut, workingHours, expectedStartDate, expectedEndDate, halfDayThresholdDate, maxGraceDate, requiredHours, approvedLeave } = params;
    
    let { core_status, modifier_flags } = evaluateSystemOverrides(params);

    const shiftStart = expectedStartDate;
    const shiftStartWithGrace = maxGraceDate;
    const shiftEnd = expectedEndDate;
    const midTime = halfDayThresholdDate;
    const midHours = requiredHours / 2;

    let graceTime = 0;
    if (shiftStart && shiftStartWithGrace) {
        graceTime = new Date(shiftStartWithGrace).getTime() - new Date(shiftStart).getTime();
    }
    
    let shiftEndMinusGrace = shiftEnd;
    if (shiftEnd) {
        shiftEndMinusGrace = new Date(new Date(shiftEnd).getTime() - graceTime);
    }

    // 1. Core Status Calculation:
    if (!core_status) {
        if (approvedLeave && approvedLeave.duration === 'Half Day') {
            if (approvedLeave.leave_portion === 'FIRST_HALF') {
                if (firstIn <= midTime && lastOut >= shiftEnd) {
                    core_status = 'HALF_DAY';
                } else {
                    core_status = 'ABSENT';
                }
            } else if (approvedLeave.leave_portion === 'SECOND_HALF') {
                if (firstIn <= shiftStartWithGrace && lastOut >= midTime) {
                    core_status = 'HALF_DAY';
                } else {
                    core_status = 'ABSENT';
                }
            } else {
                core_status = 'ABSENT';
            }
        } else {
            if (firstIn >= midTime || lastOut <= midTime || workingHours < midHours) {
                core_status = 'ABSENT';
            } else if (firstIn <= shiftStartWithGrace && lastOut >= shiftEnd) {
                core_status = 'PRESENT';
            } else {
                core_status = 'ABSENT';
            }
        }
    }

    // 2. Modifier Flags Calculation (Shift):
    if (firstIn && shiftStart && shiftStartWithGrace) {
        if (firstIn > shiftStart && firstIn <= shiftStartWithGrace) {
            modifier_flags.push('LATE');
        }
    }

    if (lastOut && shiftEnd && shiftEndMinusGrace) {
        if (lastOut < shiftEnd && lastOut >= shiftEndMinusGrace) {
            modifier_flags.push('EARLY_EXIT');
        }
    }

    if (workingHours > requiredHours) {
        modifier_flags.push('OVERTIME');
    }

    if (core_status === 'HALF_DAY') {
        if (lastOut <= midTime) {
            modifier_flags.push('FIRST_HALF');
        }
        if (firstIn >= midTime) {
            modifier_flags.push('SECOND_HALF');
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
