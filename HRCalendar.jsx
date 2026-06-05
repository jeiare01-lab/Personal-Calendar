import { useState, useEffect, useCallback } from "react";

// ─── Supabase Config ──────────────────────────────────────────────────────────
const SUPABASE_URL  = "https://vyzgoiyhjezvlfrfjifa.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5emdvaXloamV6dmxmcmZqaWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NDc1MzksImV4cCI6MjA5NjIyMzUzOX0.FrwoyEyvjbQQoC0imSXtOfUnB0NpsqZMG44fRAJM7IY";
const TABLE         = "hr_calendar_events";
const OWNER_PIN     = "PGB-HR-2026"; // change this to your preferred PIN

const api = (path, opts = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...opts.headers,
    },
    ...opts,
  });

// ─── PGB Design System ────────────────────────────────────────────────────────
const DS = {
  navy:   "#0D1B3D",
  cream:  "#F5F0E8",
  orange: "#E65100",
  gold:   "#C8962A",
  steel:  "#4A6080",
  mist:   "#D6DDE8",
  white:  "#FFFFFF",
};

const AFFILIATES = {
  AAC: { label: "AAC Lightweight Block Corp", short: "AAC", color: "#2E7D32", bg: "#E8F5E9" },
  CSI: { label: "Concrete Solutions Inc",     short: "CSI", color: "#1565C0", bg: "#E3F2FD" },
  PSC: { label: "Primary Structures Corp",    short: "PSC", color: "#AD1457", bg: "#FCE4EC" },
  PGB: { label: "PGB / Cross-SBU",            short: "PGB", color: "#E65100", bg: "#FFF3E0" },
};

const CATEGORIES = {
  OPERATIONS:  { label: "HR Operations",             icon: "⚙️",  color: "#546E7A" },
  COE:         { label: "HR Center of Excellence",   icon: "🏛️",  color: "#6A1B9A" },
  SERVICE:     { label: "HR Service Delivery",       icon: "🤝",  color: "#0277BD" },
  HEALTH:      { label: "HR Occ. Health & Wellbeing",icon: "💚",  color: "#2E7D32" },
  L10:         { label: "L10 HR Agenda",             icon: "🎯",  color: "#BF360C" },
  PARTNERSHIP: { label: "HR Business Partnership",   icon: "🔗",  color: "#00838F" },
  STRATEGIC:   { label: "Strategic HR",              icon: "🧭",  color: "#E65100" },
};

