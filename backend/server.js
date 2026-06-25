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
app.use("/leaves", leaveRoutes);

const PORT = 5001;

const server = app.listen(PORT, () => {
  console.log(`✅ Server running successfully on port ${PORT}`);
});

// Catch Port conflicts loudly!
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ PORT ${PORT} IS ALREADY IN USE! You need to kill the port.`);
  } else {
    console.error(`❌ SERVER ERROR:`, err);
  }
});