import { useState, useEffect } from "react";
import API from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const Settings = () => {
  const [settings, setSettings] = useState({
    shift_start_time: "", shift_end_time: "", grace_period_minutes: 0, required_working_hours: 0
  });
  const [holidays, setHolidays] = useState([]);
  const [newHoliday, setNewHoliday] = useState({ holiday_date: "", description: "" });
  const [msg, setMsg] = useState({ text: "", type: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await API.get("/settings");
      if (res.data.settings) setSettings(res.data.settings);
      setHolidays(res.data.holidays);
    } catch (err) {
      console.error("Failed to load settings");
    }
  };

  const handleSettingsUpdate = async (e) => {
    e.preventDefault();
    try {
      await API.post("/settings/update", settings);
      setMsg({ text: "Company Rules updated successfully!", type: "success" });
      setTimeout(() => setMsg({ text: "", type: "" }), 3000);
    } catch (err) {
      setMsg({ text: "Failed to update rules", type: "error" });
    }
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    try {
      await API.post("/settings/holiday", newHoliday);
      setNewHoliday({ holiday_date: "", description: "" });
      fetchData();
      setMsg({ text: "Holiday added to calendar!", type: "success" });
      setTimeout(() => setMsg({ text: "", type: "" }), 3000);
    } catch (err) {
      setMsg({ text: "Failed to add holiday", type: "error" });
    }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString();

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.main}>
        <Navbar />
        <div style={styles.contentPadding}>
          
          {msg.text && (
            <div style={msg.type === "success" ? styles.successMsg : styles.errorMsg}>
              {msg.text}
            </div>
          )}

          <div style={styles.grid}>
            {/* Shift Rules Card */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>⚙️ Shift Rules</h3>
              <form onSubmit={handleSettingsUpdate} style={styles.form}>
                <label style={styles.label}>Shift Start Time</label>
                <input type="time" value={settings.shift_start_time} onChange={(e) => setSettings({...settings, shift_start_time: e.target.value})} style={styles.input} required />
                
                <label style={styles.label}>Shift End Time</label>
                <input type="time" value={settings.shift_end_time} onChange={(e) => setSettings({...settings, shift_end_time: e.target.value})} style={styles.input} required />
                
                <label style={styles.label}>Grace Period (Minutes)</label>
                <input type="number" value={settings.grace_period_minutes} onChange={(e) => setSettings({...settings, grace_period_minutes: e.target.value})} style={styles.input} required />
                
                <label style={styles.label}>Required Working Hours</label>
                <input type="number" step="0.5" value={settings.required_working_hours} onChange={(e) => setSettings({...settings, required_working_hours: e.target.value})} style={styles.input} required />
                
                <button type="submit" style={styles.saveBtn}>Save Shift Rules</button>
              </form>
            </div>

            {/* Holiday Calendar Card */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>📅 Company Holidays</h3>
              <form onSubmit={handleAddHoliday} style={styles.rowForm}>
                <input type="date" value={newHoliday.holiday_date} onChange={(e) => setNewHoliday({...newHoliday, holiday_date: e.target.value})} style={styles.input} required />
                <input type="text" placeholder="Description" value={newHoliday.description} onChange={(e) => setNewHoliday({...newHoliday, description: e.target.value})} style={styles.input} required />
                <button type="submit" style={styles.addBtn}>Add</button>
              </form>

              <table style={styles.table}>
                <thead>
                  <tr><th style={styles.th}>Date</th><th style={styles.th}>Holiday Name</th></tr>
                </thead>
                <tbody>
                  {holidays.map(h => (
                    <tr key={h.id} style={styles.tr}>
                      <td style={styles.td}><strong>{formatDate(h.holiday_date)}</strong></td>
                      <td style={styles.td}>{h.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  layout: { display: "flex", minHeight: "100vh" },
  main: { flexGrow: 1, marginLeft: "260px" },
  contentPadding: { padding: "0 40px 40px 40px" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" },
  card: { backgroundColor: "var(--bg-card)", padding: "24px", borderRadius: "var(--radius)", boxShadow: "var(--shadow-md)", border: "1px solid var(--border)" },
  cardTitle: { color: "var(--text-main)", marginBottom: "20px" },
  form: { display: "flex", flexDirection: "column", gap: "15px" },
  rowForm: { display: "flex", gap: "10px", marginBottom: "20px" },
  label: { fontSize: "14px", fontWeight: "600", color: "var(--text-muted)" },
  input: { padding: "12px", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "15px", flexGrow: 1, outline: "none" },
  saveBtn: { backgroundColor: "var(--primary)", color: "white", border: "none", padding: "12px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", marginTop: "10px" },
  addBtn: { backgroundColor: "var(--primary)", color: "white", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left" },
  th: { backgroundColor: "var(--bg-main)", padding: "12px", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "12px", textTransform: "uppercase" },
  tr: { borderBottom: "1px solid var(--border)" },
  td: { padding: "12px", color: "var(--text-main)", fontSize: "14px" },
  successMsg: { marginBottom: "20px", padding: "15px", backgroundColor: "#f0fdf4", color: "#166534", borderRadius: "6px", fontWeight: "600" },
  errorMsg: { marginBottom: "20px", padding: "15px", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "6px", fontWeight: "600" }
};

export default Settings;