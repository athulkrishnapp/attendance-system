
const { evaluateCondition } = require("./backend/utils/ruleEngine");

const context = {
    workingHours: 4,
    requiredHours: 8,
    halfRequiredHours: 4,
    firstInTime: new Date("2026-06-30T09:00:00").getTime(),
    lastOutTime: new Date("2026-06-30T13:00:00").getTime(),
    isWeekend: false,
    isHoliday: false,
    maxGraceDate: new Date("2026-06-30T09:15:00").getTime(),
    halfDayThresholdDate: new Date("2026-06-30T13:00:00").getTime()
};

const logic = {
  "operator": "OR",
  "conditions": [
    { "operator": "<", "field": "workingHours", "value": "halfRequiredHours" },
    { "operator": ">=", "field": "firstInTime", "value": "halfDayThresholdDate" },
    { "operator": "<=", "field": "lastOutTime", "value": "halfDayThresholdDate" }
  ]
};

console.log("Evaluate Half Day:", evaluateCondition(logic, context));


