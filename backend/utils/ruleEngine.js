/**
 * ATTENDANCE RULE ENGINE
 * =====================
 * Global Definitions:
 *   - shiftStart: Start of the shift window (e.g. 09:00)
 *   - shiftEnd: End of the shift window (e.g. 18:00)
 *   - grace: grace_period_minutes added to shiftStart / subtracted from shiftEnd
 *   - shiftStartWithGrace (= shiftStart + grace): latest valid punch-in for a non-late arrival
 *   - shiftEndMinusGrace (= shiftEnd - grace): earliest valid punch-out for a non-early-exit
 *   - midTime: half-day threshold time (e.g. 13:00) — used for SHIFT_TIMING
 *   - MISSING_PUNCH: only 1 punch exists (firstIn present, lastOut is null OR firstIn === lastOut in ms)
 */

/**
 * Determines if the day is a system-level override that bypasses attendance rules.
 * Returns an early core_status if the day is a WEEKEND, HOLIDAY, or full-day LEAVE.
 * Returns null if no override applies, allowing mode-specific logic to run.
 *
 * NOTE: MISSING_PUNCH is intentionally NOT evaluated here. It is evaluated FIRST,
 * before this function is called, in each mode's own logic.
 */
function getSystemOverride({ workingHours, isWeekend, holidayName, approvedLeave }) {
    let override_status = null;
    let override_flags = [];

    if (isWeekend) {
        override_status = 'WEEKEND';
        if (workingHours > 0) override_flags.push('WEEKEND_WORK');
    } else if (holidayName) {
        override_status = 'HOLIDAY';
        if (workingHours > 0) override_flags.push('HOLIDAY_WORK');
    } else if (approvedLeave && approvedLeave.duration === 'Full Day') {
        override_status = 'LEAVE';
    }

    return { override_status, override_flags };
}

/**
 * Checks if a punch pair constitutes a MISSING_PUNCH.
 * This is true when:
 *   - firstIn is null/invalid, OR
 *   - lastOut is null/invalid, OR
 *   - firstIn and lastOut are the same moment (scanner spam / single punch stored twice)
 */
function isMissingPunch(firstIn, lastOut) {
    if (!firstIn && !lastOut) return false; // 0 punches = ABSENT, not missing punch
    if (!firstIn) return true;
    if (!lastOut) return true;
    if (isNaN(new Date(firstIn).getTime())) return true;
    if (isNaN(new Date(lastOut).getTime())) return true;
    // Same millisecond — treated as a single punch (scanner spam)
    if (new Date(firstIn).getTime() === new Date(lastOut).getTime()) return true;
    return false;
}

/**
 * Status is determined by WHEN the employee punched in and out, not just duration.
 *
 * === No approved half-day leave ===
 *  PRESENT   : firstIn <= shiftStartWithGrace  AND  lastOut >= shiftEnd
 *  ABSENT    : firstIn > midTime               (too late to count for anything)
 *  ABSENT    : lastOut < midTime               (left before the midpoint — not enough presence)
 *  ABSENT    : any other case not matching PRESENT
 *
 * === Approved FIRST_HALF leave (employee works the SECOND half) ===
 *  HALF_DAY  : firstIn <= midTime  AND  lastOut >= shiftEnd  (with grace on shiftEnd allowed)
 *  ABSENT    : otherwise
 *
 * === Approved SECOND_HALF leave (employee works the FIRST half) ===
 *  HALF_DAY  : firstIn <= shiftStartWithGrace  AND  lastOut >= midTime
 *  ABSENT    : otherwise
 *
 * Modifier flags (same rules as working-hours mode):
 *   LATE, EARLY_EXIT, OVERTIME, HOURLY_LEAVE, FIRST_HALF, SECOND_HALF
 */
