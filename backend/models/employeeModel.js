const pool = require("../db");

const getAllEmployees = () => pool.query("SELECT * FROM employees ORDER BY id");

const createEmployee = ({ employee_code, name, email, password, role_id }) => {
  return pool.query(
    "INSERT INTO employees (employee_code, name, email, password, role_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [employee_code, name, email, password, role_id]
  );
};

const updateEmployee = (id, { employee_code, name, email, role_id }) => {
  return pool.query(
    "UPDATE employees SET employee_code = $1, name = $2, email = $3, role_id = $4 WHERE id = $5 RETURNING *",
    [employee_code, name, email, role_id, id]
  );
};

const deleteEmployee = (id) => pool.query("DELETE FROM employees WHERE id = $1", [id]);

module.exports = { getAllEmployees, createEmployee, updateEmployee, deleteEmployee };