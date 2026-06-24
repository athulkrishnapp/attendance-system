const express = require("express");
const router = express.Router();
const leaveController = require("../controllers/leaveController");

// Employee Routes
router.post("/request", leaveController.requestLeave);
router.get("/my-leaves/:id", leaveController.getMyLeaves);

// Admin Routes
router.get("/all", leaveController.getAllLeaves);
router.put("/update", leaveController.updateLeaveStatus);

module.exports = router;