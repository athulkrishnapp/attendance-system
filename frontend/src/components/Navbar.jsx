import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const user = JSON.parse(localStorage.getItem("user")) || { name: "User" };
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <nav style={styles.navbar}>
      <div style={styles.left}>
        <h3 style={styles.greeting}>
          {user.name}
          {user.employee_code && (
            <span style={styles.empCodeBadge}>{user.employee_code}</span>
          )}
        </h3>
      </div>
      
      <div style={styles.right}>
        {/* Profile Button with Icon and Text */}
        <button 
          style={styles.profileBtn} 
          onClick={() => navigate("/profile")}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#e2e8f0"}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#f1f5f9"}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>Profile</span>
        </button>

        <button 
          onClick={handleLogout} 
          style={styles.logoutBtn}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#fecaca"}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#fee2e2"}
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

const styles = {
  navbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px 40px",
    backgroundColor: "var(--bg-card, #ffffff)",
    borderBottom: "1px solid var(--border, #e2e8f0)",
    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  },
  left: {
    display: "flex",
    alignItems: "center",
  },
  greeting: {
    margin: 0,
    fontSize: "18px",
    color: "var(--text-main, #0f172a)",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "10px", // Adds space between the name and the badge
  },
  empCodeBadge: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#64748b", // Muted slate color
    backgroundColor: "#f1f5f9", // Light gray background
    padding: "4px 10px",
    borderRadius: "20px", // Pill shape
    border: "1px solid #e2e8f0",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
  },
  profileBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#f1f5f9",
    color: "#475569",
    border: "1px solid #cbd5e1",
    padding: "8px 16px",
    borderRadius: "20px", /* Pill shape */
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
  logoutBtn: {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  }
};

export default Navbar;