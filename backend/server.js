const express = require("express");
const cors = require("cors");

const employeeRoutes = require("./routes/employeeRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const authRoutes = require("./routes/authRoutes");
const reportRoutes = require("./routes/reportRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const leaveRoutes = require("./routes/leaveRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Attendance API Running");
});

app.use("/employees", employeeRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/auth", authRoutes);
app.use("/reports", reportRoutes);
app.use("/settings", settingsRoutes);
app.use("/leave", leaveRoutes);

const PORT = 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});