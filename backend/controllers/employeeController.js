const employeeModel = require("../models/employeeModel");

const getEmployees = async (req, res) => {
  try {
    const result = await employeeModel.getAllEmployees();
    res.json(result.rows);
  } catch (err) { res.status(500).send("Error"); }
};

const createEmployee = async (req, res) => {
  try {
    const result = await employeeModel.createEmployee(req.body);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).send("Error"); }
};

const updateEmployee = async (req, res) => {
  try {
    const result = await employeeModel.updateEmployee(req.params.id, req.body);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).send("Error"); }
};

const deleteEmployee = async (req, res) => {
  try {
    await employeeModel.deleteEmployee(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).send("Error"); }
};

module.exports = { getEmployees, createEmployee, updateEmployee, deleteEmployee };