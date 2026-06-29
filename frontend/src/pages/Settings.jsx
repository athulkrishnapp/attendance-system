import { useState, useEffect } from "react";
import API, { api } from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("company");
  const [msg, setMsg] = useState({ text: "", type: "" });

  // Global Settings & Holidays
  const [settings, setSettings] = useState({
    shift_start_time: "", shift_end_time: "", grace_period_minutes: 0, required_working_hours: 0, casual_leave_notice_days: 0, financial_year_start_month: 1, financial_year_end_month: 12
  });
  const [holidays, setHolidays] = useState([]);
  const [newHoliday, setNewHoliday] = useState({ holiday_date: "", description: "" });

  // Enterprise Entities State
  const [shifts, setShifts] = useState([]);
  const [newShift, setNewShift] = useState({ shift_name: "", shift_start_time: "", shift_end_time: "", grace_period_minutes: 15, required_working_hours: 8, is_active: true });
  const [editingShiftId, setEditingShiftId] = useState(null);

  const [departments, setDepartments] = useState([]);
  const [newDepartment, setNewDepartment] = useState({ department_name: "", max_concurrent_leaves: 0 });
  const [editingDepartmentId, setEditingDepartmentId] = useState(null);

  const [levels, setLevels] = useState([]);
  const [newLevel, setNewLevel] = useState({ level_name: "" });
  const [editingLevelId, setEditingLevelId] = useState(null);

  const [leaveTypes, setLeaveTypes] = useState([]);
  const [newLeaveType, setNewLeaveType] = useState({ name: "", min_advance_notice_days: 0, requires_documentation: false, max_consecutive_days: 0, is_active: true });
  const [editingLeaveTypeId, setEditingLeaveTypeId] = useState(null);

  const [leaveEntitlements, setLeaveEntitlements] = useState([]);
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState("");
  const [quotaInputs, setQuotaInputs] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const newInputs = {};
    if (selectedLeaveTypeId) {
      levels.forEach(lvl => {
        const existing = leaveEntitlements.find(le => le.level_id === lvl.id && le.leave_type_id == selectedLeaveTypeId);
        newInputs[lvl.id] = existing ? existing.annual_quota : "";
      });
    }
    setQuotaInputs(newInputs);
  }, [selectedLeaveTypeId, leaveEntitlements, levels]);

  const fetchData = async () => {
    try {
      const [settingsRes, shiftsRes, deptRes, levelsRes, leaveTypesRes, leaveEntRes] = await Promise.all([
        API.get("/settings"),
        api.shifts.getAll(),
        api.departments.getAll(),
        api.levels.getAll(),
        api.leaveTypes.getAll(),
        api.leaveEntitlements.getAll()
      ]);
      
      if (settingsRes.data.settings) setSettings(settingsRes.data.settings);
      setHolidays(settingsRes.data.holidays || []);
      
      setShifts(shiftsRes.data);
      setDepartments(deptRes.data);
      setLevels(levelsRes.data);
      setLeaveTypes(leaveTypesRes.data);
      setLeaveEntitlements(leaveEntRes.data);
    } catch (err) {
      console.error(err);
      showMessage("Failed to load settings data", "error");
    }
  };

  const showMessage = (text, type) => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };

  // --- Auto Calculate Shift Hours ---
  const handleShiftTimeChange = (field, value) => {
    const updatedShift = { ...newShift, [field]: value };
    
    if (updatedShift.shift_start_time && updatedShift.shift_end_time) {
      const [startH, startM] = updatedShift.shift_start_time.split(':').map(Number);
      const [endH, endM] = updatedShift.shift_end_time.split(':').map(Number);
      
      let start = new Date(2000, 0, 1, startH, startM);
      let end = new Date(2000, 0, 1, endH, endM);
      
      // Support overnight shifts
      if (end < start) end.setDate(end.getDate() + 1);
      
      const diffHrs = (end - start) / (1000 * 60 * 60);
      updatedShift.required_working_hours = diffHrs.toFixed(1);
    }
    
    setNewShift(updatedShift);
  };

  // --- Global Handlers ---
  const handleSettingsUpdate = async (e) => {
    e.preventDefault();
    try {
      await API.post("/settings/update", settings);
      showMessage("Configuration saved successfully.", "success");
    } catch (err) {
      showMessage("Failed to update configuration.", "error");
    }
  };

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
    if (!window.confirm("Delete this holiday?")) return;
    try {
      await API.delete(`/settings/holiday/${id}`);
      fetchData();
      showMessage("Holiday deleted.", "success");
    } catch (err) {
      showMessage("Failed to delete holiday.", "error");
    }
  };

  const handleHolidayExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      await api.holidays.upload(formData);
      fetchData();
      showMessage("Holidays uploaded successfully.", "success");
    } catch (err) {
      showMessage("Failed to upload holidays Excel.", "error");
    }
  };

  // --- Entity CRUD Handlers ---
  const handleAddShift = async (e) => {
    e.preventDefault();

    // Strict Validation Check
    if (newShift.shift_start_time && newShift.shift_end_time) {
      const [startH, startM] = newShift.shift_start_time.split(':').map(Number);
      const [endH, endM] = newShift.shift_end_time.split(':').map(Number);
      let start = new Date(2000, 0, 1, startH, startM);
      let end = new Date(2000, 0, 1, endH, endM);
      if (end < start) end.setDate(end.getDate() + 1);
      
      const diffHrs = (end - start) / (1000 * 60 * 60);
      if (parseFloat(newShift.required_working_hours) > diffHrs) {
        showMessage(`Validation Error: Required working hours (${newShift.required_working_hours}) cannot exceed the total shift duration (${diffHrs.toFixed(1)} hours).`, "error");
        return;
      }
    }

    try {
      if (editingShiftId) {
        await api.shifts.update(editingShiftId, newShift);
        showMessage("Shift updated.", "success");
      } else {
        await api.shifts.create(newShift);
        showMessage("Shift added.", "success");
      }
      setNewShift({ shift_name: "", shift_start_time: "", shift_end_time: "", grace_period_minutes: 15, required_working_hours: 8, is_active: true });
      setEditingShiftId(null);
      fetchData();
    } catch (err) { showMessage("Failed to save shift.", "error"); }
  };

  const handleEditShift = (shift) => {
    setNewShift(shift);
    setEditingShiftId(shift.id);
  };
  const handleDeleteShift = async (id) => {
    if (!window.confirm("Archive this shift? Historical assignments will be preserved.")) return;
    try {
      await api.shifts.delete(id);
      fetchData();
      showMessage("Shift deleted.", "success");
    } catch (err) { showMessage("Failed to delete shift.", "error"); }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    try {
      if (editingDepartmentId) {
        await api.departments.update(editingDepartmentId, newDepartment);
        showMessage("Department updated.", "success");
      } else {
        await api.departments.create(newDepartment);
        showMessage("Department added.", "success");
      }
      setNewDepartment({ department_name: "", max_concurrent_leaves: 0 });
      setEditingDepartmentId(null);
      fetchData();
    } catch (err) { showMessage("Failed to save department.", "error"); }
  };

  const handleEditDepartment = (dept) => {
    setNewDepartment(dept);
    setEditingDepartmentId(dept.id);
  };

  const handleDeleteDepartment = async (id) => {
    if (!window.confirm("Archive this department? Existing employees will remain assigned to it until updated.")) return;
    try {
      await api.departments.delete(id);
      fetchData();
      showMessage("Department deleted.", "success");
    } catch (err) { showMessage("Failed to delete department.", "error"); }
  };

  const handleAddLevel = async (e) => {
    e.preventDefault();
    try {
      if (editingLevelId) {
        await api.levels.update(editingLevelId, newLevel);
        showMessage("Level updated.", "success");
      } else {
        await api.levels.create(newLevel);
        showMessage("Level added.", "success");
      }
      setNewLevel({ level_name: "" });
      setEditingLevelId(null);
      fetchData();
    } catch (err) { showMessage("Failed to save level.", "error"); }
  };

  const handleEditLevel = (lvl) => {
    setNewLevel(lvl);
    setEditingLevelId(lvl.id);
  };

  const handleDeleteLevel = async (id) => {
    if (!window.confirm("Archive this level? Existing employees will retain this level until updated.")) return;
    try {
      await api.levels.delete(id);
      fetchData();
      showMessage("Level deleted.", "success");
    } catch (err) { showMessage("Failed to delete level.", "error"); }
  };

  const handleAddLeaveType = async (e) => {
    e.preventDefault();
    try {
      if (editingLeaveTypeId) {
        await api.leaveTypes.update(editingLeaveTypeId, newLeaveType);
        showMessage("Leave Type updated.", "success");
      } else {
        await api.leaveTypes.create(newLeaveType);
        showMessage("Leave Type added.", "success");
      }
      setNewLeaveType({ name: "", min_advance_notice_days: 0, requires_documentation: false, max_consecutive_days: 0, is_active: true });
      setEditingLeaveTypeId(null);
      fetchData();
    } catch (err) { showMessage("Failed to save leave type.", "error"); }
  };

  const handleEditLeaveType = (lt) => {
    setNewLeaveType(lt);
    setEditingLeaveTypeId(lt.id);
  };

  const handleDeleteLeaveType = async (id) => {
    if (!window.confirm("Delete this leave type?")) return;
    try {
      await api.leaveTypes.delete(id);
      fetchData();
      showMessage("Leave Type deleted.", "success");
    } catch (err) { showMessage("Failed to delete leave type.", "error"); }
  };

  const handleSaveEntitlementForLevel = async (levelId, existingEntitlementId) => {
    const quota = quotaInputs[levelId];
    if (quota === "" || quota < 0) {
      showMessage("Please enter a valid quota.", "error");
      return;
    }
    
    try {
      if (existingEntitlementId) {
        await api.leaveEntitlements.update(existingEntitlementId, { level_id: levelId, leave_type_id: selectedLeaveTypeId, annual_quota: quota });
        showMessage("Quota updated successfully.", "success");
      } else {
        await api.leaveEntitlements.create({ level_id: levelId, leave_type_id: selectedLeaveTypeId, annual_quota: quota });
        showMessage("Quota created successfully.", "success");
      }
      fetchData();
    } catch (err) {
      showMessage("Failed to save quota.", "error");
    }
  };

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.main}>
        <Navbar />
        <div style={styles.contentPadding}>
          
          <div style={styles.header}>
            <h1 style={styles.pageTitle}>Admin Configuration</h1>
            <p style={styles.pageSubtitle}>Manage shifts, departments, levels, and leave policies.</p>
          </div>

          {msg.text && (
            <div style={msg.type === "success" ? styles.successMsg : styles.errorMsg}>
              {msg.text}
            </div>
          )}

          <div style={styles.settingsContainer}>
            <div style={styles.tabsMenu}>
              <button onClick={() => setActiveTab("company")} style={activeTab === "company" ? styles.tabActive : styles.tabInactive}>Company Defaults</button>
              <button onClick={() => setActiveTab("shifts")} style={activeTab === "shifts" ? styles.tabActive : styles.tabInactive}>Work Shifts</button>
              <button onClick={() => setActiveTab("departments")} style={activeTab === "departments" ? styles.tabActive : styles.tabInactive}>Departments</button>
              <button onClick={() => setActiveTab("levels")} style={activeTab === "levels" ? styles.tabActive : styles.tabInactive}>Hierarchy Levels</button>
              <button onClick={() => setActiveTab("leave_types")} style={activeTab === "leave_types" ? styles.tabActive : styles.tabInactive}>Leave Types</button>
              <button onClick={() => setActiveTab("entitlements")} style={activeTab === "entitlements" ? styles.tabActive : styles.tabInactive}>Leave Entitlements</button>
            </div>

            <div style={styles.tabContent}>
              
              {/* COMPANY SETTINGS & HOLIDAYS */}
              {activeTab === "company" && (
                <div style={{display: 'flex', flexDirection: 'column', gap: '30px'}}>
                  <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Global Fallback Rules</h3>
                    <p style={styles.cardDesc}>These settings apply to employees who have not been assigned a specific shift.</p>
                    <hr style={styles.divider} />
                    <form onSubmit={handleSettingsUpdate} style={styles.formGrid}>
                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Default Shift Start Time</label>
                        <input type="time" value={settings.shift_start_time} onChange={(e) => setSettings({...settings, shift_start_time: e.target.value})} style={styles.formInput} required />
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Default Grace Period (Minutes)</label>
                        <input type="number" min="0" value={settings.grace_period_minutes} onChange={(e) => setSettings({...settings, grace_period_minutes: e.target.value})} style={styles.formInput} required />
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Financial Year Start Month</label>
                        <select value={settings.financial_year_start_month} onChange={(e) => setSettings({...settings, financial_year_start_month: e.target.value})} style={styles.formInput}>
                          {Array.from({length: 12}, (_, i) => (<option key={i} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>))}
                        </select>
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Financial Year End Month</label>
                        <select value={settings.financial_year_end_month} onChange={(e) => setSettings({...settings, financial_year_end_month: e.target.value})} style={styles.formInput}>
                          {Array.from({length: 12}, (_, i) => (<option key={i} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>))}
                        </select>
                      </div>
                      <div style={styles.formActionRow}>
                        <button type="submit" style={styles.btnPrimary}>Save Defaults</button>
                      </div>
                    </form>
                  </div>

                  <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Public Holiday Registry</h3>
                    <p style={styles.cardDesc}>Registered dates will be exempted from working hour requirements.</p>
                    <hr style={styles.divider} />
                    
                    <form onSubmit={handleAddHoliday} style={styles.formGrid}>
                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Holiday Date</label>
                        <input type="date" value={newHoliday.holiday_date} onChange={(e) => setNewHoliday({...newHoliday, holiday_date: e.target.value})} style={styles.formInput} required />
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>Holiday Name</label>
                        <input type="text" placeholder="e.g. New Year's Day" value={newHoliday.description} onChange={(e) => setNewHoliday({...newHoliday, description: e.target.value})} style={styles.formInput} required />
                      </div>
                      <div style={styles.formActionRow}>
                        <button type="submit" style={styles.btnPrimary}>Add Holiday</button>
                      </div>
                    </form>
                    
                    <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                      <label style={styles.formLabel}>Bulk Upload Holidays (Excel)</label>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 10px 0' }}>File must contain columns: 'Date' and 'Description'</p>
                      <input type="file" accept=".xlsx, .xls" onChange={handleHolidayExcelUpload} style={styles.formInput} />
                    </div>

                    {holidays.length > 0 && (
                      <table style={styles.table}>
                        <thead>
                          <tr><th style={styles.th}>Date</th><th style={styles.th}>Holiday Name</th><th style={styles.th}>Action</th></tr>
                        </thead>
                        <tbody>
                          {holidays.map(h => (
                            <tr key={h.id} style={styles.tr}>
                              <td style={styles.td}><strong>{new Date(h.holiday_date).toLocaleDateString()}</strong></td>
                              <td style={styles.td}>{h.description}</td>
                              <td style={styles.td}>
                                <button onClick={() => handleDeleteHoliday(h.id)} style={styles.textBtnDelete}>Delete</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* SHIFTS */}
              {activeTab === "shifts" && (
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Manage Shift Schedules</h3>
                  <p style={styles.cardDesc}>Define custom work hours and grace periods for different teams.</p>
                  <hr style={styles.divider} />
                  
                  <form onSubmit={handleAddShift} style={styles.formGrid}>
                    <div style={styles.formGroupFull}>
                      <label style={styles.formLabel}>Shift Name</label>
                      <input type="text" placeholder="e.g. Night Shift" value={newShift.shift_name} onChange={(e) => setNewShift({...newShift, shift_name: e.target.value})} style={styles.formInput} required />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Start Time</label>
                      <input type="time" value={newShift.shift_start_time} onChange={(e) => handleShiftTimeChange('shift_start_time', e.target.value)} style={styles.formInput} required />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>End Time</label>
                      <input type="time" value={newShift.shift_end_time} onChange={(e) => handleShiftTimeChange('shift_end_time', e.target.value)} style={styles.formInput} required />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Grace Period (Minutes)</label>
                      <input type="number" min="0" placeholder="15" value={newShift.grace_period_minutes} onChange={(e) => setNewShift({...newShift, grace_period_minutes: e.target.value})} style={styles.formInput} required />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Calculated Working Hours</label>
                      <input type="number" step="0.5" min="1" max="24" placeholder="8.0" value={newShift.required_working_hours} onChange={(e) => setNewShift({...newShift, required_working_hours: e.target.value})} style={styles.formInput} required />
                    </div>

                    <div style={styles.formActionRow}>
                      {editingShiftId && (
                        <button type="button" onClick={() => { setNewShift({ shift_name: "", shift_start_time: "", shift_end_time: "", grace_period_minutes: 15, required_working_hours: 8, is_active: true }); setEditingShiftId(null); }} style={{...styles.btnPrimary, backgroundColor: "#64748b", marginRight: "10px"}}>Cancel Edit</button>
                      )}
                      <button type="submit" style={styles.btnPrimary}>{editingShiftId ? "Update Shift" : "Create Shift"}</button>
                    </div>
                  </form>

                  {shifts.length > 0 && (
                    <table style={{...styles.table, marginTop: '20px'}}>
                      <thead>
                        <tr><th style={styles.th}>Shift Name</th><th style={styles.th}>Schedule</th><th style={styles.th}>Grace</th><th style={styles.th}>Hours</th><th style={styles.th}>Actions</th></tr>
                      </thead>
                      <tbody>
                        {shifts.map(s => (
                          <tr key={s.id} style={styles.tr}>
                            <td style={styles.td}><strong>{s.shift_name}</strong></td>
                            <td style={styles.td}>{s.shift_start_time} - {s.shift_end_time}</td>
                            <td style={styles.td}>{s.grace_period_minutes} mins</td>
                            <td style={styles.td}>{s.required_working_hours} hrs</td>
                            <td style={styles.td}>
                              <button onClick={() => handleEditShift(s)} style={{...styles.textBtnDelete, color: "#2563eb", backgroundColor: "#eff6ff", marginRight: "10px"}}>Edit</button>
                              <button onClick={() => handleDeleteShift(s.id)} style={styles.textBtnDelete}>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* DEPARTMENTS */}
              {activeTab === "departments" && (
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Manage Departments</h3>
                  <p style={styles.cardDesc}>Organize employees into departments and set operational leave limits.</p>
                  <hr style={styles.divider} />
                  
                  <form onSubmit={handleAddDepartment} style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Department Name</label>
                      <input type="text" placeholder="e.g. Sales" value={newDepartment.department_name} onChange={(e) => setNewDepartment({...newDepartment, department_name: e.target.value})} style={styles.formInput} required />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Max Concurrent Leaves</label>
                      <input type="number" min="0" placeholder="Number of employees" value={newDepartment.max_concurrent_leaves} onChange={(e) => setNewDepartment({...newDepartment, max_concurrent_leaves: e.target.value})} style={styles.formInput} required />
                    </div>
                    <div style={styles.formActionRow}>
                      {editingDepartmentId && (
                        <button type="button" onClick={() => { setNewDepartment({ department_name: "", max_concurrent_leaves: 0 }); setEditingDepartmentId(null); }} style={{...styles.btnPrimary, backgroundColor: "#64748b", marginRight: "10px"}}>Cancel Edit</button>
                      )}
                      <button type="submit" style={styles.btnPrimary}>{editingDepartmentId ? "Update Department" : "Create Department"}</button>
                    </div>
                  </form>

                  {departments.length > 0 && (
                    <table style={{...styles.table, marginTop: '20px'}}>
                      <thead>
                        <tr><th style={styles.th}>Department</th><th style={styles.th}>Total Employees</th><th style={styles.th}>Leave Limit</th><th style={styles.th}>Actions</th></tr>
                      </thead>
                      <tbody>
                        {departments.map(d => (
                          <tr key={d.id} style={styles.tr}>
                            <td style={styles.td}><strong>{d.department_name}</strong></td>
                            <td style={styles.td}>{d.total_employees}</td>
                            <td style={styles.td}>{d.max_concurrent_leaves} at a time</td>
                            <td style={styles.td}>
                              <button onClick={() => handleEditDepartment(d)} style={{...styles.textBtnDelete, color: "#2563eb", backgroundColor: "#eff6ff", marginRight: "10px"}}>Edit</button>
                              <button onClick={() => handleDeleteDepartment(d.id)} style={styles.textBtnDelete}>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* LEVELS */}
              {activeTab === "levels" && (
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Manage Hierarchy Levels</h3>
                  <p style={styles.cardDesc}>Create employee ranks used for access mapping and leave quotas.</p>
                  <hr style={styles.divider} />
                  
                  <form onSubmit={handleAddLevel} style={styles.formGrid}>
                    <div style={styles.formGroupFull}>
                      <label style={styles.formLabel}>Level Name</label>
                      <input type="text" placeholder="e.g. L1 - Junior" value={newLevel.level_name} onChange={(e) => setNewLevel({...newLevel, level_name: e.target.value})} style={styles.formInput} required />
                    </div>
                    <div style={styles.formActionRow}>
                      {editingLevelId && (
                        <button type="button" onClick={() => { setNewLevel({ level_name: "" }); setEditingLevelId(null); }} style={{...styles.btnPrimary, backgroundColor: "#64748b", marginRight: "10px"}}>Cancel Edit</button>
                      )}
                      <button type="submit" style={styles.btnPrimary}>{editingLevelId ? "Update Level" : "Create Level"}</button>
                    </div>
                  </form>

                  {levels.length > 0 && (
                    <table style={{...styles.table, marginTop: '20px'}}>
                      <thead>
                        <tr><th style={styles.th}>Level Name</th><th style={styles.th}>Actions</th></tr>
                      </thead>
                      <tbody>
                        {levels.map(l => (
                          <tr key={l.id} style={styles.tr}>
                            <td style={styles.td}><strong>{l.level_name}</strong></td>
                            <td style={styles.td}>
                              <button onClick={() => handleEditLevel(l)} style={{...styles.textBtnDelete, color: "#2563eb", backgroundColor: "#eff6ff", marginRight: "10px"}}>Edit</button>
                              <button onClick={() => handleDeleteLevel(l.id)} style={styles.textBtnDelete}>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* LEAVE TYPES */}
              {activeTab === "leave_types" && (
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Manage Leave Types</h3>
                  <p style={styles.cardDesc}>Define categories and rules for employee absences.</p>
                  <hr style={styles.divider} />
                  
                  <form onSubmit={handleAddLeaveType} style={styles.formGrid}>
                    <div style={styles.formGroupFull}>
                      <label style={styles.formLabel}>Leave Category Name</label>
                      <input type="text" placeholder="e.g. Sick Leave" value={newLeaveType.name} onChange={(e) => setNewLeaveType({...newLeaveType, name: e.target.value})} style={styles.formInput} required />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Advance Notice Required (Days)</label>
                      <input type="number" min="0" placeholder="e.g. 7" value={newLeaveType.min_advance_notice_days} onChange={(e) => setNewLeaveType({...newLeaveType, min_advance_notice_days: e.target.value})} style={styles.formInput} required />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Max Consecutive Days Allowed</label>
                      <input type="number" min="0" placeholder="e.g. 14" value={newLeaveType.max_consecutive_days} onChange={(e) => setNewLeaveType({...newLeaveType, max_consecutive_days: e.target.value})} style={styles.formInput} required />
                    </div>
                    
                    <div style={styles.formGroupFull}>
                      <label style={{...styles.formLabel, cursor: 'pointer'}}>
                        <input type="checkbox" checked={newLeaveType.requires_documentation} onChange={(e) => setNewLeaveType({...newLeaveType, requires_documentation: e.target.checked})} style={{width: '18px', height: '18px'}} /> 
                        Requires Medical or Supporting Documentation?
                      </label>
                    </div>

                    <div style={styles.formActionRow}>
                      {editingLeaveTypeId && (
                        <button type="button" onClick={() => { setNewLeaveType({ name: "", min_advance_notice_days: 0, requires_documentation: false, max_consecutive_days: 0, is_active: true }); setEditingLeaveTypeId(null); }} style={{...styles.btnPrimary, backgroundColor: "#64748b", marginRight: "10px"}}>Cancel Edit</button>
                      )}
                      <button type="submit" style={styles.btnPrimary}>{editingLeaveTypeId ? "Update Leave Type" : "Create Leave Type"}</button>
                    </div>
                  </form>

                  {leaveTypes.length > 0 && (
                    <table style={{...styles.table, marginTop: '20px'}}>
                      <thead>
                        <tr><th style={styles.th}>Leave Category</th><th style={styles.th}>Notice Rules</th><th style={styles.th}>Max Block</th><th style={styles.th}>Docs Needed</th><th style={styles.th}>Actions</th></tr>
                      </thead>
                      <tbody>
                        {leaveTypes.map(lt => (
                          <tr key={lt.id} style={styles.tr}>
                            <td style={styles.td}><strong>{lt.name}</strong></td>
                            <td style={styles.td}>{lt.min_advance_notice_days} days prior</td>
                            <td style={styles.td}>{lt.max_consecutive_days} days</td>
                            <td style={styles.td}>{lt.requires_documentation ? 'Yes' : 'No'}</td>
                            <td style={styles.td}>
                              <button onClick={() => handleEditLeaveType(lt)} style={{...styles.textBtnDelete, color: "#2563eb", backgroundColor: "#eff6ff", marginRight: "10px"}}>Edit</button>
                              <button onClick={() => handleDeleteLeaveType(lt.id)} style={styles.textBtnDelete}>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* LEAVE ENTITLEMENTS */}
              {activeTab === "entitlements" && (
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Leave Entitlements Mapping</h3>
                  <p style={styles.cardDesc}>Select a leave category to configure annual quotas for each employee rank.</p>
                  <hr style={styles.divider} />
                  
                  <div style={{ marginBottom: "30px", maxWidth: "400px" }}>
                    <label style={styles.formLabel}>Select Leave Category:</label>
                    <select value={selectedLeaveTypeId} onChange={(e) => setSelectedLeaveTypeId(e.target.value)} style={styles.formInput}>
                      <option value="">-- Choose Leave Type --</option>
                      {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
                    </select>
                  </div>

                  {selectedLeaveTypeId && (
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Employee Rank</th>
                          <th style={styles.th}>Annual Days Allocated</th>
                          <th style={styles.th}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {levels.map(lvl => {
                          const existing = leaveEntitlements.find(le => le.level_id === lvl.id && le.leave_type_id == selectedLeaveTypeId);
                          return (
                            <tr key={lvl.id} style={styles.tr}>
                              <td style={styles.td}><strong>{lvl.level_name}</strong></td>
                              <td style={styles.td}>
                                <input 
                                  type="number" 
                                  min="0" 
                                  placeholder="0"
                                  value={quotaInputs[lvl.id] !== undefined ? quotaInputs[lvl.id] : ""} 
                                  onChange={(e) => setQuotaInputs({...quotaInputs, [lvl.id]: e.target.value})} 
                                  style={{...styles.formInput, width: "120px"}} 
                                />
                              </td>
                              <td style={styles.td}>
                                <button 
                                  onClick={() => handleSaveEntitlementForLevel(lvl.id, existing ? existing.id : null)} 
                                  style={styles.btnPrimary}
                                >
                                  {existing ? "Update Quota" : "Set Quota"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                  
                  {!selectedLeaveTypeId && (
                    <div style={{ padding: "40px", textAlign: "center", color: "#64748b", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                      Please select a Leave Category from the dropdown above to manage quotas.
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simplified and Standardized Styles
const styles = {
  layout: { display: "flex", minHeight: "100vh", backgroundColor: "#f8fafc" },
  main: { flexGrow: 1, marginLeft: "260px" },
  contentPadding: { padding: "40px" },
  
  header: { marginBottom: "30px" },
  pageTitle: { margin: "0 0 8px 0", fontSize: "24px", color: "#0f172a", fontWeight: "700", letterSpacing: "-0.5px" },
  pageSubtitle: { margin: 0, color: "#64748b", fontSize: "15px" },
  
  settingsContainer: { display: "flex", gap: "40px", alignItems: "flex-start" },
  
  tabsMenu: { display: "flex", flexDirection: "column", width: "240px", flexShrink: 0, gap: "8px" },
  tabActive: { backgroundColor: "#0f172a", color: "white", padding: "16px 20px", borderRadius: "10px", border: "none", textAlign: "left", cursor: "pointer", fontWeight: "600", fontSize: "14px", transition: "all 0.2s", boxShadow: "0 4px 6px -1px rgba(15, 23, 42, 0.2)" },
  tabInactive: { backgroundColor: "transparent", color: "#475569", padding: "16px 20px", borderRadius: "10px", border: "none", textAlign: "left", cursor: "pointer", fontWeight: "500", fontSize: "14px", transition: "all 0.2s" },
  
  tabContent: { flexGrow: 1 },
  
  card: { backgroundColor: "white", padding: "32px", borderRadius: "12px", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)", border: "1px solid #e2e8f0" },
  cardTitle: { color: "#0f172a", margin: "0 0 6px 0", fontSize: "18px", fontWeight: "700" },
  cardDesc: { color: "#64748b", fontSize: "14px", margin: "0 0 20px 0" },
  divider: { border: "none", borderTop: "1px solid #e2e8f0", margin: "0 0 24px 0" },
  
  /* Modern Form Grid */
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" },
  formGroup: { display: "flex", flexDirection: "column", gap: "8px" },
  formGroupFull: { display: "flex", flexDirection: "column", gap: "8px", gridColumn: "1 / -1" },
  formLabel: { fontSize: "13px", fontWeight: "700", color: "#334155", display: "flex", alignItems: "center", gap: "8px" },
  formInput: { padding: "14px 16px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "15px", outline: "none", width: "100%", backgroundColor: "#f8fafc", color: "#0f172a", transition: "border-color 0.2s" },
  formActionRow: { display: "flex", justifyContent: "flex-end", marginTop: "10px", gridColumn: "1 / -1" },
  btnPrimary: { backgroundColor: "#2563eb", color: "white", border: "none", padding: "14px 28px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px", transition: "opacity 0.2s" },
  
  /* Tables */
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left" },
  th: { backgroundColor: "#f8fafc", padding: "16px 20px", borderBottom: "2px solid #e2e8f0", color: "#64748b", fontSize: "12px", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.5px" },
  tr: { borderBottom: "1px solid #e2e8f0" },
  td: { padding: "18px 20px", color: "#334155", fontSize: "14px", verticalAlign: "middle" },
  textBtnDelete: { background: "none", border: "none", color: "#dc2626", fontWeight: "600", fontSize: "13px", cursor: "pointer", padding: "8px 12px", borderRadius: "6px", backgroundColor: "#fef2f2" },

  /* Alerts */
  successMsg: { marginBottom: "30px", padding: "16px 20px", backgroundColor: "#f0fdf4", color: "#166534", borderRadius: "8px", fontWeight: "500", border: "1px solid #bbf7d0", fontSize: "15px" },
  errorMsg: { marginBottom: "30px", padding: "16px 20px", backgroundColor: "#fef2f2", color: "#991b1b", borderRadius: "8px", fontWeight: "500", border: "1px solid #fecaca", fontSize: "15px" }
};

export default Settings;