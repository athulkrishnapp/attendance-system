import { Link, useLocation } from "react-router-dom";

const Sidebar = () => {
  const location = useLocation();
  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;
  const isAdmin = user?.role_id === 1;

  const isActive = (path) => location.pathname === path;

  return (
    <div style={styles.sidebar}>
      <h2 style={styles.brand}>Attendance Pro</h2>
      <nav style={styles.nav}>
        {isAdmin ? (
          <>
            <Link to="/dashboard" style={isActive("/dashboard") ? styles.activeLink : styles.link}>Admin Dashboard</Link>
            <Link to="/employees" style={isActive("/employees") ? styles.activeLink : styles.link}>Manage Staff</Link>
            <Link to="/attendance" style={isActive("/attendance") ? styles.activeLink : styles.link}>Master Reports</Link>
            <Link to="/approvals" style={isActive("/approvals") ? styles.activeLink : styles.link}>Leave Approvals</Link>
            <Link to="/regularizations" style={isActive("/regularizations") ? styles.activeLink : styles.link}>Regularizations</Link>
            <Link to="/settings" style={isActive("/settings") ? styles.activeLink : styles.link}>Settings</Link>
          </>
        ) : (
          <>
            <Link to="/swipe-reports" style={isActive("/swipe-reports") ? styles.activeLink : styles.link}>Swipe Reports</Link>
            <Link to="/request-leave" style={isActive("/request-leave") ? styles.activeLink : styles.link}>Request Leave</Link>
          </>
        )}
      </nav>
    </div>
  );
};

const styles = {
  sidebar: { 
    width: "260px", 
    backgroundColor: "var(--secondary)", 
    color: "var(--text-light)", 
    display: "flex", 
    flexDirection: "column", 
    padding: "24px", 
    height: "100vh", 
    position: "fixed", 
    top: 0, 
    left: 0, 
    boxShadow: "var(--shadow-md)" 
  },
  brand: { 
    fontSize: "22px", 
    fontWeight: "700", 
    marginBottom: "40px", 
    color: "var(--primary)", 
    letterSpacing: "-0.5px" 
  },
  nav: { 
    display: "flex", 
    flexDirection: "column", 
    gap: "8px", 
    flexGrow: 1 
  },
  link: { 
    color: "#94a3b8", 
    textDecoration: "none", 
    fontSize: "15px", 
    padding: "12px 16px", 
    borderRadius: "8px", 
    transition: "all 0.2s ease", 
    fontWeight: "500" 
  },
  activeLink: { 
    color: "var(--primary)", 
    textDecoration: "none", 
    fontSize: "15px", 
    padding: "12px 16px", 
    backgroundColor: "rgba(2, 132, 199, 0.1)", 
    borderRadius: "8px", 
    fontWeight: "600", 
    borderLeft: "4px solid var(--primary)" 
  }
};

export default Sidebar;