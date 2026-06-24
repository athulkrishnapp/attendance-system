const EmployeeForm = ({ formData, handleInputChange, handleSubmit, handleCancel, statusMsg }) => {
  return (
    <div style={styles.formCard}>
      <div style={styles.headerRow}>
        <h3 style={{ margin: 0 }}>Register New Staff</h3>
        <button type="button" onClick={handleCancel} style={styles.cancelBtn}>✕</button>
      </div>
      
      {statusMsg.text && (
        <div style={statusMsg.type === "error" ? styles.errorMsg : styles.successMsg}>
          {statusMsg.text}
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.formGrid}>
        <input type="text" name="employee_code" placeholder="Employee Code (e.g. EMP002)" value={formData.employee_code} onChange={handleInputChange} required style={styles.input} />
        <input type="text" name="name" placeholder="Full Name" value={formData.name} onChange={handleInputChange} required style={styles.input} />
        <input type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleInputChange} required style={styles.input} />
        <input type="password" name="password" placeholder="Temporary Password" value={formData.password} onChange={handleInputChange} required style={styles.input} />
        <select name="role_id" value={formData.role_id} onChange={handleInputChange} style={styles.input}>
          <option value={2}>Standard Employee</option>
          <option value={1}>Administrator</option>
        </select>
        <button type="submit" style={styles.submitBtn}>Save Employee</button>
      </form>
    </div>
  );
};

const styles = {
  formCard: { backgroundColor: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", borderLeft: "4px solid #3b82f6" },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" },
  input: { padding: "10px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "14px" },
  submitBtn: { gridColumn: "span 2", backgroundColor: "#10b981", color: "white", border: "none", padding: "12px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" },
  cancelBtn: { background: "none", border: "none", color: "#94a3b8", fontSize: "18px", cursor: "pointer" },
  successMsg: { marginBottom: "15px", padding: "10px", backgroundColor: "#d1fae5", color: "#065f46", borderRadius: "6px", fontSize: "14px" },
  errorMsg: { marginBottom: "15px", padding: "10px", backgroundColor: "#fee2e2", color: "#991b1b", borderRadius: "6px", fontSize: "14px" }
};

export default EmployeeForm;