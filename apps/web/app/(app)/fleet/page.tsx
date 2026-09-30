'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, type Paginated } from '@/lib/api';
import { PageHeader, Spinner, ErrorState } from '@/components/ui';

interface Vehicle {
  id: string;
  name: string;
  registrationNo?: string;
  type: string;
  capacity?: number;
  driver?: { id: string; firstName: string; lastName: string } | null;
}

interface FleetBooking {
  id: string;
  company: string;
  destination?: string | null;
  startDate: string;
  endDate: string;
  vehicleId: string;
  vehicle?: { id: string; name: string; registrationNo?: string | null };
  driverName?: string | null;
  departTime?: string | null;
  paxCount?: number | null;
  notes?: string | null;
}

const PALETTE = [
  '#3b82f6','#ef4444','#22c55e','#f97316','#a855f7',
  '#eab308','#14b8a6','#ec4899','#6366f1','#84cc16',
  '#1d4ed8','#475569','#78716c','#dc2626','#0891b2',
];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function parseLocalDate(iso: string): Date { const [y,m,d]=iso.split('T')[0].split('-').map(Number); return new Date(y,m-1,d); }
function toISOLocal(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function fmtDate(d: Date): string { return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0,3)}`; }
function bookingColor(idx: number) { return PALETTE[idx % PALETTE.length]; }

const thStyle: React.CSSProperties = { padding:'7px 8px', fontWeight:700, fontSize:10, color:'#94a3b8', textAlign:'left', borderBottom:'1px solid rgba(255,255,255,0.08)', whiteSpace:'nowrap', textTransform:'uppercase', letterSpacing:'0.05em' };
const tdStyle: React.CSSProperties = { padding:'7px 8px', color:'#94a3b8', whiteSpace:'nowrap', fontSize:12 };

export default function FleetPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vLoading, setVLoading] = useState(true);
  const [vError, setVError] = useState<string|null>(null);

  const [bookings, setBookings] = useState<FleetBooking[]>([]);
  const [bLoading, setBLoading] = useState(true);
  const [bError, setBError] = useState<string|null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string|null>(null);
  const [formError, setFormError] = useState<string|null>(null);
  const [submitting, setSubmitting] = useState(false);

  const blank = { company:'', destination:'', startDate:toISOLocal(today), endDate:toISOLocal(today), vehicleId:'', driverName:'', departTime:'', paxCount:'', notes:'' };
  const [form, setForm] = useState(blank);

  // ── load vehicles ──────────────────────────────────────────
  useEffect(() => {
    setVLoading(true);
    api.get<Paginated<Vehicle>>('/vehicles?limit=200')
      .then(r => setVehicles(r.items))
      .catch((e: Error) => setVError(e.message))
      .finally(() => setVLoading(false));
  }, []);

  // ── load fleet bookings for the visible month range ────────
  const loadBookings = useCallback(() => {
    setBLoading(true);
    setBError(null);
    // Fetch a wide window: 1st of month to last day of month
    const from = `${year}-${String(month+1).padStart(2,'0')}-01`;
    const to   = `${year}-${String(month+1).padStart(2,'0')}-${String(daysInMonth(year,month)).padStart(2,'0')}`;
    api.get<Paginated<FleetBooking>>(`/fleet?limit=500&from=${from}&to=${to}`)
      .then(r => setBookings(r.items))
      .catch((e: Error) => setBError(e.message))
      .finally(() => setBLoading(false));
  }, [year, month]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  // ── month nav ──────────────────────────────────────────────
  function prevMonth() { if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); }
  function nextMonth() { if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); }

  const days    = daysInMonth(year, month);
  const dayNums = Array.from({length:days},(_,i)=>i+1);

  // ── Gantt helpers ──────────────────────────────────────────
  function barOn(b: FleetBooking, d: number) {
    const s=parseLocalDate(b.startDate), e=parseLocalDate(b.endDate), c=new Date(year,month,d);
    return c>=s && c<=e;
  }
  function isStart(b: FleetBooking, d: number) {
    const s=parseLocalDate(b.startDate);
    return s.getFullYear()===year && s.getMonth()===month && s.getDate()===d;
  }

  // ── form submit ────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setFormError(null);
    if(!form.company.trim()){setFormError('Company is required');return;}
    if(!form.vehicleId){setFormError('Select a vehicle');return;}
    if(form.endDate<form.startDate){setFormError('End date must be on or after start date');return;}
    setSubmitting(true);
    try {
      const payload = {
        company:     form.company,
        destination: form.destination || undefined,
        startDate:   form.startDate,
        endDate:     form.endDate,
        vehicleId:   form.vehicleId,
        driverName:  form.driverName || undefined,
        departTime:  form.departTime || undefined,
        paxCount:    form.paxCount ? parseInt(form.paxCount, 10) : undefined,
        notes:       form.notes || undefined,
      };
      if(editId) {
        await api.patch(`/fleet/${editId}`, payload);
      } else {
        await api.post('/fleet', payload);
      }
      setForm(blank); setShowForm(false); setEditId(null);
      loadBookings();
    } catch(err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(b: FleetBooking) {
    setEditId(b.id);
    setForm({
      company:     b.company,
      destination: b.destination ?? '',
      startDate:   b.startDate.split('T')[0],
      endDate:     b.endDate.split('T')[0],
      vehicleId:   b.vehicleId,
      driverName:  b.driverName ?? '',
      departTime:  b.departTime ?? '',
      paxCount:    b.paxCount != null ? String(b.paxCount) : '',
      notes:       b.notes ?? '',
    });
    setShowForm(true); setFormError(null);
  }

  async function deleteBooking(id: string) {
    if(!window.confirm('Delete this booking from the database?')) return;
    try {
      await api.delete(`/fleet/${id}`);
      loadBookings();
    } catch(err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  function cancelForm() { setShowForm(false); setEditId(null); setForm(blank); setFormError(null); }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <PageHeader
        title="Fleet Scheduler"
        subtitle="Colour-coded bus booking calendar — saved to database"
        action={
          <button className="btn btn-primary" onClick={()=>{setShowForm(s=>!s);setEditId(null);setForm(blank);}}>
            {showForm&&!editId?'✕ Cancel':'+ New Booking'}
          </button>
        }
      />

      {/* ── Form ── */}
      {showForm&&(
        <section className="card" style={{padding:0}}>
          <header className="card-header"><h2 className="card-title">{editId?'Edit Booking':'New Bus Booking'}</h2></header>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))'}}>
                <label className="field"><span className="field-label">Company / Group *</span>
                  <input className="input" value={form.company} onChange={e=>setForm({...form,company:e.target.value})} placeholder="e.g. KPMG" required/>
                </label>
                <label className="field"><span className="field-label">Destination</span>
                  <input className="input" value={form.destination} onChange={e=>setForm({...form,destination:e.target.value})} placeholder="e.g. Accra"/>
                </label>
                <label className="field"><span className="field-label">Vehicle *</span>
                  <select className="input" value={form.vehicleId} onChange={e=>setForm({...form,vehicleId:e.target.value})} required>
                    <option value="">— select vehicle —</option>
                    {vehicles.map(v=><option key={v.id} value={v.id}>{v.name}{v.registrationNo?` (${v.registrationNo})`:''}</option>)}
                  </select>
                </label>
                <label className="field"><span className="field-label">Driver</span>
                  <input className="input" value={form.driverName} onChange={e=>setForm({...form,driverName:e.target.value})} placeholder="Driver name"/>
                </label>
                <label className="field"><span className="field-label">Start date *</span>
                  <input className="input" type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})} required/>
                </label>
                <label className="field"><span className="field-label">End date *</span>
                  <input className="input" type="date" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})} required/>
                </label>
                <label className="field"><span className="field-label">Depart time</span>
                  <input className="input" type="time" value={form.departTime} onChange={e=>setForm({...form,departTime:e.target.value})}/>
                </label>
                <label className="field"><span className="field-label">Pax count</span>
                  <input className="input" type="number" min="1" value={form.paxCount} onChange={e=>setForm({...form,paxCount:e.target.value})}/>
                </label>
                <label className="field" style={{gridColumn:'span 2'}}><span className="field-label">Notes</span>
                  <input className="input" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Optional notes"/>
                </label>
              </div>
              {formError&&<div className="error-state" style={{marginTop:8}}>{formError}</div>}
              <div className="form-actions" style={{marginTop:12}}>
                <button className="btn btn-primary" type="submit" disabled={submitting}>{submitting?'Saving…':editId?'Save changes':'Add booking'}</button>
                <button className="btn btn-secondary" type="button" onClick={cancelForm}>Cancel</button>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* ── Month nav ── */}
      <div style={{display:'flex',alignItems:'center',gap:16}}>
        <button className="btn btn-secondary" onClick={prevMonth}>‹ Prev</button>
        <h2 style={{margin:0,fontSize:18,fontWeight:700,color:'#e2e8f0'}}>{MONTH_NAMES[month]} {year}</h2>
        <button className="btn btn-secondary" onClick={nextMonth}>Next ›</button>
        <span style={{marginLeft:'auto',fontSize:13,color:'#94a3b8'}}>{bookings.length} booking{bookings.length!==1?'s':''} this month</span>
      </div>

      {/* ── Gantt Grid ── */}
      {(vLoading||bLoading)?<Spinner/>:(vError||bError)?<ErrorState message={vError??bError??'Error'}/>:(
        <div style={{overflowX:'auto',borderRadius:12,border:'1px solid rgba(255,255,255,0.08)'}}>
          <table style={{borderCollapse:'collapse',width:'100%',minWidth:900,fontSize:12,background:'#0f172a'}}>
            <thead>
              <tr style={{background:'#1e293b'}}>
                <th style={thStyle}>SR.</th>
                <th style={{...thStyle,minWidth:130}}>COMPANY</th>
                <th style={{...thStyle,minWidth:105}}>DATES</th>
                <th style={{...thStyle,minWidth:100}}>DESTINATION</th>
                <th style={{...thStyle,minWidth:90}}>VEHICLE</th>
                <th style={{...thStyle,minWidth:90}}>DRIVER</th>
                <th style={{...thStyle,minWidth:55}}>DEPART</th>
                {dayNums.map(d=>{
                  const isToday=d===today.getDate()&&month===today.getMonth()&&year===today.getFullYear();
                  return <th key={d} style={{...thStyle,minWidth:28,width:28,textAlign:'center',background:isToday?'rgba(59,130,246,0.3)':'#1e293b',color:isToday?'#60a5fa':'#94a3b8'}}>{d}</th>;
                })}
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {bookings.length===0&&(
                <tr><td colSpan={7+days+1} style={{textAlign:'center',padding:'32px 16px',color:'#475569',fontStyle:'italic'}}>
                  No bookings this month. Click <strong>+ New Booking</strong> to add one.
                </td></tr>
              )}
              {bookings.map((b,idx)=>{
                const color=bookingColor(idx);
                const s=parseLocalDate(b.startDate), e=parseLocalDate(b.endDate);
                const vName=b.vehicle?.name??vehicles.find(v=>v.id===b.vehicleId)?.name??'—';
                return (
                  <tr key={b.id} style={{borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                    <td style={tdStyle}>{idx+1}</td>
                    <td style={{...tdStyle,fontWeight:600,color:'#f1f5f9'}}>{b.company}</td>
                    <td style={{...tdStyle,whiteSpace:'nowrap',color:'#cbd5e1'}}>{fmtDate(s)} – {fmtDate(e)}</td>
                    <td style={tdStyle}>{b.destination||'—'}</td>
                    <td style={{...tdStyle,fontWeight:600,color:'#7dd3fc'}}>{vName}</td>
                    <td style={tdStyle}>{b.driverName||'—'}</td>
                    <td style={{...tdStyle,whiteSpace:'nowrap'}}>{b.departTime||'—'}</td>
                    {dayNums.map(d=>{
                      const filled=barOn(b,d);
                      const start=isStart(b,d);
                      return (
                        <td key={d} style={{padding:0,height:32,background:filled?color:'transparent',borderLeft:filled&&start?`3px solid rgba(255,255,255,0.35)`:undefined,borderTop:filled?'1px solid rgba(255,255,255,0.08)':undefined,borderBottom:filled?'1px solid rgba(0,0,0,0.25)':undefined,position:'relative'}}>
                          {start&&<span style={{position:'absolute',left:4,top:'50%',transform:'translateY(-50%)',color:'#fff',fontWeight:700,fontSize:10,whiteSpace:'nowrap',overflow:'hidden',maxWidth:130,textOverflow:'ellipsis',pointerEvents:'none'}}>{b.company}</span>}
                        </td>
                      );
                    })}
                    <td style={{...tdStyle,whiteSpace:'nowrap'}}>
                      <button onClick={()=>startEdit(b)} style={{background:'none',border:'none',color:'#60a5fa',cursor:'pointer',fontSize:13,padding:'2px 6px'}} title="Edit">✎</button>
                      <button onClick={()=>deleteBooking(b.id)} style={{background:'none',border:'none',color:'#f87171',cursor:'pointer',fontSize:13,padding:'2px 6px'}} title="Delete">✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Colour legend ── */}
      {bookings.length>0&&(
        <div style={{display:'flex',flexWrap:'wrap',gap:10,marginTop:4}}>
          {bookings.map((b,idx)=>(
            <div key={b.id} style={{display:'flex',alignItems:'center',gap:6,fontSize:12}}>
              <span style={{width:16,height:12,borderRadius:3,background:bookingColor(idx),display:'inline-block'}}/>
              <span style={{color:'#cbd5e1'}}>{b.company} — {b.vehicle?.name??'—'}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Vehicles panel ── */}
      <section className="card">
        <header className="card-header"><h2 className="card-title">Fleet Vehicles</h2></header>
        <div className="card-body">
          {vehicles.length===0?(
            <p style={{color:'#475569',fontStyle:'italic'}}>No vehicles found. Add vehicles in the admin panel first.</p>
          ):(
            <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
              {vehicles.map(v=>(
                <div key={v.id} style={{background:'#1e293b',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'8px 14px',fontSize:13}}>
                  <div style={{fontWeight:700,color:'#7dd3fc'}}>{v.name}</div>
                  {v.registrationNo&&<div style={{color:'#94a3b8'}}>{v.registrationNo}</div>}
                  <div style={{color:'#64748b',marginTop:2}}>{v.type}{v.capacity?` · ${v.capacity} seats`:''}{v.driver?` · ${v.driver.firstName} ${v.driver.lastName}`:''}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
