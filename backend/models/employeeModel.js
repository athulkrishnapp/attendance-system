const pool = require("../db");

const getAllEmployees = () => {
  return pool.query(`
    SELECT e.*, d.department_name, el.level_name, s.shift_name, m.name as manager_name
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN employee_levels el ON e.level_id = el.id
    LEFT JOIN shifts s ON e.shift_id = s.id
    LEFT JOIN employees m ON e.manager_id = m.id
    WHERE e.is_active = true
    ORDER BY e.id
  `);
};

const createEmployee = ({ employee_code, name, email, password, role_id, department_id, level_id, shift_id, manager_id }) => {
  return pool.query(
    `INSERT INTO employees (employee_code, name, email, password, role_id, department_id, level_id, shift_id, manager_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [employee_code, name, email, password, role_id, department_id || null, level_id || null, shift_id || null, manager_id || null]
  );
};

const updateEmployee = (id, { employee_code, name, email, role_id, department_id, level_id, shift_id, manager_id }) => {
  return pool.query(
    `UPDATE employees 
     SET employee_code = $1, name = $2, email = $3, role_id = $4, department_id = $5, level_id = $6, shift_id = $7, manager_id = $8 
     WHERE id = $9 
     RETURNING *`,
    [employee_code, name, email, role_id, department_id || null, level_id || null, shift_id || null, manager_id || null, id]
  );
};

const deleteEmployee = (id) => pool.query(`
  UPDATE employees 
  SET is_active = false,
      employee_code = employee_code || '-DEL-' || id,
      email = email || '-DEL-' || id
  WHERE id = $1
`, [id]);

module.exports = { getAllEmployees, createEmployee, updateEmployee, deleteEmployee };