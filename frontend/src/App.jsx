import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import EmployeeManagement from "./pages/EmployeeManagement";
import AttendanceReport from "./pages/AttendanceReport";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import LeaveApprovals from "./pages/LeaveApprovals"; 

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/employees" element={<EmployeeManagement />} />
        <Route path="/attendance" element={<AttendanceReport />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/my-dashboard" element={<EmployeeDashboard />} />
        <Route path="/approvals" element={<LeaveApprovals />} /> {/* <-- 2. ROUTE ADDED HERE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;