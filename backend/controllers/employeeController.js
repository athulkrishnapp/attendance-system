const employeeModel = require("../models/employeeModel");
const bcrypt = require("bcryptjs"); // 1. Import bcrypt

const getEmployees = async (req, res) => {
  try {
    const result = await employeeModel.getAllEmployees();
    res.json(result.rows);
  } catch (err) { 
    res.status(500).json({ error: "Failed to fetch employees" }); 
  }
};

const createEmployee = async (req, res) => {
  try {
    if (!req.body.manager_id && req.body.role_id !== 1) { // In practice id=1 is super admin, but if creating a new user they need a manager
       return res.status(400).json({ error: "Manager selection is mandatory for new employees" });
    }
    // 2. Hash the password before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    
    // 3. Replace the plain text password with the hashed one
    const employeeData = { ...req.body, password: hashedPassword };

    const result = await employeeModel.createEmployee(employeeData);
    res.json(result.rows[0]);
  } catch (err) { 
    console.error(err);
    res.status(500).json({ error: "Failed to create employee" }); 
  }
};

const addEmployee = createEmployee;

const updateEmployee = async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    if (targetId === 1 && req.body.role_id !== 1) {
       return res.status(403).json({ error: "Cannot change Super Admin role" });
    }
    
    const result = await employeeModel.updateEmployee(req.params.id, req.body);
    res.json(result.rows[0]);
  } catch (err) { 
    res.status(500).json({ error: "Failed to update employee" }); 
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    if (targetId === 1) {
       return res.status(403).json({ error: "Cannot delete Super Admin" });
    }
    await employeeModel.deleteEmployee(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) { 
    res.status(500).json({ error: "Failed to delete employee" }); 
  }
};

module.exports = { getEmployees, createEmployee, addEmployee, updateEmployee, deleteEmployee };