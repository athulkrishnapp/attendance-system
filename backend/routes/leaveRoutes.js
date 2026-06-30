const express = require("express");
const router = express.Router();
const leaveController = require("../controllers/leaveController");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../uploads/leaves");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Employee Routes
router.post("/validate", upload.none(), leaveController.validateLeave);
router.post("/request", upload.single("file"), leaveController.requestLeave);
router.get("/my-leaves/:id", leaveController.getMyLeaves);

// Admin Routes
router.get("/all", leaveController.getAllLeaves);
router.put("/update", leaveController.updateLeaveStatus);
router.put("/:id/approve", leaveController.approveLeave);
router.put("/:id/reject", leaveController.rejectLeave);
router.put("/:id/forward", leaveController.forwardLeave);

// Leave Types Routes
router.get("/types", leaveController.getLeaveTypes);
router.post("/types", leaveController.addLeaveType);
router.put("/types/:id", leaveController.updateLeaveType);
router.delete("/types/:id", leaveController.deleteLeaveType);

// Leave Entitlements Routes
router.get("/entitlements", leaveController.getLeaveEntitlements);
router.post("/entitlements", leaveController.addLeaveEntitlement);
router.put("/entitlements/:id", leaveController.updateLeaveEntitlement);
router.delete("/entitlements/:id", leaveController.deleteLeaveEntitlement);

// Leave Balances
router.get("/balances/:id", leaveController.getLeaveBalances);
router.post("/balance-action", leaveController.requestBalanceAction);
router.get("/balance-actions", leaveController.getBalanceActions);
router.put("/balance-actions/:id", leaveController.updateBalanceActionStatus);

module.exports = router;