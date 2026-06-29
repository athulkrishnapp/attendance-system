const express = require("express");
const router = express.Router();
const { dashboard, getAttendanceReport, getMyAttendance, getMasterReport } = require("../controllers/reportController");

router.get("/dashboard", dashboard);
router.get("/attendance", getAttendanceReport);
router.get("/my-attendance/:id", getMyAttendance);
router.get("/master", getMasterReport);

module.exports = router;