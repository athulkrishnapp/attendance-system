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

const [statusMsg, setStatusMsg] = useState({
text: "",
type: "",
});

const [formData, setFormData] = useState({
employee_code: "",
name: "",
email: "",
password: "",
role_id: 2,
});

useEffect(() => {
fetchEmployees();
}, []);

const fetchEmployees = async () => {
try {
const res = await API.get("/employees");
setEmployees(res.data);
setLoading(false);
} catch (err) {
console.error(err);
setLoading(false);
}
};

const handleInputChange = (e) => {
setFormData({
...formData,
[e.target.name]: e.target.value,
});
};

const handleEdit = (emp) => {
setEditingEmp(emp);

setFormData({
  employee_code: emp.employee_code,
  name: emp.name,
  email: emp.email,
  password: emp.password || "",
  role_id: emp.role_id,
});

setShowForm(true);

};

const handleDelete = async (id) => {
if (!window.confirm("Delete this employee?")) return;

try {
  await API.delete(`/employees/${id}`);

  setStatusMsg({
    text: "Employee deleted successfully",
    type: "success",
  });

  fetchEmployees();
} catch (err) {
  console.error(err);

  setStatusMsg({
    text: "Delete failed",
    type: "error",
  });
}


};

const handleSave = async (e) => {
e.preventDefault();


try {
  if (editingEmp) {
    // Change your handleSave PUT block to this:
if (editingEmp) {
  await API.put(`/employees/${editingEmp.id}`, {
    employee_code: formData.employee_code,
    name: formData.name,
    email: formData.email,
    role_id: formData.role_id, // Now it will actually save the role change!
  });
  setStatusMsg({ text: "Employee updated successfully", type: "success" });
}

    setStatusMsg({
      text: "Employee updated successfully",
      type: "success",
    });
  } else {
    await API.post("/employees", formData);

    setStatusMsg({
      text: "Employee added successfully",
      type: "success",
    });
  }

  setShowForm(false);
  setEditingEmp(null);

  setFormData({
    employee_code: "",
    name: "",
    email: "",
    password: "",
    role_id: 2,
  });

  fetchEmployees();

  setTimeout(() => {
    setStatusMsg({
      text: "",
      type: "",
    });
  }, 3000);

} catch (err) {
  console.error(err);

  setStatusMsg({
    text: "Operation failed",
    type: "error",
  });
}


};

return ( <div style={styles.layout}> <Sidebar />


  <div style={styles.main}>
    <Navbar />

    <div style={styles.contentPadding}>
      <header style={styles.header}>
        <h2>Manage Staff Directory</h2>

        <button
          style={styles.addBtn}
          onClick={() => {
            setShowForm(!showForm);
            setEditingEmp(null);

            setFormData({
              employee_code: "",
              name: "",
              email: "",
              password: "",
              role_id: 2,
            });
          }}
        >
          {showForm ? "Cancel" : "+ Add New Employee"}
        </button>
      </header>

      {showForm && (
        <EmployeeForm
          formData={formData}
          handleInputChange={handleInputChange}
          handleSubmit={handleSave}
          handleCancel={() => setShowForm(false)}
          statusMsg={statusMsg}
        />
      )}

      <div style={styles.tableContainer}>
        {loading ? (
          <p style={{ padding: "20px" }}>
            Loading staff data...
          </p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>ID</th>
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
                  <td style={styles.td}>{emp.id}</td>

                  <td style={styles.td}>
                    <strong>
                      {emp.employee_code}
                    </strong>
                  </td>

                  <td style={styles.td}>
                    {emp.name}
                  </td>

                  <td style={styles.td}>
                    {emp.email}
                  </td>

                  <td style={styles.td}>
                    <span
                      style={
                        emp.role_id === 1
                          ? styles.badgeAdmin
                          : styles.badgeUser
                      }
                    >
                      {emp.role_id === 1
                        ? "Admin"
                        : "Employee"}
                    </span>
                  </td>

                  <td style={styles.td}>
                    <button
                      style={styles.editBtn}
                      onClick={() =>
                        handleEdit(emp)
                      }
                    >
                      Edit
                    </button>

                    <button
                      style={styles.delBtn}
                      onClick={() =>
                        handleDelete(emp.id)
                      }
                    >
                      Delete
                    </button>
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
layout: {
display: "flex",
minHeight: "100vh",
backgroundColor: "#f8fafc",
fontFamily: "Arial, sans-serif",
},

main: {
flexGrow: 1,
marginLeft: "250px",
},

contentPadding: {
padding: "0 40px 40px 40px",
},

header: {
display: "flex",
justifyContent: "space-between",
alignItems: "center",
marginBottom: "20px",
},

addBtn: {
backgroundColor: "#3b82f6",
color: "white",
border: "none",
padding: "10px 20px",
borderRadius: "6px",
cursor: "pointer",
fontWeight: "bold",
},

editBtn: {
background: "#ffc107",
border: "none",
padding: "6px 12px",
marginRight: "5px",
cursor: "pointer",
borderRadius: "4px",
},

delBtn: {
background: "#dc3545",
color: "white",
border: "none",
padding: "6px 12px",
cursor: "pointer",
borderRadius: "4px",
},

tableContainer: {
backgroundColor: "white",
borderRadius: "8px",
boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
overflow: "hidden",
},

table: {
width: "100%",
borderCollapse: "collapse",
textAlign: "left",
},

th: {
backgroundColor: "#f1f5f9",
padding: "15px",
borderBottom: "2px solid #e2e8f0",
},

tr: {
borderBottom: "1px solid #e2e8f0",
},

td: {
padding: "15px",
},

badgeAdmin: {
backgroundColor: "#fef08a",
color: "#854d0e",
padding: "4px 8px",
borderRadius: "12px",
fontSize: "12px",
fontWeight: "bold",
},

badgeUser: {
backgroundColor: "#e0f2fe",
color: "#0369a1",
padding: "4px 8px",
borderRadius: "12px",
fontSize: "12px",
fontWeight: "bold",
},
};

export default EmployeeManagement;
