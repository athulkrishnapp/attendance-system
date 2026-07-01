const AttendanceTable = ({ reports, loading }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "--";

    // Handles both "2026-06-01" and "2026-06-01T00:00:00.000Z"
    const dateOnly = dateString.split("T")[0];
    const [year, month, day] = dateOnly.split("-");

    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    return `${day} ${months[parseInt(month, 10) - 1]} ${year}`;
  };

  if (loading) {
    return (
      <div style={styles.loadingBox}>
        Loading attendance data...
      </div>
    );
  }

  return (
    <div style={styles.tableContainer}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Date</th>
            <th style={styles.th}>Employee</th>
            <th style={styles.th}>First In</th>
            <th style={styles.th}>Last Out</th>
            <th style={styles.th}>Total Hrs</th>
            <th style={styles.th}>Leave Type</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Flags</th>
          </tr>
        </thead>

        <tbody>
          {reports.map((log) => (
            <tr key={`${log.employee_id}_${log.attendance_date}`} style={styles.tr}>
              <td style={styles.td}>
                <strong>{formatDate(log.attendance_date)}</strong>
              </td>

              <td style={styles.td}>
                {log.name}
                <br />
                <span
                  style={{
                    fontSize: "12px",
                    color: "#64748b",
                  }}
                >
                  {log.employee_code}
                </span>
              </td>

              <td style={styles.td}>
                {log.first_in || "-"}
              </td>

              <td style={styles.td}>
                {log.last_out || "-"}
              </td>

              <td style={styles.td}>
                {log.working_hours
                  ? `${log.working_hours}h`
                  : "0h"}
              </td>

              <td style={styles.td}>
                {log.leave_type_name ? (
                  <span style={{ fontWeight: '600', color: '#6366f1', fontSize: '13px' }}>{log.leave_type_name}</span>
                ) : (
                  <span style={{ color: '#cbd5e1' }}>--</span>
                )}
              </td>

              <td style={styles.td}>
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
              </td>

              <td style={styles.td}>
                {log.modifier_flags && Array.isArray(log.modifier_flags) && log.modifier_flags.length > 0 ? (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {log.modifier_flags.map((flag, idx) => (
                      <span key={idx} style={styles.flagChip}>
                        {flag.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: '#cbd5e1' }}></span>
                )}
              </td>
            </tr>
          ))}

          {reports.length === 0 && (
            <tr>
              <td
                colSpan="7"
                style={styles.emptyState}
              >
                No processed attendance records found.
                Please upload a file from the Dashboard.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const styles = {
  tableContainer: {
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    overflow: "hidden",
    width: "100%",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },

  th: {
    backgroundColor: "#f8fafc",
    padding: "15px",
    borderBottom: "2px solid #e2e8f0",
    color: "#475569",
    fontWeight: "bold",
  },

  tr: {
    borderBottom: "1px solid #e2e8f0",
    transition: "background-color 0.2s",
  },

  td: {
    padding: "15px",
    color: "#334155",
    verticalAlign: "middle",
  },

  loadingBox: {
    padding: "20px",
    textAlign: "center",
    backgroundColor: "white",
    borderRadius: "8px",
    color: "#64748b",
  },

  emptyState: {
    textAlign: "center",
    padding: "40px",
    color: "#64748b",
  },

  badgePresent: {
    backgroundColor: "#d1fae5",
    color: "#065f46",
    padding: "6px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "bold",
  },

  badgeAbsent: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    padding: "6px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "bold",
  },

  badgeOther: {
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
  },

  flagChip: {
    backgroundColor: "#e2e8f0",
    color: "#334155",
    padding: "3px 6px",
    borderRadius: "4px",
    fontSize: "10px",
    fontWeight: "600",
    textTransform: "uppercase",
  },
};

export default AttendanceTable;