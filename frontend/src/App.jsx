import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import EmployeeManagement from "./pages/EmployeeManagement";
import AttendanceReport from "./pages/AttendanceReport";
import EmployeeProfile from "./pages/EmployeeProfile";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import ApprovalsInbox from "./pages/ApprovalsInbox";
import SwipeReports from "./pages/SwipeReports"; 
import RequestLeave from "./pages/RequestLeave"; 
import LeavePolicy from "./pages/LeavePolicy";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/employees" element={<EmployeeManagement />} />
        <Route path="/employees/:id/profile" element={<EmployeeProfile />} />
        <Route path="/attendance" element={<AttendanceReport />} />
        <Route path="/approvals" element={<ApprovalsInbox />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/leave-policy" element={<LeavePolicy />} />
        
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