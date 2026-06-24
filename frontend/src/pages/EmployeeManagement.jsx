import { useState, useEffect } from "react";
import API from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import EmployeeForm from "../components/EmployeeForm";

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [statusMsg, setStatusMsg] = useState({ text: "", type: "" });

  const [formData, setFormData] = useState({
    employee_code: "",
    name: "",
    email: "",
    password: "",
    role_id: 2,
  });

  useEffect(() => { fetchEmployees(); }, []);

  const fetchEmployees = async () => {
    try {
      const res = await API.get("/employees");
      setEmployees(res.data);
      setLoading(false);
    } catch (err) { setLoading(false); }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEdit = (emp) => {
    setEditingEmp(emp);
    setFormData({
      employee_code: emp.employee_code,
      name: emp.name,
      email: emp.email,
      role_id: emp.role_id,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this employee?")) return;
    try {
      await API.delete(`/employees/${id}`);
      setStatusMsg({ text: "Employee deleted successfully", type: "success" });
      fetchEmployees();
    } catch (err) { setStatusMsg({ text: "Delete failed", type: "error" }); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingEmp) {
        await API.put(`/employees/${editingEmp.id}`, { ...formData });
        setStatusMsg({ text: "Employee updated successfully", type: "success" });
      } else {
        await API.post("/employees", formData);
        setStatusMsg({ text: "Employee added successfully", type: "success" });
      }
      setShowForm(false);
      setEditingEmp(null);
      setFormData({ employee_code: "", name: "", email: "", password: "", role_id: 2 });
      fetchEmployees();
    } catch (err) { setStatusMsg({ text: "Operation failed", type: "error" }); }
  };

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.main}>
        <Navbar />
        <div style={styles.contentPadding}>
          <header style={styles.header}>
            <h2 style={styles.title}>Manage Staff Directory</h2>
            <button style={styles.addBtn} onClick={() => { setShowForm(!showForm); setEditingEmp(null); }}>
              {showForm ? "Cancel" : "+ Add New Employee"}
            </button>
          </header>

          {showForm && (
            <EmployeeForm formData={formData} handleInputChange={handleInputChange} handleSubmit={handleSave} handleCancel={() => setShowForm(false)} statusMsg={statusMsg} />
          )}

          <div style={styles.tableContainer}>
            {loading ? <p style={{ padding: "20px" }}>Loading staff data...</p> : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Code</th>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Role</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id} style={styles.tr}>
                      <td style={styles.td}><strong>{emp.employee_code}</strong></td>
                      <td style={styles.td}>{emp.name}</td>
                      <td style={styles.td}>{emp.email}</td>
                      <td style={styles.td}>
                        <span style={emp.role_id === 1 ? styles.badgeAdmin : styles.badgeUser}>
                          {emp.role_id === 1 ? "Admin" : "Employee"}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <button style={styles.editBtn} onClick={() => handleEdit(emp)}>Edit</button>
                        <button style={styles.delBtn} onClick={() => handleDelete(emp.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  layout: { display: "flex", minHeight: "100vh" },
  main: { flexGrow: 1, marginLeft: "260px" },
  contentPadding: { padding: "0 40px 40px 40px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" },
  title: { fontSize: "24px", fontWeight: "600", color: "var(--text-main)" },
  addBtn: { backgroundColor: "var(--primary)", color: "white", border: "none", padding: "12px 20px", borderRadius: "var(--radius)", cursor: "pointer", fontWeight: "600" },
  tableContainer: { backgroundColor: "var(--bg-card)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-md)", overflow: "hidden", border: "1px solid var(--border)" },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left" },
  th: { backgroundColor: "var(--bg-main)", padding: "16px", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "14px", textTransform: "uppercase" },
  tr: { borderBottom: "1px solid var(--border)" },
  td: { padding: "16px", color: "var(--text-main)" },
  editBtn: { background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", padding: "6px 12px", marginRight: "10px", cursor: "pointer", borderRadius: "4px", fontWeight: "500" },
  delBtn: { background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca", padding: "6px 12px", cursor: "pointer", borderRadius: "4px", fontWeight: "500" },
  badgeAdmin: { backgroundColor: "#fef08a", color: "#854d0e", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" },
  badgeUser: { backgroundColor: "#e0f2fe", color: "#0369a1", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" }
};

export default EmployeeManagement;