const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");
const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage() });

router.get("/", settingsController.getSettings);
router.post("/update", settingsController.updateSettings);
router.post("/holiday", settingsController.addHoliday);
router.put('/holiday/:id', settingsController.updateHoliday);
router.delete('/holiday/:id', settingsController.deleteHoliday);
router.post("/holidays/upload", upload.single("file"), settingsController.uploadHolidays);

// Shifts routes
router.get("/shifts", settingsController.getShifts);
router.post("/shifts", settingsController.addShift);
router.put("/shifts/:id", settingsController.updateShift);
router.delete("/shifts/:id", settingsController.deleteShift);

// Departments routes
router.get("/departments", settingsController.getDepartments);
router.post("/departments", settingsController.addDepartment);
router.put("/departments/:id", settingsController.updateDepartment);
router.delete("/departments/:id", settingsController.deleteDepartment);

// Levels routes
router.get("/levels", settingsController.getLevels);
router.post("/levels", settingsController.addLevel);
router.put("/levels/:id", settingsController.updateLevel);
router.delete("/levels/:id", settingsController.deleteLevel);
// Custom Leave routes
router.get("/custom-leaves/:employee_id", settingsController.getCustomLeaves);
router.post("/custom-leaves", settingsController.setCustomLeaves);

module.exports = router;