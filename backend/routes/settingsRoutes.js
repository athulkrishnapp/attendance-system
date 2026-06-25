const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");

router.get("/", settingsController.getSettings);
router.post("/update", settingsController.updateSettings);
router.post("/holiday", settingsController.addHoliday);
// Add to routes/settingsRoutes.js
router.put('/holiday/:id', settingsController.updateHoliday);
router.delete('/holiday/:id', settingsController.deleteHoliday);
module.exports = router;