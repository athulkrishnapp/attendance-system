const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");

router.get("/", settingsController.getSettings);
router.post("/update", settingsController.updateSettings);
router.post("/holiday", settingsController.addHoliday);

module.exports = router;