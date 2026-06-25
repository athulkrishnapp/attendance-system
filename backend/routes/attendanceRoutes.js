const express = require("express");
const router = express.Router();
const multer = require("multer");
const attendanceController = require("../controllers/attendanceController");

// Configure Multer to save files in the folder you created
const upload = multer({ dest: "uploads/attendance_excel_files/" });

// The route expects a file input named "file"
router.post("/upload", upload.single("file"), attendanceController.uploadAttendance);
router.put("/regularize", attendanceController.requestRegularization);
router.get('/calendar/:month', attendanceController.getCalendarStatus);
router.get('/date/:date', attendanceController.getAttendanceByDate);
router.put('/record/:id', attendanceController.updateAttendanceRecord);
module.exports = router;