const fs = require('fs');
const content = fs.readFileSync('frontend/src/components/AttendanceTable.jsx', 'utf8');

const target1 = `              <td style={styles.td}>
                <span
                  style={
                    log.core_status === "PRESENT"
                      ? styles.badgePresent
                      : log.core_status === "ABSENT"
                      ? styles.badgeAbsent
                      : styles.badgeOther
                  }
                >
                  {log.core_status}
                </span>
              </td>`;

const replacement1 = `              <td style={styles.td}>
                <span
                  style={
                    log.core_status === "PRESENT"
                      ? styles.badgePresent
                      : log.core_status === "ABSENT"
                      ? styles.badgeAbsent
                      : log.core_status === "UNMARKED"
                      ? styles.badgeUnmarked
                      : (log.core_status === "WEEKEND" || log.core_status === "HOLIDAY")
                      ? styles.badgeHoliday
                      : styles.badgeOther
                  }
                >
                  {log.core_status}
                </span>
              </td>`;

const target2 = `  badgeOther: {
    backgroundColor: "#fef08a",
    color: "#854d0e",
    padding: "6px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "bold",
  },`;

const replacement2 = `  badgeOther: {
    backgroundColor: "#fef08a",
    color: "#854d0e",
    padding: "6px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "bold",
  },

  badgeUnmarked: {
    backgroundColor: "#f1f5f9",
    color: "#64748b",
    padding: "6px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "bold",
  },

  badgeHoliday: {
    backgroundColor: "#e0f2fe",
    color: "#0369a1",
    padding: "6px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "bold",
  },`;

let newContent = content.replace(target1, replacement1);
newContent = newContent.replace(target2, replacement2);
fs.writeFileSync('frontend/src/components/AttendanceTable.jsx', newContent);
console.log("Patched AttendanceTable.jsx");
