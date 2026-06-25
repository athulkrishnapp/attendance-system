import { useLocation, Link } from "react-router-dom";

const Navbar = () => {
  const location = useLocation();
  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : { name: "Admin" };

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/dashboard": return "Dashboard Overview";
      case "/employees": return "Employee Management";
      case "/attendance": return "Master Attendance Report";
      case "/swipe-reports": return "My Swipe Reports";
      case "/request-leave": return "Leave Management";
      case "/profile": return "My Profile";
      default: return "System Portal";
    }
  };

  return (
    <header style={styles.navbar}>
      <h1 style={styles.title}>{getPageTitle()}</h1>
      <div style={styles.userInfo}>
        <span style={styles.welcomeText}>Welcome back, <strong>{user.name}</strong></span>
        <Link to="/profile" style={{textDecoration: 'none'}}>
          <div style={{...styles.avatar, cursor: "pointer"}} title="Go to Profile">
            {user.name.charAt(0).toUpperCase()}
          </div>
        </Link>
      </div>
    </header>
  );
};
// keep existing styles...

const styles = {
  navbar: { display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "var(--bg-card)", padding: "20px 40px", boxShadow: "var(--shadow-sm)", marginBottom: "30px", borderRadius: "var(--radius)", border: "1px solid var(--border)" },
  title: { margin: 0, fontSize: "22px", fontWeight: "600", color: "var(--text-main)", letterSpacing: "-0.5px" },
  userInfo: { display: "flex", alignItems: "center", gap: "15px" },
  welcomeText: { color: "var(--text-muted)", fontSize: "15px" },
  avatar: { width: "42px", height: "42px", borderRadius: "50%", backgroundColor: "var(--primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "18px", boxShadow: "var(--shadow-sm)" }
};

export default Navbar;