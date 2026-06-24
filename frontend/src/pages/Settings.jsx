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
      setMsg({ text: "Company Rules updated!", type: "success" });
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
      fetchData(); // Refresh list
      setMsg({ text: "Holiday added to Calendar!", type: "success" });
      setTimeout(() => setMsg({ text: "", type: "" }), 3000);
    } catch (err) {
      setMsg({ text: "Failed to add holiday", type: "error" });
    }
  };

  // Helper to format date cleanly
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
              <h3>⚙️ Default Shift Rules</h3>
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
              <h3>📅 Add Company Holiday</h3>
              <form onSubmit={handleAddHoliday} style={styles.rowForm}>
                <input type="date" value={newHoliday.holiday_date} onChange={(e) => setNewHoliday({...newHoliday, holiday_date: e.target.value})} style={styles.input} required />
                <input type="text" placeholder="e.g. Christmas Day" value={newHoliday.description} onChange={(e) => setNewHoliday({...newHoliday, description: e.target.value})} style={styles.input} required />
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
                  {holidays.length === 0 && <tr><td colSpan="2" style={{padding: "20px", textAlign: "center"}}>No holidays added yet.</td></tr>}
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
  layout: { display: "flex", minHeight: "100vh", backgroundColor: "#f8fafc", fontFamily: "Arial, sans-serif" },
  main: { flexGrow: 1, marginLeft: "250px" },
  contentPadding: { padding: "0 40px 40px 40px" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" },
  card: { backgroundColor: "white", padding: "25px", borderRadius: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" },
  form: { display: "flex", flexDirection: "column", gap: "10px", marginTop: "15px" },
  rowForm: { display: "flex", gap: "10px", marginTop: "15px", marginBottom: "20px" },
  label: { fontSize: "14px", color: "#475569", fontWeight: "bold" },
  input: { padding: "10px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "14px", flexGrow: 1 },
  saveBtn: { backgroundColor: "#10b981", color: "white", border: "none", padding: "12px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", marginTop: "10px" },
  addBtn: { backgroundColor: "#3b82f6", color: "white", border: "none", padding: "10px 20px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left", marginTop: "20px" },
  th: { backgroundColor: "#f1f5f9", padding: "10px", borderBottom: "2px solid #e2e8f0", color: "#475569" },
  tr: { borderBottom: "1px solid #e2e8f0" },
  td: { padding: "10px", color: "#334155" },
  successMsg: { marginBottom: "20px", padding: "15px", backgroundColor: "#d1fae5", color: "#065f46", borderRadius: "6px", fontWeight: "bold" },
  errorMsg: { marginBottom: "20px", padding: "15px", backgroundColor: "#fee2e2", color: "#991b1b", borderRadius: "6px", fontWeight: "bold" }
};

export default Settings;