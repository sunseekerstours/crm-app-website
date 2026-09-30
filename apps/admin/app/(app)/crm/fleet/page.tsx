'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, type Paginated } from '@/lib/api';
import { PageHeader, Spinner, ErrorState, Button } from '@/components/ui';

interface Vehicle {
  id: string;
  name: string;
  registrationNo?: string | null;
  type: string;
  capacity?: number | null;
  driverId?: string | null;
  driver?: { id: string; firstName: string; lastName: string } | null;
  notes?: string | null;
  isActive?: boolean;
}

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  licenseNumber?: string | null;
  isActive?: boolean;
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
  color?: string | null;
}

const COLOR_PRESETS = [
  { name: 'Ocean Blue', value: '#2563eb' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Crimson', value: '#dc2626' },
  { name: 'Sunset Orange', value: '#ea580c' },
  { name: 'Royal Purple', value: '#7c3aed' },
  { name: 'Amber Gold', value: '#d97706' },
  { name: 'Teal', value: '#0d9488' },
  { name: 'Rose Pink', value: '#e11d48' },
  { name: 'Indigo', value: '#4f46e5' },
  { name: 'Lime Green', value: '#65a30d' },
  { name: 'Cyan', value: '#0891b2' },
  { name: 'Slate Gray', value: '#475569' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toISOLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const thStyle: React.CSSProperties = {
  padding: '8px 10px',
  fontWeight: 700,
  fontSize: 11,
  color: '#94a3b8',
  textAlign: 'left',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  whiteSpace: 'nowrap',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  color: '#cbd5e1',
  whiteSpace: 'nowrap',
  fontSize: 13,
  borderBottom: '1px solid rgba(255,255,255,0.05)'
};

export default function AdminFleetPage() {
  const today = new Date();
  const [activeTab, setActiveTab] = useState<'scheduler' | 'vehicles' | 'drivers'>('scheduler');

  // Month navigation for Scheduler
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  // Data states
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vLoading, setVLoading] = useState(true);
  const [vError, setVError] = useState<string | null>(null);

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [dLoading, setDLoading] = useState(false);
  const [dError, setDError] = useState<string | null>(null);

  const [bookings, setBookings] = useState<FleetBooking[]>([]);
  const [bLoading, setBLoading] = useState(true);
  const [bError, setBError] = useState<string | null>(null);

  // Search/Filter in scheduler
  const [searchFilter, setSearchFilter] = useState('');

  // ── Booking Modal state ────────────────────────────────────
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editBookingId, setEditBookingId] = useState<string | null>(null);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingFormError, setBookingFormError] = useState<string | null>(null);

  const blankBooking = {
    company: '',
    destination: '',
    startDate: toISOLocal(today),
    endDate: toISOLocal(today),
    vehicleId: '',
    driverName: '',
    departTime: '',
    paxCount: '',
    notes: '',
    color: '#2563eb',
  };
  const [bookingForm, setBookingForm] = useState(blankBooking);

  // ── Vehicle Modal state ────────────────────────────────────
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [submittingVehicle, setSubmittingVehicle] = useState(false);
  const [vehicleFormError, setVehicleFormError] = useState<string | null>(null);
  const blankVehicle = {
    name: '',
    registrationNo: '',
    type: 'BUS',
    capacity: '30',
    driverId: '',
    notes: '',
  };
  const [vehicleForm, setVehicleForm] = useState(blankVehicle);

  // ── Driver Modal state ─────────────────────────────────────
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [submittingDriver, setSubmittingDriver] = useState(false);
  const [driverFormError, setDriverFormError] = useState<string | null>(null);
  const blankDriver = {
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    licenseNumber: '',
  };
  const [driverForm, setDriverForm] = useState(blankDriver);

  // ── Load data ──────────────────────────────────────────────
  const loadVehicles = useCallback(() => {
    setVLoading(true);
    api.get<Paginated<Vehicle>>('/vehicles?limit=200')
      .then(r => setVehicles(r.items || []))
      .catch((e: Error) => setVError(e.message))
      .finally(() => setVLoading(false));
  }, []);

  const loadDrivers = useCallback(() => {
    setDLoading(true);
    api.get<Paginated<Driver>>('/drivers?limit=200')
      .then(r => setDrivers(r.items || []))
      .catch((e: Error) => setDError(e.message))
      .finally(() => setDLoading(false));
  }, []);

  const loadBookings = useCallback(() => {
    setBLoading(true);
    setBError(null);
    const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth(year, month)).padStart(2, '0')}`;
    api.get<Paginated<FleetBooking>>(`/fleet?limit=500&from=${from}&to=${to}`)
      .then(r => setBookings(r.items || []))
      .catch((e: Error) => setBError(e.message))
      .finally(() => setBLoading(false));
  }, [year, month]);

  useEffect(() => {
    loadVehicles();
    loadDrivers();
  }, [loadVehicles, loadDrivers]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // ── Month nav ──────────────────────────────────────────────
  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }
  function resetToToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }

  const days = daysInMonth(year, month);
  const dayNums = Array.from({ length: days }, (_, i) => i + 1);

  // ── Gantt calculations ─────────────────────────────────────
  function getBookingsForVehicleOnDay(vId: string, d: number) {
    const c = new Date(year, month, d);
    return bookings.filter(b => {
      if (b.vehicleId !== vId) return false;
      const s = parseLocalDate(b.startDate);
      const e = parseLocalDate(b.endDate);
      return c >= s && c <= e;
    });
  }

  // ── Booking Handlers ───────────────────────────────────────
  function openNewBooking(vId?: string, day?: number) {
    const defaultDate = day
      ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      : toISOLocal(today);

    setBookingForm({
      ...blankBooking,
      vehicleId: vId || (vehicles[0]?.id || ''),
      startDate: defaultDate,
      endDate: defaultDate,
      color: COLOR_PRESETS[bookings.length % COLOR_PRESETS.length].value,
    });
    setEditBookingId(null);
    setBookingFormError(null);
    setShowBookingModal(true);
  }

  function openEditBooking(b: FleetBooking) {
    setBookingForm({
      company: b.company,
      destination: b.destination || '',
      startDate: b.startDate.split('T')[0],
      endDate: b.endDate.split('T')[0],
      vehicleId: b.vehicleId,
      driverName: b.driverName || '',
      departTime: b.departTime || '',
      paxCount: b.paxCount ? String(b.paxCount) : '',
      notes: b.notes || '',
      color: b.color || '#2563eb',
    });
    setEditBookingId(b.id);
    setBookingFormError(null);
    setShowBookingModal(true);
  }

  async function handleBookingSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBookingFormError(null);
    if (!bookingForm.company.trim()) { setBookingFormError('Company name is required'); return; }
    if (!bookingForm.vehicleId) { setBookingFormError('Please select a vehicle'); return; }
    if (bookingForm.endDate < bookingForm.startDate) {
      setBookingFormError('End date must be on or after start date');
      return;
    }

    setSubmittingBooking(true);
    try {
      const payload = {
        company: bookingForm.company.trim(),
        destination: bookingForm.destination.trim() || undefined,
        startDate: bookingForm.startDate,
        endDate: bookingForm.endDate,
        vehicleId: bookingForm.vehicleId,
        driverName: bookingForm.driverName.trim() || undefined,
        departTime: bookingForm.departTime.trim() || undefined,
        paxCount: bookingForm.paxCount ? parseInt(bookingForm.paxCount, 10) : undefined,
        notes: bookingForm.notes.trim() || undefined,
        color: bookingForm.color || '#2563eb',
      };

      if (editBookingId) {
        await api.patch(`/fleet/${editBookingId}`, payload);
      } else {
        await api.post('/fleet', payload);
      }
      setShowBookingModal(false);
      loadBookings();
    } catch (err: unknown) {
      setBookingFormError(err instanceof Error ? err.message : 'Failed to save booking');
    } finally {
      setSubmittingBooking(false);
    }
  }

  async function handleDeleteBooking(id: string) {
    if (!window.confirm('Are you sure you want to cancel and delete this bus booking?')) return;
    try {
      await api.delete(`/fleet/${id}`);
      setShowBookingModal(false);
      loadBookings();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete booking');
    }
  }

  // ── Vehicle Handlers ───────────────────────────────────────
  async function handleVehicleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setVehicleFormError(null);
    if (!vehicleForm.name.trim()) { setVehicleFormError('Vehicle name is required'); return; }

    setSubmittingVehicle(true);
    try {
      await api.post('/vehicles', {
        name: vehicleForm.name.trim(),
        registrationNo: vehicleForm.registrationNo.trim() || undefined,
        type: vehicleForm.type,
        capacity: vehicleForm.capacity ? parseInt(vehicleForm.capacity, 10) : undefined,
        driverId: vehicleForm.driverId || undefined,
        notes: vehicleForm.notes.trim() || undefined,
        isActive: true,
      });
      setShowVehicleModal(false);
      setVehicleForm(blankVehicle);
      loadVehicles();
    } catch (err: unknown) {
      setVehicleFormError(err instanceof Error ? err.message : 'Failed to create vehicle');
    } finally {
      setSubmittingVehicle(false);
    }
  }

  async function handleDeleteVehicle(id: string, name: string) {
    if (!window.confirm(`Are you sure you want to remove "${name}" from the fleet?`)) return;
    try {
      await api.delete(`/vehicles/${id}`);
      loadVehicles();
      loadBookings();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete vehicle');
    }
  }

  // ── Driver Handlers ────────────────────────────────────────
  async function handleDriverSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDriverFormError(null);
    if (!driverForm.firstName.trim() || !driverForm.lastName.trim()) {
      setDriverFormError('First and last name are required');
      return;
    }

    setSubmittingDriver(true);
    try {
      await api.post('/drivers', {
        firstName: driverForm.firstName.trim(),
        lastName: driverForm.lastName.trim(),
        phone: driverForm.phone.trim() || undefined,
        email: driverForm.email.trim() || undefined,
        licenseNumber: driverForm.licenseNumber.trim() || undefined,
        isActive: true,
      });
      setShowDriverModal(false);
      setDriverForm(blankDriver);
      loadDrivers();
    } catch (err: unknown) {
      setDriverFormError(err instanceof Error ? err.message : 'Failed to create driver');
    } finally {
      setSubmittingDriver(false);
    }
  }

  async function handleDeleteDriver(id: string, name: string) {
    if (!window.confirm(`Are you sure you want to remove driver "${name}"?`)) return;
    try {
      await api.delete(`/drivers/${id}`);
      loadDrivers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete driver');
    }
  }

  // Filtered vehicles for scheduler
  const displayedVehicles = vehicles.filter(v => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    const matchesVehicle = v.name.toLowerCase().includes(term) || (v.registrationNo?.toLowerCase() || '').includes(term);
    const hasMatchingBooking = bookings.some(b => b.vehicleId === v.id && (b.company.toLowerCase().includes(term) || (b.destination?.toLowerCase() || '').includes(term)));
    return matchesVehicle || hasMatchingBooking;
  });

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', paddingBottom: 60 }}>
      {/* ── Top Header ────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f8fafc', margin: 0 }}>Fleet Management & Scheduling</h1>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
            Admin fleet calendar, vehicle management, and driver dispatching
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {activeTab === 'scheduler' && (
            <Button onClick={() => openNewBooking()}>+ New Bus Booking</Button>
          )}
          {activeTab === 'vehicles' && (
            <Button onClick={() => { setVehicleForm(blankVehicle); setVehicleFormError(null); setShowVehicleModal(true); }}>
              + Add Vehicle
            </Button>
          )}
          {activeTab === 'drivers' && (
            <Button onClick={() => { setDriverForm(blankDriver); setDriverFormError(null); setShowDriverModal(true); }}>
              + Add Driver
            </Button>
          )}
        </div>
      </div>

      {/* ── Navigation Tabs ──────────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 20, gap: 8 }}>
        <button
          onClick={() => setActiveTab('scheduler')}
          style={{
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: 600,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'scheduler' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'scheduler' ? '#60a5fa' : '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>📅 Scheduler (Gantt Calendar)</span>
          <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 10 }}>
            {bookings.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('vehicles')}
          style={{
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: 600,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'vehicles' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'vehicles' ? '#60a5fa' : '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>🚌 Manage Fleet</span>
          <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 10 }}>
            {vehicles.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('drivers')}
          style={{
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: 600,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'drivers' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'drivers' ? '#60a5fa' : '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>👨‍✈️ Manage Drivers</span>
          <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 10 }}>
            {drivers.length}
          </span>
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB 1: SCHEDULER (GANTT CALENDAR)                         */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'scheduler' && (
        <div>
          {/* Controls Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#1e293b',
            padding: '12px 16px',
            borderRadius: 8,
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 12,
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            {/* Month & Year Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={prevMonth}
                style={{ background: '#334155', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
              >
                ◀ Prev
              </button>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#f8fafc', minWidth: 170, textAlign: 'center' }}>
                {MONTH_NAMES[month]} {year}
              </h2>
              <button
                onClick={nextMonth}
                style={{ background: '#334155', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
              >
                Next ▶
              </button>
              <button
                onClick={resetToToday}
                style={{ background: '#0284c7', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                Today
              </button>
            </div>

            {/* Quick search input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="text"
                placeholder="Filter bus or company..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                style={{
                  background: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 6,
                  padding: '6px 12px',
                  color: '#fff',
                  fontSize: 13,
                  outline: 'none',
                  width: 220
                }}
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter('')}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Gantt Calendar View */}
          {vLoading || bLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spinner /></div>
          ) : vError || bError ? (
            <ErrorState message={vError || bError || 'Error loading schedule'} />
          ) : displayedVehicles.length === 0 ? (
            <div style={{
              background: '#1e293b',
              padding: 40,
              borderRadius: 8,
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <p style={{ color: '#94a3b8', fontSize: 15 }}>No vehicles found matching your criteria.</p>
              <Button onClick={() => setShowVehicleModal(true)}>+ Add First Vehicle</Button>
            </div>
          ) : (
            <div style={{
              background: '#0f172a',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.08)',
              overflowX: 'auto',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
                <thead>
                  <tr style={{ background: '#1e293b' }}>
                    <th style={{ ...thStyle, width: 220, position: 'sticky', left: 0, zIndex: 10, background: '#1e293b' }}>
                      Vehicle / Bus
                    </th>
                    {dayNums.map(d => {
                      const dateObj = new Date(year, month, d);
                      const dayOfWeek = dateObj.getDay();
                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                      const isCurrentDay = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
                      return (
                        <th
                          key={d}
                          style={{
                            ...thStyle,
                            textAlign: 'center',
                            minWidth: 34,
                            maxWidth: 42,
                            padding: '6px 2px',
                            background: isCurrentDay ? '#0369a1' : isWeekend ? '#162032' : '#1e293b',
                            color: isCurrentDay ? '#fff' : isWeekend ? '#cbd5e1' : '#94a3b8',
                            borderLeft: '1px solid rgba(255,255,255,0.05)'
                          }}
                        >
                          <div style={{ fontSize: 9, opacity: 0.8 }}>{WEEKDAY_NAMES[dayOfWeek]}</div>
                          <div style={{ fontSize: 12, fontWeight: isCurrentDay ? 800 : 600 }}>{d}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {displayedVehicles.map((v, vIdx) => {
                    return (
                      <tr
                        key={v.id}
                        style={{
                          background: vIdx % 2 === 0 ? 'rgba(30, 41, 59, 0.4)' : 'rgba(15, 23, 42, 0.6)',
                          borderBottom: '1px solid rgba(255,255,255,0.04)'
                        }}
                      >
                        {/* Vehicle Row Header (Sticky Left) */}
                        <td style={{
                          ...tdStyle,
                          position: 'sticky',
                          left: 0,
                          background: vIdx % 2 === 0 ? '#182234' : '#111927',
                          zIndex: 5,
                          borderRight: '1px solid rgba(255,255,255,0.08)',
                          boxShadow: '2px 0 6px rgba(0,0,0,0.2)'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: 13 }}>{v.name}</div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              {v.registrationNo && (
                                <span style={{
                                  background: '#334155',
                                  color: '#e2e8f0',
                                  padding: '1px 5px',
                                  borderRadius: 4,
                                  fontSize: 10,
                                  fontWeight: 600,
                                  letterSpacing: '0.04em'
                                }}>
                                  {v.registrationNo}
                                </span>
                              )}
                              <span style={{ fontSize: 11, color: '#64748b' }}>
                                {v.capacity ? `${v.capacity} seats` : v.type}
                              </span>
                            </div>
                            {v.driver && (
                              <div style={{ fontSize: 10, color: '#38bdf8' }}>
                                👨‍✈️ {v.driver.firstName} {v.driver.lastName}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Calendar Day Grid Cells */}
                        {dayNums.map(d => {
                          const dayBookings = getBookingsForVehicleOnDay(v.id, d);
                          const dateObj = new Date(year, month, d);
                          const dayOfWeek = dateObj.getDay();
                          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                          const isCurrentDay = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

                          return (
                            <td
                              key={d}
                              onClick={() => {
                                if (dayBookings.length === 0) {
                                  openNewBooking(v.id, d);
                                }
                              }}
                              style={{
                                padding: 0,
                                minWidth: 34,
                                maxWidth: 42,
                                height: 48,
                                borderLeft: '1px solid rgba(255,255,255,0.04)',
                                background: isCurrentDay
                                  ? 'rgba(3, 105, 161, 0.15)'
                                  : isWeekend
                                    ? 'rgba(255,255,255,0.02)'
                                    : 'transparent',
                                position: 'relative',
                                cursor: dayBookings.length === 0 ? 'cell' : 'default',
                                verticalAlign: 'middle',
                              }}
                              title={dayBookings.length === 0 ? `Click to book ${v.name} for ${d} ${MONTH_NAMES[month]}` : undefined}
                            >
                              {dayBookings.map(b => {
                                const s = parseLocalDate(b.startDate);
                                const e = parseLocalDate(b.endDate);
                                const isStart = s.getFullYear() === year && s.getMonth() === month && s.getDate() === d;
                                const isEnd = e.getFullYear() === year && e.getMonth() === month && e.getDate() === d;
                                const barColor = b.color || '#2563eb';

                                return (
                                  <div
                                    key={b.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditBooking(b);
                                    }}
                                    style={{
                                      background: barColor,
                                      color: '#ffffff',
                                      fontSize: 10,
                                      fontWeight: 700,
                                      padding: '4px 6px',
                                      margin: '2px 0',
                                      borderRadius: `${isStart ? 5 : 0}px ${isEnd ? 5 : 0}px ${isEnd ? 5 : 0}px ${isStart ? 5 : 0}px`,
                                      cursor: 'pointer',
                                      overflow: 'hidden',
                                      whiteSpace: 'nowrap',
                                      textOverflow: 'ellipsis',
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                      borderTop: '1px solid rgba(255,255,255,0.25)',
                                      lineHeight: 1.3,
                                    }}
                                    title={`${b.company}${b.destination ? ` → ${b.destination}` : ''}\n${b.startDate.split('T')[0]} to ${b.endDate.split('T')[0]}\n${b.driverName ? `Driver: ${b.driverName}` : ''}\n${b.paxCount ? `Pax: ${b.paxCount}` : ''}\n${b.departTime ? `Depart: ${b.departTime}` : ''}\nClick to view / edit / delete`}
                                  >
                                    {isStart ? (
                                      <span>
                                        {b.company}
                                        {b.destination ? ` • ${b.destination}` : ''}
                                      </span>
                                    ) : (
                                      <span style={{ opacity: 0.6 }}>&nbsp;</span>
                                    )}
                                  </div>
                                );
                              })}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Color Legend & Helper */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 14,
            fontSize: 12,
            color: '#64748b',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span>💡 <b>Tip:</b> Click any empty cell to schedule a bus. Click any colored bar to view, edit, or delete.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Color indicators:</span>
              {COLOR_PRESETS.slice(0, 6).map(c => (
                <div key={c.value} style={{ width: 12, height: 12, borderRadius: 3, background: c.value }} title={c.name} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB 2: MANAGE FLEET (VEHICLES)                           */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'vehicles' && (
        <div>
          {vLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spinner /></div>
          ) : vError ? (
            <ErrorState message={vError} />
          ) : vehicles.length === 0 ? (
            <div style={{
              background: '#1e293b',
              padding: 40,
              borderRadius: 8,
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <p style={{ color: '#94a3b8', fontSize: 15 }}>No vehicles registered in the fleet yet.</p>
              <Button onClick={() => setShowVehicleModal(true)}>+ Add First Vehicle</Button>
            </div>
          ) : (
            <div style={{
              background: '#1e293b',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.08)',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0f172a' }}>
                    <th style={thStyle}>Vehicle Name</th>
                    <th style={thStyle}>Registration #</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Capacity</th>
                    <th style={thStyle}>Default Driver</th>
                    <th style={thStyle}>Status</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map(v => (
                    <tr key={v.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>{v.name}</div>
                        {v.notes && <div style={{ fontSize: 11, color: '#64748b' }}>{v.notes}</div>}
                      </td>
                      <td style={tdStyle}>
                        {v.registrationNo ? (
                          <span style={{
                            background: '#334155',
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            fontSize: 12,
                            color: '#e2e8f0'
                          }}>
                            {v.registrationNo}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          background: 'rgba(59, 130, 246, 0.15)',
                          color: '#60a5fa',
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600
                        }}>
                          {v.type}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {v.capacity ? `${v.capacity} Passengers` : '—'}
                      </td>
                      <td style={tdStyle}>
                        {v.driver ? (
                          <span style={{ color: '#38bdf8' }}>
                            👨‍✈️ {v.driver.firstName} {v.driver.lastName}
                          </span>
                        ) : (
                          <span style={{ color: '#64748b' }}>None</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          background: v.isActive !== false ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: v.isActive !== false ? '#34d399' : '#f87171',
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600
                        }}>
                          {v.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteVehicle(v.id, v.name)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.12)',
                            color: '#f87171',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            padding: '5px 10px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TAB 3: MANAGE DRIVERS                                    */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'drivers' && (
        <div>
          {dLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spinner /></div>
          ) : dError ? (
            <ErrorState message={dError} />
          ) : drivers.length === 0 ? (
            <div style={{
              background: '#1e293b',
              padding: 40,
              borderRadius: 8,
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <p style={{ color: '#94a3b8', fontSize: 15 }}>No drivers registered yet.</p>
              <Button onClick={() => setShowDriverModal(true)}>+ Add First Driver</Button>
            </div>
          ) : (
            <div style={{
              background: '#1e293b',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.08)',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0f172a' }}>
                    <th style={thStyle}>Driver Name</th>
                    <th style={thStyle}>Phone</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>License #</th>
                    <th style={thStyle}>Status</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map(d => (
                    <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                          👨‍✈️ {d.firstName} {d.lastName}
                        </div>
                      </td>
                      <td style={tdStyle}>{d.phone || '—'}</td>
                      <td style={tdStyle}>{d.email || '—'}</td>
                      <td style={tdStyle}>
                        {d.licenseNumber ? (
                          <span style={{ background: '#334155', padding: '3px 7px', borderRadius: 4, fontSize: 11, color: '#e2e8f0' }}>
                            {d.licenseNumber}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          background: d.isActive !== false ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: d.isActive !== false ? '#34d399' : '#f87171',
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600
                        }}>
                          {d.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteDriver(d.id, `${d.firstName} ${d.lastName}`)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.12)',
                            color: '#f87171',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            padding: '5px 10px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODAL 1: BOOKING MODAL (CREATE & EDIT)                   */}
      {/* ════════════════════════════════════════════════════════ */}
      {showBookingModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: 24,
            width: '100%',
            maxWidth: 580,
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>
                {editBookingId ? 'Edit Bus Booking' : 'New Bus Booking'}
              </h2>
              <button
                onClick={() => setShowBookingModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {bookingFormError && (
              <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '8px 12px', borderRadius: 6, marginBottom: 14, fontSize: 13 }}>
                {bookingFormError}
              </div>
            )}

            <form onSubmit={handleBookingSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Company / Organization *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TotalEnergies, Standard Chartered, Gold Fields"
                    value={bookingForm.company}
                    onChange={e => setBookingForm({ ...bookingForm, company: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Select Bus / Vehicle *
                  </label>
                  <select
                    required
                    value={bookingForm.vehicleId}
                    onChange={e => setBookingForm({ ...bookingForm, vehicleId: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  >
                    <option value="">-- Choose a Vehicle --</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.registrationNo || 'No plate'}) • {v.capacity ? `${v.capacity} pax` : v.type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Start / Departure Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={bookingForm.startDate}
                    onChange={e => setBookingForm({ ...bookingForm, startDate: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    End / Return Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={bookingForm.endDate}
                    onChange={e => setBookingForm({ ...bookingForm, endDate: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Trip Destination
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cape Coast, Kumasi, Takoradi"
                    value={bookingForm.destination}
                    onChange={e => setBookingForm({ ...bookingForm, destination: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Assigned Driver
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kofi Mensah"
                    value={bookingForm.driverName}
                    onChange={e => setBookingForm({ ...bookingForm, driverName: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Departure Time
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 06:00 AM"
                    value={bookingForm.departTime}
                    onChange={e => setBookingForm({ ...bookingForm, departTime: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Pax Count
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 25"
                    value={bookingForm.paxCount}
                    onChange={e => setBookingForm({ ...bookingForm, paxCount: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  />
                </div>

                {/* ── Color Picker Section ──────────────────────────── */}
                <div style={{ gridColumn: 'span 2', marginTop: 4 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
                    Gantt Color Coding (Choose block color)
                  </label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {COLOR_PRESETS.map(preset => {
                      const isSelected = bookingForm.color === preset.value;
                      return (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => setBookingForm({ ...bookingForm, color: preset.value })}
                          title={preset.name}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background: preset.value,
                            border: isSelected ? '3px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                            boxShadow: isSelected ? '0 0 8px rgba(255,255,255,0.6)' : 'none',
                            cursor: 'pointer',
                            transition: 'transform 0.1s',
                            transform: isSelected ? 'scale(1.15)' : 'scale(1)'
                          }}
                        />
                      );
                    })}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                      <input
                        type="color"
                        value={bookingForm.color || '#2563eb'}
                        onChange={e => setBookingForm({ ...bookingForm, color: e.target.value })}
                        style={{ width: 32, height: 28, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                        title="Pick custom color"
                      />
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>Custom</span>
                    </div>
                  </div>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Notes / Remarks
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Special requirements, contact on ground, etc."
                    value={bookingForm.notes}
                    onChange={e => setBookingForm({ ...bookingForm, notes: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
                {editBookingId ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteBooking(editBookingId)}
                    style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                  >
                    Delete Booking
                  </button>
                ) : <span />}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setShowBookingModal(false)}
                    style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                  >
                    Cancel
                  </button>
                  <Button type="submit" disabled={submittingBooking}>
                    {submittingBooking ? 'Saving…' : editBookingId ? 'Update Booking' : 'Create Booking'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODAL 2: ADD VEHICLE MODAL                               */}
      {/* ════════════════════════════════════════════════════════ */}
      {showVehicleModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: 24,
            width: '100%',
            maxWidth: 480,
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>
                Add New Vehicle / Bus
              </h2>
              <button
                onClick={() => setShowVehicleModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {vehicleFormError && (
              <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '8px 12px', borderRadius: 6, marginBottom: 14, fontSize: 13 }}>
                {vehicleFormError}
              </div>
            )}

            <form onSubmit={handleVehicleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Vehicle Name / Description *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Coaster Bus 03, Luxury Coach 02"
                    value={vehicleForm.name}
                    onChange={e => setVehicleForm({ ...vehicleForm, name: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Registration Plate Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. GN 4521-20, GT 1890-21"
                    value={vehicleForm.registrationNo}
                    onChange={e => setVehicleForm({ ...vehicleForm, registrationNo: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                      Vehicle Type
                    </label>
                    <select
                      value={vehicleForm.type}
                      onChange={e => setVehicleForm({ ...vehicleForm, type: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                    >
                      <option value="BUS">Bus (Coaster / Coach)</option>
                      <option value="VAN">Van (HiAce / Minivan)</option>
                      <option value="SUV_4X4">4x4 SUV</option>
                      <option value="SEDAN">Sedan</option>
                      <option value="BOAT">Boat</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                      Seating Capacity
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 30"
                      value={vehicleForm.capacity}
                      onChange={e => setVehicleForm({ ...vehicleForm, capacity: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Default Driver
                  </label>
                  <select
                    value={vehicleForm.driverId}
                    onChange={e => setVehicleForm({ ...vehicleForm, driverId: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  >
                    <option value="">-- No Driver Assigned --</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.firstName} {d.lastName} ({d.phone || 'No phone'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Air conditioning, luggage space, etc."
                    value={vehicleForm.notes}
                    onChange={e => setVehicleForm({ ...vehicleForm, notes: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setShowVehicleModal(false)}
                  style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                >
                  Cancel
                </button>
                <Button type="submit" disabled={submittingVehicle}>
                  {submittingVehicle ? 'Adding…' : 'Add Vehicle'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODAL 3: ADD DRIVER MODAL                                */}
      {/* ════════════════════════════════════════════════════════ */}
      {showDriverModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: 24,
            width: '100%',
            maxWidth: 480,
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>
                Add New Driver
              </h2>
              <button
                onClick={() => setShowDriverModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {driverFormError && (
              <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '8px 12px', borderRadius: 6, marginBottom: 14, fontSize: 13 }}>
                {driverFormError}
              </div>
            )}

            <form onSubmit={handleDriverSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kwame"
                      value={driverForm.firstName}
                      onChange={e => setDriverForm({ ...driverForm, firstName: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mensah"
                      value={driverForm.lastName}
                      onChange={e => setDriverForm({ ...driverForm, lastName: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +233 24 123 4567"
                    value={driverForm.phone}
                    onChange={e => setDriverForm({ ...driverForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. kwame.mensah@sunseekers.com"
                    value={driverForm.email}
                    onChange={e => setDriverForm({ ...driverForm, email: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Driver's License Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. GHA-98214-B"
                    value={driverForm.licenseNumber}
                    onChange={e => setDriverForm({ ...driverForm, licenseNumber: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setShowDriverModal(false)}
                  style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                >
                  Cancel
                </button>
                <Button type="submit" disabled={submittingDriver}>
                  {submittingDriver ? 'Adding…' : 'Add Driver'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
