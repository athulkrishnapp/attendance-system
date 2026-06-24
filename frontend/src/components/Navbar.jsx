import { useLocation } from "react-router-dom";

const Navbar = () => {
  const location = useLocation();
  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : { name: "Admin" };

  // Generate a page title based on the route
  const getPageTitle = () => {
    switch (location.pathname) {
      case "/dashboard": return "Dashboard Overview";
      case "/employees": return "Employee Management";
      case "/attendance": return "Master Attendance Report";
      case "/profile": return "My Profile";
      default: return "System Portal";
    }
  };

  return (
    <header style={styles.navbar}>
      <h1 style={styles.title}>{getPageTitle()}</h1>
      <div style={styles.userInfo}>
        <span style={styles.welcomeText}>Welcome back, <strong>{user.name}</strong></span>
        <div style={styles.avatar}>{user.name.charAt(0).toUpperCase()}</div>
      </div>
    </header>
  );
};

const styles = {
  navbar: { display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "white", padding: "20px 40px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", marginBottom: "30px", borderRadius: "8px" },
  title: { margin: 0, fontSize: "24px", color: "#1e293b" },
  userInfo: { display: "flex", alignItems: "center", gap: "15px" },
  welcomeText: { color: "#475569", fontSize: "16px" },
  avatar: { width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#38bdf8", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "18px" }
};

export default Navbar;