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
            <th style={styles.th}>Status</th>
          </tr>
        </thead>

        <tbody>
          {reports.map((log) => (
            <tr key={log.id} style={styles.tr}>
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
                {log.first_in || "--:--"}
              </td>

              <td style={styles.td}>
                {log.last_out || "--:--"}
              </td>

              <td style={styles.td}>
                {log.working_hours
                  ? `${log.working_hours}h`
                  : "0h"}
              </td>

              <td style={styles.td}>
                <span
                  style={
                    log.status === "PRESENT"
                      ? styles.badgePresent
                      : log.status === "ABSENT"
                      ? styles.badgeAbsent
                      : styles.badgeOther
                  }
                >
                  {log.status}
                </span>
              </td>
            </tr>
          ))}

          {reports.length === 0 && (
            <tr>
              <td
                colSpan="6"
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
};

export default AttendanceTable;