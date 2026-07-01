import { useState, useEffect } from "react";
import API, { api } from "../services/api";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const LeavePolicy = () => {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const typesRes = await api.leaveTypes.getAll();
      setLeaveTypes(typesRes.data);

      const shiftsRes = await api.shifts.getAll();
      setShifts(shiftsRes.data);

      const settingsRes = await api.settings.get();
      setSettings(settingsRes.data.settings);

      setLoading(false);
    } catch (err) {
      console.error("Failed to load company policies.", err);
      setLoading(false);
    }
  };

  if (loading) return <div style={styles.layout}>Loading...</div>;

  return (
    <div style={styles.layout}>
      <Sidebar />
      <div style={styles.main}>
        <Navbar />
        <div style={styles.contentPadding}>
          
          <div style={styles.header}>
            <h1 style={styles.pageTitle}>Company Leave Policy</h1>
            <p style={styles.pageSubtitle}>Review your company's attendance rules, shift timings, and leave types.</p>
          </div>

          <div style={styles.settingsContainer}>
            
            <div style={styles.tabContent}>

              {/* COMPANY RULES (READ-ONLY) */}
              <div style={{...styles.card, marginBottom: "20px"}}>
                <h3 style={styles.cardTitle}>Attendance Statuses & Flags</h3>
                <hr style={styles.divider} />
                
                  <div style={{ padding: "0", color: '#334155', fontSize: '15px' }}>
                    <p style={{marginBottom: "15px"}}><em>Attendance depends on when the employee worked, not just total hours.</em></p>
                    
                    <h4 style={{marginTop: "10px", marginBottom: "8px"}}>Present</h4>
                    <ul style={{ paddingLeft: '20px', margin: 0, marginBottom: '15px' }}>
                      <li>Employee has valid In and Out punches.</li>
                      <li>Worked the complete shift.</li>
                      <li>OR employee satisfies the timing rules for approved Half-Day Leave.</li>
                    </ul>
                    
                    <h4 style={{marginTop: "10px", marginBottom: "8px"}}>Absent</h4>
                    <ul style={{ paddingLeft: '20px', margin: 0, marginBottom: '15px' }}>
                      <li>No punches.</li>
                      <li>Checked in after Mid Time.</li>
                      <li>Checked out before Mid Time.</li>
                      <li>Working hours are below minimum requirement.</li>
                    </ul>

                    <h4 style={{marginTop: "10px", marginBottom: "8px"}}>Leave Rules</h4>
                    <ul style={{ paddingLeft: '20px', margin: 0, marginBottom: '15px' }}>
                      <li><strong>Leave:</strong> Approved Full-Day Leave.</li>
                      <li><strong>First Half Leave:</strong> Works Second Half. Must check in on or before Mid Time, check out at Shift End (Grace applies at Shift End).</li>
                      <li><strong>Second Half Leave:</strong> Works First Half. Must check in at Shift Start (Grace applies at Shift Start), check out on or after Mid Time.</li>
                    </ul>

                    <h4 style={{marginTop: "10px", marginBottom: "8px"}}>Other Statuses</h4>
                    <ul style={{ paddingLeft: '20px', margin: 0, marginBottom: '15px' }}>
                      <li><strong>Missing Punch:</strong> Only one punch exists.</li>
                      <li><strong>Holiday:</strong> Company Holiday.</li>
                      <li><strong>Week Off:</strong> Configured Weekly Off.</li>
                    </ul>

                    <h4 style={{marginTop: "10px", marginBottom: "8px"}}>Modifier Flags</h4>
                    <ul style={{ paddingLeft: '20px', margin: 0, marginBottom: '15px' }}>
                      <li><strong>Late:</strong> First Punch &gt; Shift Start and &le; Shift Start + Grace.</li>
                      <li><strong>Early Exit:</strong> Last Punch &lt; Shift End and &ge; Shift End &minus; Grace.</li>
                      <li><strong>Overtime:</strong> Worked beyond shift duration.</li>
                      <li><strong>First Half:</strong> Employee was present for the first half (Checked in at Shift Start, Checked out on or after Mid Time).</li>
                      <li><strong>Second Half:</strong> Employee was present for the second half (Checked in on or before Mid Time, Checked out at Shift End).</li>
                      <li><strong>Hourly Leave:</strong> Approved Hourly Leave.</li>
                    </ul>
                  </div>
              </div>
              
              <div style={{...styles.card, marginBottom: "20px"}}>
                <h3 style={styles.cardTitle}>Leave Types</h3>
                <hr style={styles.divider} />
                <table style={styles.table}>
                  <thead>
                    <tr><th style={styles.th}>Leave Name</th><th style={styles.th}>Encashable</th><th style={styles.th}>Carry Forward</th></tr>
                  </thead>
                  <tbody>
                    {leaveTypes.map(t => (
                      <tr key={t.id} style={styles.tr}>
                        <td style={styles.td}><strong>{t.name}</strong></td>
                        <td style={styles.td}>{t.is_encashable ? "Yes" : "No"}</td>
                        <td style={styles.td}>{t.is_carry_forwardable ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {shifts.length > 0 && (
                <div style={styles.card}>
                  <h3 style={styles.cardTitle}>Company Shifts</h3>
                  <hr style={styles.divider} />
                  <table style={styles.table}>
                    <thead>
                      <tr><th style={styles.th}>Shift Name</th><th style={styles.th}>Schedule</th><th style={styles.th}>Grace Period</th><th style={styles.th}>Required Hours</th></tr>
                    </thead>
                    <tbody>
                      {shifts.map(s => (
                        <tr key={s.id} style={styles.tr}>
                          <td style={styles.td}><strong>{s.shift_name}</strong></td>
                          <td style={styles.td}>{s.shift_start_time} - {s.shift_end_time}</td>
                          <td style={styles.td}>{s.grace_period_minutes} mins</td>
                          <td style={styles.td}>{s.required_working_hours} hrs</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
  
  settingsContainer: { display: "flex", gap: "40px", alignItems: "flex-start", maxWidth: "900px" },
  
  tabContent: { flexGrow: 1, width: "100%" },
  
  card: { backgroundColor: "white", padding: "32px", borderRadius: "12px", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)", border: "1px solid #e2e8f0" },
  cardTitle: { color: "#0f172a", margin: "0 0 6px 0", fontSize: "18px", fontWeight: "700" },
  divider: { border: "none", borderTop: "1px solid #e2e8f0", margin: "0 0 24px 0" },
  
  /* Tables */
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left" },
  th: { backgroundColor: "#f8fafc", padding: "16px 20px", borderBottom: "2px solid #e2e8f0", color: "#64748b", fontSize: "12px", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.5px" },
  tr: { borderBottom: "1px solid #e2e8f0" },
  td: { padding: "18px 20px", color: "#334155", fontSize: "14px", verticalAlign: "middle" }
};

export default LeavePolicy;
