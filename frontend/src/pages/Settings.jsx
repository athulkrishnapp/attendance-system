import { useState, useEffect } from "react";
import API from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("shift");
  
  const [settings, setSettings] = useState({
    shift_start_time: "", shift_end_time: "", grace_period_minutes: 0, required_working_hours: 0, casual_leave_notice_days: 0
  });
  const [holidays, setHolidays] = useState([]);
  
  // States for Holiday Management
  const [newHoliday, setNewHoliday] = useState({ holiday_date: "", description: "" });
  const [editingHoliday, setEditingHoliday] = useState(null);
  
  const [msg, setMsg] = useState({ text: "", type: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await API.get("/settings");
      if (res.data.settings) setSettings(res.data.settings);
      setHolidays(res.data.holidays || []);
    } catch (err) {
      console.error("Failed to load settings");
    }
  };

  const showMessage = (text, type) => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };

  // --- Settings Handlers ---
  const handleSettingsUpdate = async (e) => {
    e.preventDefault();
    try {
      await API.post("/settings/update", settings);
      showMessage("Configuration saved successfully.", "success");
    } catch (err) {
      showMessage("Failed to update configuration.", "error");
    }
  };

  // --- Holiday Handlers ---
  const handleAddHoliday = async (e) => {
    e.preventDefault();
    try {
      await API.post("/settings/holiday", newHoliday);
      setNewHoliday({ holiday_date: "", description: "" });
      fetchData();
      showMessage("Holiday added successfully.", "success");
    } catch (err) {
      showMessage("Failed to add holiday.", "error");
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!window.confirm("Are you sure you want to delete this holiday?")) return;
    try {
      await API.delete(`/settings/holiday/${id}`);
      fetchData();
      showMessage("Holiday deleted.", "success");
    } catch (err) {
      showMessage("Failed to delete holiday.", "error");
    }
  };

  const handleUpdateHoliday = async (e) => {
    e.preventDefault();
    try {
      await API.put(`/settings/holiday/${editingHoliday.id}`, editingHoliday);
      setEditingHoliday(null);
      fetchData();
      showMessage("Holiday updated successfully.", "success");
    } catch (err) {
      showMessage("Failed to update holiday.", "error");
    }
  };

  // --- Utility ---
  const isPastDate = (dateString) => {
    const holidayDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return holidayDate < today;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.main}>
        <Navbar />
        <div style={styles.contentPadding}>
          
          <div style={styles.header}>
            <h1 style={styles.pageTitle}>System Configuration</h1>
            <p style={styles.pageSubtitle}>Manage global rules, schedules, and compliance policies.</p>
          </div>

          {msg.text && (
            <div style={msg.type === "success" ? styles.successMsg : styles.errorMsg}>
              {msg.text}
            </div>
          )}

          <div style={styles.settingsContainer}>
            {/* Left Sidebar for Tabs */}
            <div style={styles.tabsMenu}>
              <button 
                onClick={() => setActiveTab("shift")} 
                style={activeTab === "shift" ? styles.tabActive : styles.tabInactive}
              >
                Shift Schedule
              </button>
              <button 
                onClick={() => setActiveTab("grace")} 
                style={activeTab === "grace" ? styles.tabActive : styles.tabInactive}
              >
                Grace Period
              </button>
              <button 
                onClick={() => setActiveTab("hours")} 
                style={activeTab === "hours" ? styles.tabActive : styles.tabInactive}
              >
                Working Hours
              </button>
              <button 
                onClick={() => setActiveTab("leave")} 
                style={activeTab === "leave" ? styles.tabActive : styles.tabInactive}
              >
                Leave Policies
              </button>
              <button 
                onClick={() => setActiveTab("holidays")} 
                style={activeTab === "holidays" ? styles.tabActive : styles.tabInactive}
              >
                Holiday Management
              </button>
            </div>

            {/* Right Content Area */}
            <div style={styles.tabContent}>
              
              {activeTab === "shift" && (
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Shift Timing Configuration</h3>
                  <hr style={styles.divider} />
                  <form onSubmit={handleSettingsUpdate} style={styles.form}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Official Shift Start Time</label>
                      <input type="time" value={settings.shift_start_time} onChange={(e) => setSettings({...settings, shift_start_time: e.target.value})} style={styles.input} required />
                    </div>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Official Shift End Time</label>
                      <input type="time" value={settings.shift_end_time} onChange={(e) => setSettings({...settings, shift_end_time: e.target.value})} style={styles.input} required />
                    </div>
                    <button type="submit" style={styles.saveBtn}>Save Configuration</button>
                  </form>
                </div>
              )}

              {activeTab === "grace" && (
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Grace Period Settings</h3>
                  <hr style={styles.divider} />
                  <form onSubmit={handleSettingsUpdate} style={styles.form}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Allowed Late Arrival (Minutes)</label>
                      <input type="number" value={settings.grace_period_minutes} onChange={(e) => setSettings({...settings, grace_period_minutes: e.target.value})} style={styles.input} required />
                      <span style={styles.helperText}>Employees swiping in within this window will not be marked late.</span>
                    </div>
                    <button type="submit" style={styles.saveBtn}>Save Configuration</button>
                  </form>
                </div>
              )}

              {activeTab === "hours" && (
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Working Hours Compliance</h3>
                  <hr style={styles.divider} />
                  <form onSubmit={handleSettingsUpdate} style={styles.form}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Required Daily Hours</label>
                      <input type="number" step="0.5" value={settings.required_working_hours} onChange={(e) => setSettings({...settings, required_working_hours: e.target.value})} style={styles.input} required />
                      <span style={styles.helperText}>Used to calculate half-days and short-leaves.</span>
                    </div>
                    <button type="submit" style={styles.saveBtn}>Save Configuration</button>
                  </form>
                </div>
              )}

              {activeTab === "leave" && (
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Casual Leave Policies</h3>
                  <hr style={styles.divider} />
                  <form onSubmit={handleSettingsUpdate} style={styles.form}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Notice Period (Days)</label>
                      <input type="number" min="0" value={settings.casual_leave_notice_days || 0} onChange={(e) => setSettings({...settings, casual_leave_notice_days: e.target.value})} style={styles.input} required />
                      <span style={styles.helperText}>Set to 0 to allow same-day casual leave requests.</span>
                    </div>
                    <button type="submit" style={styles.saveBtn}>Save Configuration</button>
                  </form>
                </div>
              )}

              {activeTab === "holidays" && (
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Public Holiday Registry</h3>
                  <hr style={styles.divider} />
                  
                  {/* Add New Holiday Form */}
                  <form onSubmit={handleAddHoliday} style={styles.addHolidayRow}>
                    <input type="date" value={newHoliday.holiday_date} onChange={(e) => setNewHoliday({...newHoliday, holiday_date: e.target.value})} style={styles.inputCompact} required />
                    <input type="text" placeholder="Holiday Title / Description" value={newHoliday.description} onChange={(e) => setNewHoliday({...newHoliday, description: e.target.value})} style={styles.inputCompactFlex} required />
                    <button type="submit" style={styles.actionBtnPrimary}>Add to Registry</button>
                  </form>

                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Date</th>
                        <th style={styles.th}>Holiday Name</th>
                        <th style={styles.th}>Status / Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {holidays.sort((a,b) => new Date(b.holiday_date) - new Date(a.holiday_date)).map(h => {
                        const past = isPastDate(h.holiday_date);
                        return (
                          <tr key={h.id} style={styles.tr}>
                            <td style={styles.td}><strong>{formatDate(h.holiday_date)}</strong></td>
                            <td style={styles.td}>{h.description}</td>
                            <td style={styles.td}>
                              {past ? (
                                <span style={styles.lockedBadge}>Completed</span>
                              ) : (
                                <div style={styles.actionGroup}>
                                  <button onClick={() => setEditingHoliday(h)} style={styles.textBtnEdit}>Edit</button>
                                  <span style={{color: '#cbd5e1'}}>|</span>
                                  <button onClick={() => handleDeleteHoliday(h.id)} style={styles.textBtnDelete}>Delete</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                      {holidays.length === 0 && (
                        <tr><td colSpan="3" style={styles.emptyState}>No holidays configured in the registry.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Edit Holiday Modal */}
      {editingHoliday && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{margin: '0 0 20px 0', color: '#1e293b'}}>Modify Holiday</h3>
            <form onSubmit={handleUpdateHoliday} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Date</label>
                <input type="date" value={editingHoliday.holiday_date.split('T')[0]} onChange={(e) => setEditingHoliday({...editingHoliday, holiday_date: e.target.value})} style={styles.input} required />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Holiday Name</label>
                <input type="text" value={editingHoliday.description} onChange={(e) => setEditingHoliday({...editingHoliday, description: e.target.value})} style={styles.input} required />
              </div>
              <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                <button type="button" onClick={() => setEditingHoliday(null)} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" style={styles.saveBtn}>Update Holiday</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

// Professional, Clean UI Styles
const styles = {
  layout: { display: "flex", minHeight: "100vh", backgroundColor: "#f8fafc" },
  main: { flexGrow: 1, marginLeft: "260px" },
  contentPadding: { padding: "40px" },
  
  header: { marginBottom: "30px" },
  pageTitle: { margin: "0 0 8px 0", fontSize: "24px", color: "#0f172a", fontWeight: "700", letterSpacing: "-0.5px" },
  pageSubtitle: { margin: 0, color: "#64748b", fontSize: "15px" },
  
  settingsContainer: { display: "flex", gap: "30px", alignItems: "flex-start" },
  
  tabsMenu: { display: "flex", flexDirection: "column", width: "240px", flexShrink: 0, gap: "4px" },
  tabActive: { backgroundColor: "#0f172a", color: "white", padding: "14px 20px", borderRadius: "8px", border: "none", textAlign: "left", cursor: "pointer", fontWeight: "600", fontSize: "14px", transition: "all 0.2s", boxShadow: "0 4px 6px -1px rgba(15, 23, 42, 0.2)" },
  tabInactive: { backgroundColor: "transparent", color: "#475569", padding: "14px 20px", borderRadius: "8px", border: "none", textAlign: "left", cursor: "pointer", fontWeight: "500", fontSize: "14px", transition: "all 0.2s" },
  
  tabContent: { flexGrow: 1 },
  
  card: { backgroundColor: "white", padding: "32px", borderRadius: "12px", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)", border: "1px solid #e2e8f0" },
  cardTitle: { color: "#0f172a", margin: "0 0 16px 0", fontSize: "18px", fontWeight: "600" },
  divider: { border: "none", borderTop: "1px solid #e2e8f0", margin: "0 0 24px 0" },
  
  form: { display: "flex", flexDirection: "column", gap: "20px", maxWidth: "500px" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "8px" },
  label: { fontSize: "13px", fontWeight: "700", color: "#334155", textTransform: "uppercase", letterSpacing: "0.5px" },
  input: { padding: "12px 16px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "15px", outline: "none", backgroundColor: "#f8fafc", color: "#0f172a", transition: "border-color 0.2s" },
  helperText: { fontSize: "12px", color: "#64748b", marginTop: "4px" },
  
  saveBtn: { backgroundColor: "#2563eb", color: "white", border: "none", padding: "12px 24px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px", marginTop: "10px", width: "fit-content", transition: "background-color 0.2s" },
  cancelBtn: { backgroundColor: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "12px 24px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px", marginTop: "10px", width: "fit-content" },
  
  addHolidayRow: { display: "flex", gap: "12px", marginBottom: "24px", alignItems: "stretch" },
  inputCompact: { padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", outline: "none" },
  inputCompactFlex: { padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", outline: "none", flexGrow: 1 },
  actionBtnPrimary: { backgroundColor: "#0f172a", color: "white", border: "none", padding: "0 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "13px", whiteSpace: "nowrap" },
  
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left" },
  th: { backgroundColor: "#f8fafc", padding: "12px 16px", borderBottom: "2px solid #e2e8f0", color: "#64748b", fontSize: "12px", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.5px" },
  tr: { borderBottom: "1px solid #e2e8f0", transition: "background-color 0.2s" },
  td: { padding: "16px", color: "#334155", fontSize: "14px", verticalAlign: "middle" },
  emptyState: { padding: "30px", textAlign: "center", color: "#94a3b8", fontStyle: "italic" },
  
  lockedBadge: { backgroundColor: "#f1f5f9", color: "#64748b", padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px", textTransform: "uppercase" },
  actionGroup: { display: "flex", gap: "12px", alignItems: "center" },
  textBtnEdit: { background: "none", border: "none", color: "#2563eb", fontWeight: "600", fontSize: "13px", cursor: "pointer", padding: 0 },
  textBtnDelete: { background: "none", border: "none", color: "#dc2626", fontWeight: "600", fontSize: "13px", cursor: "pointer", padding: 0 },

  successMsg: { marginBottom: "24px", padding: "16px", backgroundColor: "#f0fdf4", color: "#166534", borderRadius: "8px", fontWeight: "500", border: "1px solid #bbf7d0", fontSize: "14px" },
  errorMsg: { marginBottom: "24px", padding: "16px", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "8px", fontWeight: "500", border: "1px solid #fecaca", fontSize: "14px" },

  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modalContent: { backgroundColor: "white", padding: "32px", borderRadius: "12px", width: "400px", maxWidth: "90%", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }
};

export default Settings;