function calculateShiftTimingMode(params) {
    const {
        firstIn, lastOut, workingHours,
        expectedStartDate, expectedEndDate, halfDayThresholdDate, maxGraceDate,
        requiredHours, approvedLeave
    } = params;

    let core_status = null;
    let modifier_flags = [];

    // --- Step 1: MISSING_PUNCH (highest priority) ---
    if (isMissingPunch(firstIn, lastOut)) {
        return { core_status: 'MISSING_PUNCH', modifier_flags: [] };
    }

    // --- Step 2: System overrides (WEEKEND / HOLIDAY / full-day LEAVE) ---
    const { override_status, override_flags } = getSystemOverride(params);
    if (override_status) {
        return { core_status: override_status, modifier_flags: override_flags };
    }

    if (!firstIn && !lastOut) {
        return { core_status: 'ABSENT', modifier_flags: modifier_flags };
    }

    // --- Step 3: Derived time boundaries ---
    const shiftStart          = expectedStartDate      ? new Date(expectedStartDate)      : null;
    const shiftStartWithGrace = maxGraceDate           ? new Date(maxGraceDate)           : null;
    const shiftEnd            = expectedEndDate        ? new Date(expectedEndDate)        : null;
    const midTime             = halfDayThresholdDate   ? new Date(halfDayThresholdDate)   : null;
    const midHours            = requiredHours / 2;

    let graceMs = 0;
    if (shiftStart && shiftStartWithGrace) {
        graceMs = shiftStartWithGrace.getTime() - shiftStart.getTime();
    }
    const shiftEndMinusGrace = shiftEnd
        ? new Date(shiftEnd.getTime() - graceMs)
        : null;

    // --- Step 4: Core status calculation ---
    if (approvedLeave && approvedLeave.duration === 'Half Day') {
        if (approvedLeave.leave_portion === 'FIRST_HALF') {
            if (firstIn <= midTime && lastOut >= shiftEndMinusGrace) {
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
        // --- No half-day leave path — determine PRESENT / HALF_DAY / ABSENT purely by punch timing ---
        const arrivedLate = firstIn > shiftStartWithGrace;
        const leftEarly = lastOut < shiftEndMinusGrace;

        if (arrivedLate && leftEarly) {
            core_status = 'ABSENT';
        } else if (arrivedLate) {
            core_status = 'HALF_DAY';
            modifier_flags.push('SECOND_HALF');
        } else if (leftEarly) {
            core_status = 'HALF_DAY';
            modifier_flags.push('FIRST_HALF');
        } else {
            core_status = 'PRESENT';
        }
    }

    // --- Step 5: Modifier flags ---

    // LATE: punched in after shift start but within grace period
    if (firstIn && shiftStart && shiftStartWithGrace) {
        if (firstIn > shiftStart && firstIn <= shiftStartWithGrace && !modifier_flags.includes('SECOND_HALF')) {
            modifier_flags.push('LATE');
        }
    }

    // EARLY_EXIT: punched out before shift end but within grace period
    if (lastOut && shiftEnd && shiftEndMinusGrace) {
        if (lastOut < shiftEnd && lastOut >= shiftEndMinusGrace && !modifier_flags.includes('FIRST_HALF')) {
            modifier_flags.push('EARLY_EXIT');
        }
    }

    // OVERTIME: worked beyond the full shift duration
    if (workingHours > requiredHours) {
        modifier_flags.push('OVERTIME');
    }

    // HOURLY_LEAVE
    if (approvedLeave && approvedLeave.duration === 'Hourly') {
        modifier_flags.push('HOURLY_LEAVE');
    }

    // FIRST_HALF / SECOND_HALF — only on HALF_DAY status
    // FIRST_HALF: employee worked the first half (took 2nd half leave) — lastOut before/at midTime
    // SECOND_HALF: employee worked the second half (took 1st half leave) — firstIn at/after midTime
    if (core_status === 'HALF_DAY') {
        if (approvedLeave && approvedLeave.leave_portion === 'SECOND_HALF') {
            modifier_flags.push('FIRST_HALF');  // worked first half
        }
        if (approvedLeave && approvedLeave.leave_portion === 'FIRST_HALF') {
            modifier_flags.push('SECOND_HALF'); // worked second half
        }
    }

    return { core_status, modifier_flags };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
exports.calculateAttendance = function(params) {
    return calculateShiftTimingMode(params);
};