const DAYS   = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function daysInMonth(y, m)  { return new Date(y, m + 1, 0).getDate(); }
function firstDayOfMonth(y,m){ return new Date(y, m, 1).getDay(); }
function toDateStr(y, m, d) {
  return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

// ─── Owner PIN stored in sessionStorage (survives refresh, not tab close) ─────
function getOwnerMode() {
  return sessionStorage.getItem("pgb_hr_owner") === "true";
}
function setOwnerMode(v) {
  sessionStorage.setItem("pgb_hr_owner", v ? "true" : "false");
}

export default function HRCalendar() {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError]   = useState(null);
  const [selected, setSelected] = useState(null);
  const [modal, setModal]   = useState(null);   // "add" | event obj | "pin"
  const [filterAff, setFilterAff] = useState("ALL");
  const [filterCat, setFilterCat] = useState("ALL");
  const [view, setView]     = useState("month");
  const [isOwner, setIsOwner] = useState(getOwnerMode());
  const [pin, setPin]       = useState("");
  const [pinError, setPinError] = useState(false);
  const [form, setForm]     = useState({ title:"", date:"", affiliate:"PGB", category:"OPERATIONS", note:"" });

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  // ── Fetch all events ─────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    try {
      setError(null);
      const res = await api(`${TABLE}?select=*&order=date.asc`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEvents(data);
    } catch (e) {
      setError("Could not load events. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function prevMonth() { if(month===0){setYear(y=>y-1);setMonth(11);}else setMonth(m=>m-1); }
  function nextMonth() { if(month===11){setYear(y=>y+1);setMonth(0);}else setMonth(m=>m+1); }

  function eventsOn(dateStr) {
    return events.filter(e => e.date === dateStr &&
      (filterAff==="ALL" || e.affiliate===filterAff) &&
      (filterCat==="ALL" || e.category===filterCat));
  }

  function openAdd(dateStr) {
    if (!isOwner) { setModal("pin"); return; }
    setForm({ title:"", date: dateStr||todayStr, affiliate:"PGB", category:"OPERATIONS", note:"" });
    setModal("add");
  }

  function editEvent(evt) {
    if (!isOwner) return;
    setForm({ title:evt.title, date:evt.date, affiliate:evt.affiliate, category:evt.category, note:evt.note||"" });
    setModal(evt);
  }

  // ── PIN unlock ───────────────────────────────────────────────────────────────
  function submitPin() {
    if (pin === OWNER_PIN) {
      setIsOwner(true);
      setOwnerMode(true);
      setPinError(false);
      setModal(null);
      setPin("");
    } else {
      setPinError(true);
    }
  }

  function lockOwner() {
    setIsOwner(false);
    setOwnerMode(false);
  }

  // ── Save (create or update) ──────────────────────────────────────────────────
  async function saveEvent() {
    if (!form.title || !form.date) return;
    setSyncing(true);
    try {
      if (modal === "add") {
        const res = await api(TABLE, {
          method: "POST",
          body: JSON.stringify({
            title: form.title, date: form.date,
            affiliate: form.affiliate, category: form.category,
            note: form.note,
          }),
        });
        if (!res.ok) throw new Error();
        const [created] = await res.json();
        setEvents(prev => [...prev, created]);
      } else {
        const res = await api(`${TABLE}?id=eq.${modal.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: form.title, date: form.date,
            affiliate: form.affiliate, category: form.category,
            note: form.note, updated_at: new Date().toISOString(),
          }),
        });
        if (!res.ok) throw new Error();
        const [updated] = await res.json();
        setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
      }
      setModal(null);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSyncing(false);
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  async function deleteEvent(id) {
    setSyncing(true);
    try {
      const res = await api(`${TABLE}?id=eq.${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setEvents(prev => prev.filter(e => e.id !== id));
      setModal(null);
    } catch {
      setError("Failed to delete. Please try again.");
    } finally {
      setSyncing(false);
    }
  }

  // ── Calendar grid ────────────────────────────────────────────────────────────
  const totalDays = daysInMonth(year, month);
  const startDay  = firstDayOfMonth(year, month);
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  const monthPrefix = `${year}-${String(month+1).padStart(2,"0")}`;
  const listEvents = events
    .filter(e => e.date.startsWith(monthPrefix) &&
      (filterAff==="ALL" || e.affiliate===filterAff) &&
      (filterCat==="ALL" || e.category===filterCat))
    .sort((a,b) => a.date.localeCompare(b.date));

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily:"'IBM Plex Sans','Segoe UI',sans-serif", background:DS.cream, minHeight:"100vh", color:DS.navy }}>

      {/* ── HEADER ── */}
      <div style={{ background:DS.navy, position:"sticky", top:0, zIndex:100, boxShadow:"0 2px 12px rgba(0,0,0,0.25)" }}>

        {/* Top bar */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px 6px" }}>
          <div>
            <div style={{ fontSize:10, color:DS.gold, fontWeight:700, letterSpacing:2, textTransform:"uppercase" }}>Primary Group of Builders</div>
            <div style={{ fontSize:17, fontWeight:800, color:DS.cream, lineHeight:1.2 }}>HR Strategic Partner</div>
            <div style={{ fontSize:10, color:DS.mist }}>Construction & Manufacturing SBU</div>
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            {/* Sync indicator */}
            {syncing && <span style={{ fontSize:10, color:DS.gold, animation:"pulse 1s infinite" }}>↻ syncing</span>}
            {/* Owner/Viewer badge */}
            <button onClick={isOwner ? lockOwner : ()=>setModal("pin")} style={{
              background: isOwner ? DS.orange : "rgba(255,255,255,0.12)",
              border:"none", borderRadius:6, color:DS.cream,
              padding:"5px 10px", fontSize:10, fontWeight:700, cursor:"pointer", letterSpacing:0.5
            }}>
              {isOwner ? "🔓 OWNER" : "👁 VIEWER"}
            </button>
            <button onClick={()=>setView(v=>v==="month"?"list":"month")} style={{
              background:"rgba(255,255,255,0.1)", border:"none", borderRadius:6,
              color:DS.cream, padding:"5px 10px", fontSize:10, fontWeight:700, cursor:"pointer"
            }}>
              {view==="month"?"LIST":"CAL"}
            </button>
            {isOwner && (
              <button onClick={()=>openAdd("")} style={{
                background:DS.orange, border:"none", borderRadius:6,
                color:DS.white, padding:"5px 12px", fontSize:16, fontWeight:700, cursor:"pointer"
              }}>＋</button>
            )}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{ background:"#BF360C", color:DS.white, fontSize:11, padding:"6px 16px", display:"flex", justifyContent:"space-between" }}>
            <span>⚠️ {error}</span>
            <button onClick={()=>{ setError(null); fetchEvents(); }} style={{ background:"none", border:"none", color:DS.white, fontWeight:700, cursor:"pointer" }}>Retry</button>
          </div>
        )}

        {/* Affiliate + Category filters */}
        <div style={{ display:"flex", gap:4, padding:"4px 12px", overflowX:"auto" }}>
          {["ALL",...Object.keys(AFFILIATES)].map(k=>(
            <button key={k} onClick={()=>setFilterAff(k)} style={{
              flexShrink:0,
              background: filterAff===k ? (k==="ALL"?DS.orange:AFFILIATES[k]?.color||DS.orange) : "rgba(255,255,255,0.1)",
              border:"none", borderRadius:20, color:DS.cream,
              padding:"3px 10px", fontSize:10, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap"
            }}>{k==="ALL"?"All BAs":AFFILIATES[k].short}</button>
          ))}
          <div style={{ width:1, background:"rgba(255,255,255,0.2)", margin:"0 2px" }}/>
          {["ALL",...Object.keys(CATEGORIES)].map(k=>(
            <button key={k} onClick={()=>setFilterCat(k)} style={{
              flexShrink:0,
              background: filterCat===k ? (k==="ALL"?DS.steel:CATEGORIES[k]?.color||DS.steel) : "rgba(255,255,255,0.1)",
              border:"none", borderRadius:20, color:DS.cream,
              padding:"3px 10px", fontSize:10, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap"
            }}>{k==="ALL"?"All":`${CATEGORIES[k].icon} ${CATEGORIES[k].label.split(" ")[1]||CATEGORIES[k].label.split(" ")[0]}`}</button>
          ))}
        </div>

        {/* Month nav */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"4px 16px 10px" }}>
          <button onClick={prevMonth} style={{ background:"none", border:"none", color:DS.cream, fontSize:22, cursor:"pointer" }}>‹</button>
          <div>
            <span style={{ fontSize:19, fontWeight:800, color:DS.cream }}>{MONTHS[month]}</span>
            <span style={{ fontSize:13, color:DS.gold, marginLeft:8, fontWeight:600 }}>{year}</span>
          </div>
          <button onClick={nextMonth} style={{ background:"none", border:"none", color:DS.cream, fontSize:22, cursor:"pointer" }}>›</button>
        </div>
      </div>

      {/* ── LOADING ── */}
      {loading && (
        <div style={{ textAlign:"center", padding:"60px 0", color:DS.steel, fontSize:13 }}>
          ↻ Loading calendar…
        </div>
      )}

      {/* ── MONTH VIEW ── */}
      {!loading && view==="month" && (
        <div style={{ padding:"8px 8px 100px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:2 }}>
            {DAYS.map(d=>(
              <div key={d} style={{ textAlign:"center", fontSize:9, fontWeight:700,
                color:d==="SUN"||d==="SAT"?DS.steel:DS.navy, padding:"4px 0", letterSpacing:1 }}>{d}</div>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
            {cells.map((d,i)=>{
              if (!d) return <div key={`e${i}`}/>;
              const ds = toDateStr(year, month, d);
              const dayEvts = eventsOn(ds);
              const isToday = ds===todayStr;
              const isSel   = ds===selected;
              const isWknd  = (i%7===0||i%7===6);
              return (
                <div key={ds} onClick={()=>setSelected(isSel?null:ds)} style={{
                  background: isToday?DS.navy:isSel?"#EAE4D8":DS.white,
                  borderRadius:8, padding:"5px 4px", minHeight:62, cursor:"pointer",
                  border: isToday?`2px solid ${DS.orange}`:isSel?`2px solid ${DS.gold}`:"2px solid transparent",
                  boxShadow: dayEvts.length?"0 1px 4px rgba(0,0,0,0.08)":"none",
                  transition:"all 0.15s",
                }}>
                  <div style={{ fontSize:11, fontWeight:isToday?900:600,
                    color:isToday?DS.cream:isWknd?DS.steel:DS.navy, marginBottom:3, lineHeight:1 }}>{d}</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                    {dayEvts.slice(0,3).map(evt=>(
                      <div key={evt.id}
                        onClick={e=>{ e.stopPropagation(); if(isOwner) editEvent(evt); }}
                        style={{
                          background:AFFILIATES[evt.affiliate]?.bg||DS.cream,
                          borderLeft:`3px solid ${AFFILIATES[evt.affiliate]?.color||DS.orange}`,
                          borderRadius:3, padding:"1px 4px",
                          fontSize:9, fontWeight:600,
                          color:AFFILIATES[evt.affiliate]?.color||DS.navy,
                          overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis", lineHeight:1.4,
                        }} title={evt.title}>
                        {CATEGORIES[evt.category]?.icon} {evt.title}
                      </div>
                    ))}
                    {dayEvts.length>3 && <div style={{ fontSize:8, color:DS.steel, fontWeight:600, paddingLeft:2 }}>+{dayEvts.length-3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Day panel */}
          {selected && (
            <div style={{ marginTop:12, background:DS.white, borderRadius:12, padding:"12px 14px",
              boxShadow:"0 4px 20px rgba(13,27,61,0.12)", border:`1px solid ${DS.mist}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <span style={{ fontWeight:800, fontSize:13, color:DS.navy }}>
                  {new Date(selected+"T12:00:00").toLocaleDateString("en-PH",{weekday:"long",month:"long",day:"numeric"})}
                </span>
                {isOwner && (
                  <button onClick={()=>openAdd(selected)} style={{
                    background:DS.orange, border:"none", borderRadius:6,
                    color:DS.white, fontSize:11, fontWeight:700, padding:"4px 10px", cursor:"pointer"
                  }}>+ Add</button>
                )}
              </div>
              {eventsOn(selected).length===0 && <div style={{ color:DS.steel, fontSize:12, fontStyle:"italic" }}>No events this day.</div>}
              {eventsOn(selected).map(evt=>(
                <EventCard key={evt.id} evt={evt} onEdit={isOwner?()=>editEvent(evt):null} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {!loading && view==="list" && (
        <div style={{ padding:"12px 12px 100px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:DS.steel, letterSpacing:1, marginBottom:8, textTransform:"uppercase" }}>
            {listEvents.length} event{listEvents.length!==1?"s":""} · {MONTHS[month]} {year}
          </div>
          {listEvents.length===0 && (
            <div style={{ color:DS.steel, fontSize:13, fontStyle:"italic", textAlign:"center", padding:"40px 0" }}>
              No events this month.
            </div>
          )}
          {listEvents.map(evt=>{
            const d = new Date(evt.date+"T12:00:00");
            return (
              <div key={evt.id} style={{ display:"flex", gap:10, marginBottom:8 }}>
                <div style={{ flexShrink:0, width:44, textAlign:"center",
                  background:DS.navy, borderRadius:8, padding:"6px 4px", color:DS.cream }}>
                  <div style={{ fontSize:16, fontWeight:900, lineHeight:1 }}>{d.getDate()}</div>
                  <div style={{ fontSize:8, fontWeight:700, letterSpacing:1, color:DS.gold, textTransform:"uppercase" }}>{DAYS[d.getDay()]}</div>
                </div>
                <div style={{ flex:1 }}>
                  <EventCard evt={evt} onEdit={isOwner?()=>editEvent(evt):null} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── PIN MODAL ── */}
      {modal==="pin" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(13,27,61,0.7)", zIndex:999,
          display:"flex", alignItems:"center", justifyContent:"center", padding:"0 24px" }}
          onClick={()=>{ setModal(null); setPin(""); setPinError(false); }}>
          <div style={{ background:DS.white, borderRadius:16, padding:"28px 24px", width:"100%", maxWidth:340 }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:15, fontWeight:800, color:DS.navy, marginBottom:4 }}>🔐 Owner Access</div>
            <div style={{ fontSize:12, color:DS.steel, marginBottom:16 }}>Enter your owner PIN to add or edit events.</div>
            <input
              type="password" value={pin} onChange={e=>setPin(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&submitPin()}
              placeholder="Enter PIN"
              style={{ ...inputStyle, marginBottom:8, letterSpacing:4, fontSize:18, textAlign:"center" }}
              autoFocus
            />
            {pinError && <div style={{ fontSize:11, color:"#C62828", marginBottom:8, textAlign:"center" }}>Incorrect PIN. Try again.</div>}
            <button onClick={submitPin} style={{
              width:"100%", background:DS.navy, border:"none", borderRadius:8,
              color:DS.white, padding:"12px", fontSize:14, fontWeight:800, cursor:"pointer"
            }}>Unlock</button>
          </div>
        </div>
      )}

      {/* ── ADD / EDIT MODAL ── */}
      {modal && modal!=="pin" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(13,27,61,0.6)", zIndex:999,
          display:"flex", alignItems:"flex-end" }} onClick={()=>setModal(null)}>
          <div style={{ background:DS.white, width:"100%", borderRadius:"16px 16px 0 0",
            padding:"20px 16px 32px", maxHeight:"85vh", overflowY:"auto" }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <span style={{ fontSize:15, fontWeight:800, color:DS.navy }}>
                {modal==="add"?"New Event":"Edit Event"}
              </span>
              <button onClick={()=>setModal(null)} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:DS.steel }}>×</button>
            </div>

            <label style={labelStyle}>Event Title *</label>
            <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}
              placeholder="e.g. Q2 Performance Review" style={inputStyle} />

            <label style={labelStyle}>Date *</label>
            <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={inputStyle} />

            <label style={labelStyle}>Business Affiliate</label>
            <select value={form.affiliate} onChange={e=>setForm(f=>({...f,affiliate:e.target.value}))} style={inputStyle}>
              {Object.entries(AFFILIATES).map(([k,v])=>(
                <option key={k} value={k}>{v.short} — {v.label}</option>
              ))}
            </select>

            <label style={labelStyle}>Category</label>
            <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={inputStyle}>
              {Object.entries(CATEGORIES).map(([k,v])=>(
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>

            <label style={labelStyle}>Notes</label>
            <textarea value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))}
              placeholder="Additional details..." rows={3}
              style={{...inputStyle, resize:"none", fontFamily:"inherit"}} />

            <div style={{ display:"flex", gap:8, marginTop:12 }}>
              <button onClick={saveEvent} disabled={syncing} style={{
                flex:1, background:syncing?"#ccc":DS.orange, border:"none", borderRadius:8,
                color:DS.white, padding:"12px", fontSize:14, fontWeight:800, cursor:"pointer"
              }}>
                {syncing?"Saving…": modal==="add"?"Add Event":"Save Changes"}
              </button>
              {modal!=="add" && (
                <button onClick={()=>deleteEvent(modal.id)} disabled={syncing} style={{
                  background:"#FFEBEE", border:"none", borderRadius:8,
                  color:"#C62828", padding:"12px 16px", fontSize:14, fontWeight:700, cursor:"pointer"
                }}>🗑</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM LEGEND ── */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0,
        background:DS.navy, padding:"8px 12px", display:"flex", gap:8, overflowX:"auto" }}>
        {Object.entries(AFFILIATES).map(([k,v])=>(
          <div key={k} style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
            <div style={{ width:8, height:8, borderRadius:2, background:v.color }}/>
            <span style={{ fontSize:9, color:DS.mist, fontWeight:600 }}>{v.short}</span>
          </div>
        ))}
        <div style={{ width:1, background:"rgba(255,255,255,0.2)" }}/>
        {Object.entries(CATEGORIES).map(([k,v])=>(
          <div key={k} style={{ display:"flex", alignItems:"center", gap:3, flexShrink:0 }}>
            <span style={{ fontSize:10 }}>{v.icon}</span>
            <span style={{ fontSize:9, color:DS.mist }}>{v.label.split(" ").slice(1).join(" ")||v.label}</span>
          </div>
        ))}
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}

function EventCard({ evt, onEdit }) {
  const aff = AFFILIATES[evt.affiliate] || AFFILIATES.PGB;
  const cat = CATEGORIES[evt.category]  || CATEGORIES.OPERATIONS;
  return (
    <div onClick={onEdit||undefined} style={{
      background:DS.white, border:`1px solid ${DS.mist}`,
      borderLeft:`4px solid ${aff.color}`,
      borderRadius:"0 8px 8px 0", padding:"8px 10px",
      cursor: onEdit?"pointer":"default", marginBottom:4,
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:6 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#0D1B3D", lineHeight:1.3, marginBottom:3 }}>
            {cat.icon} {evt.title}
          </div>
          {evt.note && <div style={{ fontSize:10, color:"#546E7A", lineHeight:1.3 }}>{evt.note}</div>}
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3, flexShrink:0 }}>
          <span style={{ background:aff.bg, color:aff.color, borderRadius:20, padding:"1px 7px", fontSize:9, fontWeight:800 }}>{aff.short}</span>
          <span style={{ background:"#F5F0E8", color:cat.color, borderRadius:20, padding:"1px 7px", fontSize:9, fontWeight:600 }}>
            {cat.label.split(" ").slice(1,3).join(" ")||cat.label}
          </span>
        </div>
      </div>
    </div>
  );
}

const labelStyle = { display:"block", fontSize:11, fontWeight:700, color:"#4A6080", letterSpacing:0.5, textTransform:"uppercase", marginBottom:4, marginTop:12 };
const inputStyle = { width:"100%", boxSizing:"border-box", border:"1.5px solid #D6DDE8", borderRadius:8, padding:"10px 12px", fontSize:13, fontFamily:"'IBM Plex Sans','Segoe UI',sans-serif", background:"#F9F7F3", color:"#0D1B3D", outline:"none" };
