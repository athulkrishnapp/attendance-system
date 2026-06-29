import { useState, useEffect, useMemo } from "react";
import API, { api } from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const AdminDashboard = () => {
  // New state for the graph (present vs total)
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, total: 0 });
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({ loading: false, message: "", error: false });
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [daysInMonth, setDaysInMonth] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEditDate, setSelectedEditDate] = useState(null);
  const [dailyAttendance, setDailyAttendance] = useState([]);
  const [modalFilterShift, setModalFilterShift] = useState("");
  const [modalFilterDept, setModalFilterDept] = useState("");
  const [modalFilterStaff, setModalFilterStaff] = useState("");
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [editRecordForm, setEditRecordForm] = useState({});

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        const res = await API.get(`/attendance/calendar/${selectedMonth}`);
        const uploadedDates = res.data.uploadedDates || [];
        
        // Smart parse to handle both simple strings and database objects safely
        const rawHolidays = res.data.holidays || [];
        const publicHolidays = rawHolidays.map(h => {
          if (typeof h === 'string') return { date: h.split('T')[0], description: "Holiday" };
          return { 
            date: (h.holiday_date || h.date || "").split('T')[0], 
            description: h.description || "Holiday" 
          };
        });

        generateCalendar(selectedMonth, uploadedDates, publicHolidays);
      } catch (err) {
        console.error("Failed to fetch calendar data", err);
        generateCalendar(selectedMonth, [], []); 
      }
    };
    fetchCalendarData();
  }, [selectedMonth]);

  const fetchStats = async () => {
    try {
      const res = await API.get("/reports/dashboard");
      // Simulated or real response mapping for the graph
      setAttendanceStats({
        present: res.data.yesterdayPresent || 0,
        total: res.data.totalEmployees || 0
      });
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  };

  const generateCalendar = (monthString, uploadedDates, publicHolidays) => {
    const [year, month] = monthString.split("-");
    const numDays = new Date(year, month, 0).getDate();
    const daysArray = [];

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); // Force to midnight UTC

    const firstDayDate = new Date(year, month - 1, 1);
    const firstDayIndex = firstDayDate.getDay(); 

    for (let i = 0; i < firstDayIndex; i++) {
      daysArray.push({ isEmpty: true });
    }

    for (let i = 1; i <= numDays; i++) {
      // Use UTC format to prevent the timezone shift
      const dateString = `${year}-${month}-${String(i).padStart(2, '0')}`;
      
      // FIX: Create the date object specifically to avoid local time shifting
      const dateObj = new Date(`${dateString}T00:00:00Z`); 
      
      const dayOfWeek = dateObj.getUTCDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isFuture = dateObj > today;
      
      // Match the exact YYYY-MM-DD
      const holidayMatch = publicHolidays.find(h => h.date === dateString);
      const isHoliday = !!holidayMatch;
      const isUploaded = uploadedDates.includes(dateString);

      let status = "MISSING"; 
      
      if (isUploaded) status = "UPLOADED";
      else if (isHoliday) status = "PUBLIC_HOLIDAY";
      else if (isWeekend) status = "WEEKEND";
      else if (isFuture) status = "FUTURE";

      daysArray.push({
        isEmpty: false,
        date: dateString,
        dayNumber: i,
        status: status,
        isFuture: isFuture,
        holidayDesc: holidayMatch ? holidayMatch.description : null
      });
    }
    setDaysInMonth(daysArray);
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setUploadStatus({ loading: false, message: "", error: false });
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploadStatus({ loading: true, message: "Uploading...", error: false });
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await API.post("/attendance/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadStatus({ loading: false, message: `Success! ${res.data.recordsProcessed} records.`, error: false });
      setFile(null);
      fetchStats(); 
      const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      if (selectedMonth === currentMonth) {
         setSelectedMonth(currentMonth + " "); 
         setTimeout(() => setSelectedMonth(currentMonth), 10);
      }
    } catch (err) {
      setUploadStatus({ loading: false, message: "Upload failed. Check format.", error: true });
    }
  };

  const handleOpenEditModal = async (dateStr) => {
    setSelectedEditDate(dateStr);
    setIsEditModalOpen(true);
    setDailyAttendance([]);
    try {
      const res = await api.attendance.getByDate(dateStr);
      setDailyAttendance(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveRecord = async (id) => {
    try {
      await api.attendance.updateRecord(id, editRecordForm);
      setEditingRecordId(null);
      const res = await api.attendance.getByDate(selectedEditDate);
      setDailyAttendance(res.data);
    } catch (err) {
      console.error("Failed to update record");
    }
  };

  const filteredDailyAttendance = useMemo(() => {
    return dailyAttendance.filter(r => {
      const matchShift = modalFilterShift ? r.shift_name === modalFilterShift : true;
      const matchDept = modalFilterDept ? r.department_name === modalFilterDept : true;
      const matchStaff = modalFilterStaff 
        ? (r.name?.toLowerCase().includes(modalFilterStaff.toLowerCase()) || 
           r.employee_code?.toLowerCase().includes(modalFilterStaff.toLowerCase()))
        : true;
      return matchShift && matchDept && matchStaff;
    });
  }, [dailyAttendance, modalFilterShift, modalFilterDept, modalFilterStaff]);

  const uniqueShifts = useMemo(() => Array.from(new Set(dailyAttendance.map(r => r.shift_name).filter(Boolean))), [dailyAttendance]);
  const uniqueDepts = useMemo(() => Array.from(new Set(dailyAttendance.map(r => r.department_name).filter(Boolean))), [dailyAttendance]);

  // Safe percentage calculation for the graph
  const presentPct = attendanceStats.total > 0 ? Math.round((attendanceStats.present / attendanceStats.total) * 100) : 0;
  const absentPct = 100 - presentPct;

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.main}>
        <Navbar />

        <div style={styles.contentPadding}>
          
          {/* TOP ROW: Upload & Graph Side-by-Side */}
          <div style={styles.topRow}>
            
            {/* Quick Upload (Left) */}
            <div style={styles.compactCard}>
              <h2 style={styles.sectionTitleSmall}>Quick Daily Upload</h2>
              <form onSubmit={handleUpload} style={styles.uploadRowForm}>
                <div style={styles.fileInputWrapper}>
                  <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    onChange={handleFileChange} 
                    style={styles.hiddenFileInput}
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" style={styles.fileLabelCompact}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{marginRight: '6px'}}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    {file ? file.name : "Choose Excel"}
                  </label>
                </div>
                <button 
                  type="submit" 
                  disabled={!file || uploadStatus.loading}
                  style={file && !uploadStatus.loading ? styles.uploadBtnActiveCompact : styles.uploadBtnDisabledCompact}
                >
                  {uploadStatus.loading ? "Processing..." : "Sync"}
                </button>
              </form>
              {uploadStatus.message && (
                <p style={uploadStatus.error ? styles.errorText : styles.successText}>
                  {uploadStatus.message}
                </p>
              )}
            </div>

            {/* Attendance Graph (Right) */}
            <div style={styles.compactCard}>
              <div style={styles.graphHeader}>
                <h2 style={styles.sectionTitleSmall}>Yesterday's Attendance</h2>
                <span style={styles.totalBadge}>Total Staff: {attendanceStats.total}</span>
              </div>
              
              <div style={styles.graphContainer}>
                {/* Scalable Bar Chart */}
                <div style={styles.barChartWrapper}>
                  <div style={{...styles.barSegment, backgroundColor: '#22c55e', width: `${presentPct}%`}}>
                    {presentPct > 10 && <span style={styles.barText}>{presentPct}%</span>}
                  </div>
                  <div style={{...styles.barSegment, backgroundColor: '#f87171', width: `${absentPct}%`}}>
                    {absentPct > 10 && <span style={styles.barText}>{absentPct}%</span>}
                  </div>
                </div>
                
                {/* Graph Legend */}
                <div style={styles.graphLegend}>
                  <div style={styles.graphLegendItem}>
                    <span style={{...styles.colorDot, backgroundColor: '#22c55e'}}></span> 
                    <strong>{attendanceStats.present}</strong> Present
                  </div>
                  <div style={styles.graphLegendItem}>
                    <span style={{...styles.colorDot, backgroundColor: '#f87171'}}></span> 
                    <strong>{attendanceStats.total - attendanceStats.present}</strong> Absent
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* BOTTOM SECTION: Full Width Calendar */}
          <div style={styles.calendarSection}>
            <div style={styles.calendarHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Monthly Tracker</h2>
                <div style={styles.legendContainer}>
                  <div style={styles.legendItem}><span style={{...styles.colorBox, backgroundColor: "#dcfce7", borderColor: "#86efac"}}></span> Uploaded</div>
                  <div style={styles.legendItem}><span style={{...styles.colorBox, backgroundColor: "#fee2e2", borderColor: "#fca5a5"}}></span> Missing</div>
                  <div style={styles.legendItem}><span style={{...styles.colorBox, backgroundColor: "#eef2ff", borderColor: "#a5b4fc"}}></span> Weekend</div>
                  <div style={styles.legendItem}><span style={{...styles.colorBox, backgroundColor: "#fef9c3", borderColor: "#fde047"}}></span> Public Holiday</div>
                  <div style={styles.legendItem}><span style={{...styles.colorBox, backgroundColor: "#f8fafc", border: "1px dashed #cbd5e1"}}></span> Future</div>
                </div>
              </div>

              <input 
                type="month" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)} 
                style={styles.monthSelector}
              />
            </div>

            <div style={styles.calendarGrid}>
              {weekdays.map((day) => (
                <div key={day} style={styles.weekdayHeader}>{day}</div>
              ))}

              {daysInMonth.map((day, index) => {
                if (day.isEmpty) {
                  return <div key={`empty-${index}`} style={styles.emptyDayCard}></div>;
                }

                let bgColor = "white";
                let borderColor = "var(--border)";
                let statusLabel = day.status.replace("_", " ");
                
                if (day.status === "WEEKEND") { bgColor = "#eef2ff"; borderColor = "#e0e7ff"; } 
                else if (day.status === "PUBLIC_HOLIDAY") { bgColor = "#fef9c3"; borderColor = "#fef08a"; } 
                else if (day.status === "FUTURE") { bgColor = "#f8fafc"; borderColor = "#f1f5f9"; } 
                else if (day.status === "MISSING") { borderColor = "#fca5a5"; bgColor = "#fef2f2"; } 
                else if (day.status === "UPLOADED") { borderColor = "#86efac"; bgColor = "#f0fdf4"} 

                return (
                  <div key={index} style={{
                    ...styles.dayCard, 
                    backgroundColor: bgColor, 
                    borderColor: borderColor, 
                    borderStyle: day.status === "FUTURE" ? "dashed" : "solid" 
                  }}>
                    <div style={styles.dayTop}>
                      <span style={{
                        ...styles.dayNumber, 
                        color: day.status === "FUTURE" ? "#94a3b8" : "var(--text-main)" 
                      }}>
                        {day.dayNumber}
                      </span>
                    </div>
                    
                    <span style={styles.statusBadge(day.status)}>{statusLabel}</span>
                    
                    {/* Holiday Description Display */}
                    {day.status === "PUBLIC_HOLIDAY" && day.holidayDesc && (
                      <div style={styles.holidayText} title={day.holidayDesc}>
                        {day.holidayDesc}
                      </div>
                    )}
                    
                    <div style={styles.dayActions}>
                      {day.status === "UPLOADED" ? (
                        <button onClick={() => handleOpenEditModal(day.date)} style={styles.editBtn}>Edit / View</button>
                      ) : day.isFuture ? (  
                        <span style={{fontSize: '11px', color: '#94a3b8', textAlign: 'center', display: 'block'}}>Not Available</span>
                      ) : (
                        <label style={styles.uploadSmallBtn}>
                          Upload File
                          <input type="file" accept=".xlsx" style={{display: 'none'}} />
                        </label>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>
      
      {isEditModalOpen && (
        <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, width: "90vw", maxWidth: "1200px"}}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0 }}>Attendance for {selectedEditDate}</h3>
                    <button onClick={() => { setIsEditModalOpen(false); setDailyAttendance([]); setEditingRecordId(null); }} style={styles.cancelBtn}>Close</button>
                </div>

                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                    <select value={modalFilterShift} onChange={(e) => setModalFilterShift(e.target.value)} style={styles.input}>
                        <option value="">All Shifts</option>
                        {uniqueShifts.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={modalFilterDept} onChange={(e) => setModalFilterDept(e.target.value)} style={styles.input}>
                        <option value="">All Departments</option>
                        {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <input type="text" placeholder="Search staff..." value={modalFilterStaff} onChange={(e) => setModalFilterStaff(e.target.value)} style={styles.input} />
                </div>

                <div style={{ overflowX: 'auto', maxHeight: '60vh' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Employee</th>
                                <th style={styles.th}>Department</th>
                                <th style={styles.th}>Shift</th>
                                <th style={styles.th}>In Time</th>
                                <th style={styles.th}>Out Time</th>
                                <th style={styles.th}>Work Hrs</th>
                                <th style={styles.th}>Status</th>
                                <th style={styles.th}>Remarks</th>
                                <th style={styles.th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDailyAttendance.map(record => {
                                const isEditing = editingRecordId === record.id;
                                return (
                                    <tr key={record.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '10px' }}><strong>{record.name}</strong><br/><span style={{ fontSize: '11px', color: '#64748b' }}>{record.employee_code}</span></td>
                                        <td style={{ padding: '10px' }}>{record.department_name}</td>
                                        <td style={{ padding: '10px' }}>{record.shift_name}</td>
                                        
                                        {isEditing ? (
                                            <>
                                                <td style={{ padding: '10px' }}><input type="time" value={editRecordForm.first_in || ''} onChange={e => setEditRecordForm({...editRecordForm, first_in: e.target.value})} style={styles.inputSmall} /></td>
                                                <td style={{ padding: '10px' }}><input type="time" value={editRecordForm.last_out || ''} onChange={e => setEditRecordForm({...editRecordForm, last_out: e.target.value})} style={styles.inputSmall} /></td>
                                                <td style={{ padding: '10px' }}><input type="number" step="0.01" value={editRecordForm.working_hours || ''} onChange={e => setEditRecordForm({...editRecordForm, working_hours: e.target.value})} style={{...styles.inputSmall, width: '60px'}} /></td>
                                                <td style={{ padding: '10px' }}>
                                                    <select value={editRecordForm.core_status || ''} onChange={e => setEditRecordForm({...editRecordForm, core_status: e.target.value})} style={styles.inputSmall}>
                                                        <option value="PRESENT">PRESENT</option>
                                                        <option value="ABSENT">ABSENT</option>
                                                        <option value="HALF_DAY">HALF_DAY</option>
                                                        <option value="LEAVE">LEAVE</option>
                                                        <option value="HOLIDAY">HOLIDAY</option>
                                                        <option value="WEEKEND">WEEKEND</option>
                                                        <option value="MISSING_PUNCH">MISSING_PUNCH</option>
                                                    </select>
                                                </td>
                                                <td style={{ padding: '10px' }}><input type="text" value={editRecordForm.remarks || ''} onChange={e => setEditRecordForm({...editRecordForm, remarks: e.target.value})} style={styles.inputSmall} /></td>
                                                <td style={{ padding: '10px' }}>
                                                    <button onClick={() => handleSaveRecord(record.id)} style={styles.saveBtn}>Save</button>
                                                    <button onClick={() => setEditingRecordId(null)} style={styles.cancelLinkBtn}>Cancel</button>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td style={{ padding: '10px' }}>{record.first_in || '-'}</td>
                                                <td style={{ padding: '10px' }}>{record.last_out || '-'}</td>
                                                <td style={{ padding: '10px' }}>{record.working_hours || '-'}</td>
                                                <td style={{ padding: '10px' }}>{record.core_status || '-'}</td>
                                                <td style={{ padding: '10px' }}>{record.remarks || '-'}</td>
                                                <td style={{ padding: '10px' }}>
                                                    <button onClick={() => { setEditingRecordId(record.id); setEditRecordForm(record); }} style={styles.editLinkBtn}>Edit</button>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                );
                            })}
                            {filteredDailyAttendance.length === 0 && (
                                <tr><td colSpan="9" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No records found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

// Premium Styles
const styles = {
  layout: { display: "flex", minHeight: "100vh", backgroundColor: "#f8fafc" },
  main: { flexGrow: 1, marginLeft: "260px" }, 
  contentPadding: { padding: "30px 40px" },
  
  // Single Row Top Section
  topRow: { display: "flex", gap: "24px", marginBottom: "24px" },
  compactCard: { flex: 1, backgroundColor: "white", padding: "20px 24px", borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0" },
  
  sectionTitleSmall: { margin: "0 0 12px 0", fontSize: "16px", fontWeight: "700", color: "#1e293b" },
  sectionTitle: { margin: "0 0 8px 0", fontSize: "20px", fontWeight: "700", color: "#1e293b" },
  
  // Upload Inline Form
  uploadRowForm: { display: "flex", gap: "12px", alignItems: "center" },
  fileInputWrapper: { flexGrow: 1 },
  hiddenFileInput: { display: "none" },
  fileLabelCompact: { display: "flex", alignItems: "center", justifyContent: "center", padding: "10px", border: "2px dashed #cbd5e1", borderRadius: "8px", backgroundColor: "#f8fafc", color: "#64748b", cursor: "pointer", fontSize: "13px", fontWeight: "600", height: "42px", boxSizing: "border-box" },
  uploadBtnActiveCompact: { backgroundColor: "#0f172a", color: "white", border: "none", padding: "0 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px", height: "42px", whiteSpace: "nowrap" },
  uploadBtnDisabledCompact: { backgroundColor: "#cbd5e1", color: "white", border: "none", padding: "0 20px", borderRadius: "8px", cursor: "not-allowed", fontWeight: "600", fontSize: "13px", height: "42px", whiteSpace: "nowrap" },
  successText: { color: "#166534", fontSize: "13px", marginTop: "8px", fontWeight: "500", margin: "8px 0 0 0" },
  errorText: { color: "#991b1b", fontSize: "13px", marginTop: "8px", fontWeight: "500", margin: "8px 0 0 0" },
  
  // Graph Styles
  graphHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  totalBadge: { backgroundColor: "#f1f5f9", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "600", color: "#475569" },
  graphContainer: { marginTop: "4px" },
  barChartWrapper: { display: "flex", height: "24px", width: "100%", borderRadius: "12px", overflow: "hidden", backgroundColor: "#f1f5f9" },
  barSegment: { display: "flex", alignItems: "center", justifyContent: "center", transition: "width 0.5s ease-in-out" },
  barText: { color: "white", fontSize: "11px", fontWeight: "700" },
  graphLegend: { display: "flex", gap: "16px", marginTop: "12px" },
  graphLegendItem: { display: "flex", alignItems: "center", fontSize: "13px", color: "#64748b" },
  colorDot: { width: "10px", height: "10px", borderRadius: "50%", marginRight: "6px" },

  // Full Width Calendar Styles
  calendarSection: { backgroundColor: "white", padding: "24px 30px", borderRadius: "16px", boxShadow: "0 2px 4px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0" },
  calendarHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" },
  monthSelector: { padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "15px", fontWeight: "600", color: "#334155", backgroundColor: "#f8fafc", outline: "none" },
  
  legendContainer: { display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "8px" },
  legendItem: { display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#64748b", fontWeight: "600" },
  colorBox: { width: "12px", height: "12px", borderRadius: "4px", border: "1px solid" },

  calendarGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "12px" },
  weekdayHeader: { textAlign: "center", fontWeight: "700", fontSize: "13px", color: "#64748b", paddingBottom: "8px", borderBottom: "2px solid #f1f5f9", marginBottom: "4px", textTransform: "uppercase" },
  emptyDayCard: { padding: "12px", backgroundColor: "transparent" },
  
  dayCard: { padding: "12px", borderRadius: "10px", borderWidth: "1.5px", display: "flex", flexDirection: "column", gap: "6px", minHeight: "115px" },
  dayTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  dayNumber: { fontSize: "18px", fontWeight: "800", lineHeight: "1" },
  
  statusBadge: (status) => ({
    fontSize: "9px", fontWeight: "800", padding: "4px 6px", borderRadius: "6px", letterSpacing: "0.5px", alignSelf: "flex-start",
    backgroundColor: status === "UPLOADED" ? "#dcfce7" : status === "MISSING" ? "#fee2e2" : status === "WEEKEND" ? "#e0e7ff" : status === "PUBLIC_HOLIDAY" ? "#fef08a" : "#f1f5f9",
    color: status === "UPLOADED" ? "#166534" : status === "MISSING" ? "#991b1b" : status === "WEEKEND" ? "#3730a3" : status === "PUBLIC_HOLIDAY" ? "#854d0e" : "#64748b"
  }),
  
  holidayText: { fontSize: "11px", fontWeight: "700", color: "#a16207", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  
  dayActions: { marginTop: "auto" },
  uploadSmallBtn: { display: "block", textAlign: "center", backgroundColor: "white", border: "1px solid #3b82f6", color: "#3b82f6", padding: "6px", borderRadius: "6px", fontSize: "11px", cursor: "pointer", fontWeight: "700", transition: "all 0.2s" },
  editBtn: { width: "100%", backgroundColor: "#f8fafc", border: "1px solid #cbd5e1", color: "#475569", padding: "6px", borderRadius: "6px", fontSize: "11px", cursor: "pointer", fontWeight: "700", transition: "all 0.2s" },
  
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  modalContent: { backgroundColor: "white", padding: "30px", borderRadius: "16px", width: "500px", maxWidth: "90%", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" },
  
  cancelBtn: { backgroundColor: "transparent", color: "#475569", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "600" },
  saveBtn: { backgroundColor: "#0f172a", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "11px", marginRight: "6px" },
  editLinkBtn: { backgroundColor: "transparent", color: "#2563eb", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "13px" },
  cancelLinkBtn: { backgroundColor: "transparent", color: "#94a3b8", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "11px" },
  input: { padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", outline: "none", flex: 1 },
  inputSmall: { padding: "6px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "12px", outline: "none", width: "100px", boxSizing: "border-box" },
  th: { backgroundColor: "#f8fafc", padding: "12px 10px", borderBottom: "2px solid #e2e8f0", color: "#64748b", fontSize: "12px", textTransform: "uppercase", fontWeight: "700" }
};

export default AdminDashboard;