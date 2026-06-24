import { Link, useLocation, useNavigate } from "react-router-dom";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Get the user from local storage to check their role
  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;
  const isAdmin = user?.role_id === 1;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div style={styles.sidebar}>
      <h2 style={styles.brand}>Attendance Pro</h2>
      <nav style={styles.nav}>
        
        {/* ADMIN ONLY LINKS */}
        {isAdmin && (
          <>
            <Link to="/dashboard" style={isActive("/dashboard") ? styles.activeLink : styles.link}>Admin Dashboard</Link>
            <Link to="/employees" style={isActive("/employees") ? styles.activeLink : styles.link}>Manage Staff</Link>
            <Link to="/attendance" style={isActive("/attendance") ? styles.activeLink : styles.link}>Master Reports</Link>
            
            {/* <-- NEW APPROVALS LINK ADDED HERE --> */}
            <Link to="/approvals" style={isActive("/approvals") ? styles.activeLink : styles.link}>Leave Approvals</Link>
            
            <Link to="/settings" style={isActive("/settings") ? styles.activeLink : styles.link}>Settings & Calendar</Link>
          </>
        )}

        {/* EMPLOYEE ONLY LINKS */}
        {!isAdmin && (
          <>
            <Link to="/my-dashboard" style={isActive("/my-dashboard") ? styles.activeLink : styles.link}>My Dashboard</Link>
          </>
        )}

        {/* EVERYONE SEES THIS */}
        <Link to="/profile" style={isActive("/profile") ? styles.activeLink : styles.link}>My Profile</Link>
        
      </nav>
      <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
    </div>
  );
};

const styles = {
  sidebar: { width: "250px", backgroundColor: "#1e293b", color: "white", display: "flex", flexDirection: "column", padding: "20px", height: "100vh", position: "fixed", top: 0, left: 0 },
  brand: { fontSize: "24px", marginBottom: "40px", color: "#38bdf8" },
  nav: { display: "flex", flexDirection: "column", gap: "15px", flexGrow: 1 },
  link: { color: "#cbd5e1", textDecoration: "none", fontSize: "16px", padding: "10px", borderRadius: "6px", transition: "0.2s" },
  activeLink: { color: "white", textDecoration: "none", fontSize: "16px", padding: "10px", backgroundColor: "#334155", borderRadius: "6px" },
  logoutBtn: { backgroundColor: "#ef4444", color: "white", border: "none", padding: "12px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", marginTop: "auto" }
};

export default Sidebar;