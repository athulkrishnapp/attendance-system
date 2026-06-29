import { useState, useEffect } from "react";
import { api } from "../services/api";

const EmployeeForm = ({ formData, handleInputChange, handleSubmit, handleCancel, statusMsg, isEditing }) => {
  const currentUser = JSON.parse(localStorage.getItem("user")) || {};
  const isSelf = isEditing && currentUser.id === formData.id;
  const [departments, setDepartments] = useState([]);
  const [levels, setLevels] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [managers, setManagers] = useState([]);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [deptRes, levelRes, shiftRes, empRes] = await Promise.all([
          api.departments.getAll(),
          api.levels.getAll(),
          api.shifts.getAll(),
          api.employees.getAll()
        ]);
        setDepartments(deptRes.data);
        setLevels(levelRes.data);
        setShifts(shiftRes.data);
        setManagers(empRes.data);
      } catch (err) {
        console.error("Failed to load dropdown data for employee form", err);
      }
    };
    fetchDropdowns();
  }, []);
  return (
    <div style={styles.formCard}>
      <div style={styles.headerRow}>
        <h3 style={{ margin: 0 }}>{isEditing ? "Edit Employee" : "Register New Staff"}</h3>
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
        {!isEditing && (
          <input type="password" name="password" placeholder="Temporary Password" value={formData.password || ''} onChange={handleInputChange} required style={styles.input} />
        )}
        <select name="role_id" value={formData.role_id || 2} onChange={handleInputChange} style={styles.input} required disabled={isSelf}>
          <option value={2}>Standard Employee</option>
          <option value={1}>Administrator</option>
        </select>

        <select name="department_id" value={formData.department_id || ''} onChange={handleInputChange} style={styles.input} required>
          <option value="">-- Select Department --</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
        </select>
        
        {parseInt(formData.role_id) !== 1 && (
          <select name="level_id" value={formData.level_id || ''} onChange={handleInputChange} style={styles.input} required>
            <option value="">-- Select Level --</option>
            {levels.map(l => <option key={l.id} value={l.id}>{l.level_name}</option>)}
          </select>
        )}
        
        <select name="shift_id" value={formData.shift_id || ''} onChange={handleInputChange} style={styles.input} required={parseInt(formData.role_id) !== 1}>
          <option value="">-- Select Shift {parseInt(formData.role_id) === 1 ? '(Optional)' : ''} --</option>
          {shifts.map(s => <option key={s.id} value={s.id}>{s.shift_name}</option>)}
        </select>
        
        <select name="manager_id" value={formData.manager_id || ''} onChange={handleInputChange} style={styles.input}>
          <option value="">-- Select Manager (Optional) --</option>
          {managers
            .filter(m => !isEditing || m.employee_code !== formData.employee_code)
            .map(m => <option key={m.id} value={m.id}>{m.name} ({m.employee_code})</option>)}
        </select>
        <button type="submit" style={styles.submitBtn}>{isEditing ? "Save Changes" : "Save Employee"}</button>
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