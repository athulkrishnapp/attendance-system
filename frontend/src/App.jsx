import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import EmployeeManagement from "./pages/EmployeeManagement";
import AttendanceReport from "./pages/AttendanceReport";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import LeaveApprovals from "./pages/LeaveApprovals"; 
import SwipeReports from "./pages/SwipeReports"; // NEW
import RequestLeave from "./pages/RequestLeave"; // NEW

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/employees" element={<EmployeeManagement />} />
        <Route path="/attendance" element={<AttendanceReport />} />
        <Route path="/approvals" element={<LeaveApprovals />} /> 
        <Route path="/settings" element={<Settings />} />
        
        {/* New Employee Routes */}
        <Route path="/swipe-reports" element={<SwipeReports />} />
        <Route path="/request-leave" element={<RequestLeave />} />
        
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;