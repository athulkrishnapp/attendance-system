const express = require("express");
const router = express.Router();
const { dashboard, getAttendanceReport, getMyAttendance } = require("../controllers/reportController");

router.get("/dashboard", dashboard);
router.get("/attendance", getAttendanceReport);
router.get("/my-attendance/:id", getMyAttendance); // NEW ROUTE

module.exports = router;