const express = require("express");
const router = express.Router();

const {
  dashboard,
  getAttendanceReport
} = require("../controllers/reportController");

router.get("/dashboard", dashboard);
router.get("/attendance", getAttendanceReport);

module.exports = router;
