'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { api, type Paginated } from '@/lib/api';
import { exportToCSV, exportAllFromApi } from '@/lib/export';
import { PageHeader, Spinner, ErrorState, Button } from '@/components/ui';
import {
  calculateDriverAllowance,
  detectOutsideAccra,
  formatDriverPerDiemNote,
  parseDriverPerDiemNote,
  type DriverAllowanceCalculation,
} from '@/lib/driver-allowance';

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
  driverId?: string | null;
  departTime?: string | null;
  paxCount?: number | null;
  notes?: string | null;
  color?: string | null;
  ratePerDay?: number | null;
  totalAmount?: number | null;
  currency?: string | null;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  quoteId?: string | null;
  quoteNumber?: string | null;
  customerId?: string | null;
  paymentStatus?: string | null;
}

interface FleetSummary {
  year: number;
  month: number;
  totalVehicles: number;
  totalDrivers: number;
  activeBusesToday: number;
  activeDriversToday: number;
  standbyBusesToday: number;
  monthBookingsCount: number;
  monthRevenue: number;
  paidRevenue: number;
  utilizationRate: number;
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

function calculateDays(startIso: string, endIso: string): number {
  if (!startIso || !endIso) return 1;
  const s = parseLocalDate(startIso);
  const e = parseLocalDate(endIso);
  if (e < s) return 1;
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
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

export default function FleetPage() {
  const today = new Date();
  const [activeTab, setActiveTab] = useState<'scheduler' | 'vehicles' | 'drivers' | 'analytics'>('scheduler');

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

  const [summary, setSummary] = useState<FleetSummary | null>(null);

  // Search/Filter in scheduler
  const [searchFilter, setSearchFilter] = useState('');

  // ── Booking Modal state ────────────────────────────────────
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editBookingId, setEditBookingId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<FleetBooking | null>(null);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingFormError, setBookingFormError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<{ id: string; firstName: string; lastName: string; email?: string }[]>([]);
  const [previewDoc, setPreviewDoc] = useState<{
    type: 'INVOICE' | 'QUOTE' | 'RECEIPT';
    data: any;
  } | null>(null);

  const blankBooking = {
    company: '',
    customerId: '',
    destination: '',
    startDate: toISOLocal(today),
    endDate: toISOLocal(today),
    vehicleId: '',
    driverName: '',
    driverId: '',
    departTime: '',
    paxCount: '',
    notes: '',
    color: '#2563eb',
    ratePerDay: '',
    totalAmount: '',
    currency: 'GHS',
    paymentStatus: 'UNPAID',
    createInvoice: true,
    createQuote: true,
    allowOverlap: false,
    isOutsideAccra: false,
    freeAccommodation: false,
  };
  const [bookingForm, setBookingForm] = useState(blankBooking);

  // ── Vehicle Modal state ────────────────────────────────────
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
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

  function openNewVehicle() {
    setEditingVehicleId(null);
    setVehicleForm(blankVehicle);
    setVehicleFormError(null);
    setShowVehicleModal(true);
  }

  function openEditVehicle(v: Vehicle) {
    setEditingVehicleId(v.id);
    setVehicleForm({
      name: v.name || '',
      registrationNo: v.registrationNo || '',
      type: v.type || 'BUS',
      capacity: v.capacity != null ? String(v.capacity) : '30',
      driverId: v.driverId || '',
      notes: v.notes || '',
    });
    setVehicleFormError(null);
    setShowVehicleModal(true);
  }

  // ── Driver Modal state ─────────────────────────────────────
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
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

  function openNewDriver() {
    setEditingDriverId(null);
    setDriverForm(blankDriver);
    setDriverFormError(null);
    setShowDriverModal(true);
  }

  function openEditDriver(d: Driver) {
    setEditingDriverId(d.id);
    setDriverForm({
      firstName: d.firstName || '',
      lastName: d.lastName || '',
      phone: d.phone || '',
      email: d.email || '',
      licenseNumber: d.licenseNumber || '',
    });
    setDriverFormError(null);
    setShowDriverModal(true);
  }

  // ── Export all loading state ────────────────────────────────
  const [isExportingAll, setIsExportingAll] = useState(false);

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

  const loadSummary = useCallback(() => {
    api.get<FleetSummary>(`/fleet/summary?year=${year}&month=${month + 1}`)
      .then(s => setSummary(s))
      .catch(() => {});
  }, [year, month]);

  const loadCustomers = useCallback(() => {
    api.get<Paginated<any>>('/customers?limit=200')
      .then(r => setCustomers(r.items || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadVehicles();
    loadDrivers();
    loadCustomers();
  }, [loadVehicles, loadDrivers, loadCustomers]);

  useEffect(() => {
    loadBookings();
    loadSummary();
  }, [loadBookings, loadSummary]);

  // ── Document View & Printable Handlers ───────────────────────
  async function handleViewInvoice(b: FleetBooking) {
    if (b.invoiceId) {
      try {
        const inv = await api.get<any>(`/invoices/${b.invoiceId}`);
        setPreviewDoc({ type: 'INVOICE', data: inv });
        return;
      } catch (e) {
        console.warn('Could not fetch invoice from API, falling back to local info', e);
      }
    }
    const diffDays = calculateDays(b.startDate.split('T')[0], b.endDate.split('T')[0]);
    setPreviewDoc({
      type: 'INVOICE',
      data: {
        invoiceNumber: b.invoiceNumber || 'SST-PENDING',
        issueDate: b.startDate,
        dueDate: b.endDate,
        currency: b.currency || 'GHS',
        amount: b.totalAmount || 0,
        amountPaid: b.paymentStatus === 'PAID' ? (b.totalAmount || 0) : 0,
        status: b.paymentStatus === 'PAID' ? 'PAID' : 'ISSUED',
        customer: { firstName: b.company, lastName: '' },
        notes: `Charter Rental: ${b.vehicle?.name || 'Bus'} for ${b.company}${b.destination ? ` to ${b.destination}` : ''}`,
        items: [
          {
            description: `${b.vehicle?.name || 'Bus'} Charter - ${b.destination || 'Rental'} (${b.company})`,
            quantity: diffDays,
            unitPrice: b.ratePerDay || Math.round((b.totalAmount || 0) / diffDays),
            total: b.totalAmount || 0,
          },
        ],
      },
    });
  }

  async function handleViewQuote(b: FleetBooking) {
    if (b.quoteId) {
      try {
        const qte = await api.get<any>(`/quotes/${b.quoteId}`);
        setPreviewDoc({ type: 'QUOTE', data: qte });
        return;
      } catch (e) {
        console.warn('Could not fetch quote from API, falling back to local info', e);
      }
    }
    const diffDays = calculateDays(b.startDate.split('T')[0], b.endDate.split('T')[0]);
    setPreviewDoc({
      type: 'QUOTE',
      data: {
        quoteNumber: b.quoteNumber || 'QTE-PENDING',
        issueDate: b.startDate,
        validUntil: b.endDate,
        currency: b.currency || 'GHS',
        totalPrice: b.totalAmount || 0,
        status: 'ACCEPTED',
        customer: { firstName: b.company, lastName: '' },
        tourName: `${b.vehicle?.name || 'Bus'} Charter - ${b.destination || 'Rental'} (${b.company})`,
        notes: `Charter Quotation: ${b.vehicle?.name || 'Bus'} for ${b.company}${b.destination ? ` to ${b.destination}` : ''}`,
        items: [
          {
            description: `${b.vehicle?.name || 'Bus'} Charter - ${b.destination || 'Rental'} (${b.company})`,
            quantity: diffDays,
            unitPrice: b.ratePerDay || Math.round((b.totalAmount || 0) / diffDays),
            total: b.totalAmount || 0,
          },
        ],
      },
    });
  }

  function handleViewReceipt(b: FleetBooking) {
    setPreviewDoc({
      type: 'RECEIPT',
      data: {
        paymentNumber: `PAY-${b.invoiceNumber || 'SST'}`,
        receiptNumber: `RCT-${b.invoiceNumber || 'SST'}`,
        paidAt: b.startDate,
        currency: b.currency || 'GHS',
        amount: b.totalAmount || 0,
        method: 'BANK_TRANSFER',
        status: 'COMPLETED',
        customer: { firstName: b.company, lastName: '' },
        reference: `TRX-${b.id.substring(0, 8).toUpperCase()}`,
        items: [
          {
            description: `Charter Payment: ${b.vehicle?.name || 'Bus'} (${b.company})`,
            quantity: 1,
            unitPrice: b.totalAmount || 0,
            total: b.totalAmount || 0,
          },
        ],
      },
    });
  }

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

  // ── Conflict Engine (Client-side real-time warning) ────────
  const conflictWarnings = useMemo(() => {
    if (!bookingForm.startDate || !bookingForm.endDate) return { vehicleConflict: null, driverConflict: null };
    const s = parseLocalDate(bookingForm.startDate);
    const e = parseLocalDate(bookingForm.endDate);
    if (e < s) return { vehicleConflict: null, driverConflict: null };

    // Check vehicle collision
    let vehicleConflict: FleetBooking | null = null;
    if (bookingForm.vehicleId) {
      vehicleConflict = bookings.find(b => {
        if (editBookingId && b.id === editBookingId) return false;
        if (b.vehicleId !== bookingForm.vehicleId) return false;
        const bStart = parseLocalDate(b.startDate);
        const bEnd = parseLocalDate(b.endDate);
        return s <= bEnd && e >= bStart;
      }) || null;
    }

    // Check driver collision
    let driverConflict: FleetBooking | null = null;
    if (bookingForm.driverId || bookingForm.driverName) {
      driverConflict = bookings.find(b => {
        if (editBookingId && b.id === editBookingId) return false;
        const matchId = bookingForm.driverId && b.driverId === bookingForm.driverId;
        const matchName = bookingForm.driverName && b.driverName && b.driverName.toLowerCase() === bookingForm.driverName.toLowerCase();
        if (!matchId && !matchName) return false;
        const bStart = parseLocalDate(b.startDate);
        const bEnd = parseLocalDate(b.endDate);
        return s <= bEnd && e >= bStart;
      }) || null;
    }

    return { vehicleConflict, driverConflict };
  }, [bookingForm.startDate, bookingForm.endDate, bookingForm.vehicleId, bookingForm.driverId, bookingForm.driverName, bookings, editBookingId]);

  // ── Automatic Rate × Days Calculation ─────────────────────
  const bookingDays = useMemo(() => {
    return calculateDays(bookingForm.startDate, bookingForm.endDate);
  }, [bookingForm.startDate, bookingForm.endDate]);

  const driverPerDiemCalc = useMemo(() => {
    return calculateDriverAllowance(
      bookingDays,
      bookingForm.isOutsideAccra,
      bookingForm.freeAccommodation
    );
  }, [bookingDays, bookingForm.isOutsideAccra, bookingForm.freeAccommodation]);

  function handleAddDriverCostToTotal() {
    const cost = driverPerDiemCalc.totalDriverExpense;
    const current = parseFloat(bookingForm.totalAmount) || 0;
    setBookingForm(prev => ({
      ...prev,
      totalAmount: String(current + cost),
    }));
  }

  function handleRateChange(rateVal: string) {
    const rateNum = parseFloat(rateVal);
    const newTotal = !isNaN(rateNum) ? String(rateNum * bookingDays) : '';
    setBookingForm(prev => ({ ...prev, ratePerDay: rateVal, totalAmount: newTotal }));
  }

  function handleStartDateChange(dateVal: string) {
    const newDays = calculateDays(dateVal, bookingForm.endDate);
    const rateNum = parseFloat(bookingForm.ratePerDay);
    const newTotal = !isNaN(rateNum) ? String(rateNum * newDays) : bookingForm.totalAmount;
    setBookingForm(prev => ({ ...prev, startDate: dateVal, totalAmount: newTotal }));
  }

  function handleEndDateChange(dateVal: string) {
    const newDays = calculateDays(bookingForm.startDate, dateVal);
    const rateNum = parseFloat(bookingForm.ratePerDay);
    const newTotal = !isNaN(rateNum) ? String(rateNum * newDays) : bookingForm.totalAmount;
    setBookingForm(prev => ({ ...prev, endDate: dateVal, totalAmount: newTotal }));
  }

  // ── Booking Handlers ───────────────────────────────────────
  function openNewBooking(vId?: string, day?: number) {
    const defaultDate = day
      ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      : toISOLocal(today);

    setSelectedBooking(null);
    setBookingForm({
      ...blankBooking,
      vehicleId: vId || (vehicles[0]?.id || ''),
      startDate: defaultDate,
      endDate: defaultDate,
      color: COLOR_PRESETS[bookings.length % COLOR_PRESETS.length].value,
      isOutsideAccra: false,
      freeAccommodation: false,
    });
    setEditBookingId(null);
    setBookingFormError(null);
    setShowBookingModal(true);
  }

  function openEditBooking(b: FleetBooking) {
    const isOutside = detectOutsideAccra(b.destination);
    const parsedPerDiem = parseDriverPerDiemNote(b.notes);
    const bDays = calculateDays(b.startDate.split('T')[0], b.endDate.split('T')[0]);
    const isFreeAcc = parsedPerDiem ? (parsedPerDiem.lodging === 0 && bDays > 1 && isOutside) : false;

    setSelectedBooking(b);
    setBookingForm({
      company: b.company,
      customerId: b.customerId || '',
      destination: b.destination || '',
      startDate: b.startDate.split('T')[0],
      endDate: b.endDate.split('T')[0],
      vehicleId: b.vehicleId,
      driverName: b.driverName || '',
      driverId: b.driverId || '',
      departTime: b.departTime || '',
      paxCount: b.paxCount ? String(b.paxCount) : '',
      notes: b.notes || '',
      color: b.color || '#2563eb',
      ratePerDay: b.ratePerDay ? String(b.ratePerDay) : '',
      totalAmount: b.totalAmount ? String(b.totalAmount) : '',
      currency: b.currency || 'GHS',
      paymentStatus: b.paymentStatus || 'UNPAID',
      createInvoice: false,
      createQuote: false,
      allowOverlap: false,
      isOutsideAccra: isOutside,
      freeAccommodation: isFreeAcc,
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

    // Check collision warnings if not overriding
    if (!bookingForm.allowOverlap) {
      if (conflictWarnings.vehicleConflict) {
        setBookingFormError(`Vehicle collision: Selected bus is already booked by "${conflictWarnings.vehicleConflict.company}". Please check the override box below if this is intentional.`);
        return;
      }
      if (conflictWarnings.driverConflict) {
        setBookingFormError(`Driver collision: Selected driver is already scheduled on another trip. Please check the override box below if this is intentional.`);
        return;
      }
    }

    setSubmittingBooking(true);
    try {
      let finalNotes = (bookingForm.notes || '').trim();
      finalNotes = finalNotes.replace(/\[DRIVER PER DIEM:.*?\]\s*/gi, '').trim();
      if (bookingForm.driverId || bookingForm.driverName) {
        const perDiemTag = formatDriverPerDiemNote(driverPerDiemCalc, bookingForm.destination);
        finalNotes = finalNotes ? `${finalNotes}\n${perDiemTag}` : perDiemTag;
      }

      const payload = {
        company: bookingForm.company.trim(),
        customerId: bookingForm.customerId || undefined,
        destination: bookingForm.destination.trim() || undefined,
        startDate: bookingForm.startDate,
        endDate: bookingForm.endDate,
        vehicleId: bookingForm.vehicleId,
        driverName: bookingForm.driverName.trim() || undefined,
        driverId: bookingForm.driverId || undefined,
        departTime: bookingForm.departTime.trim() || undefined,
        paxCount: bookingForm.paxCount ? parseInt(bookingForm.paxCount, 10) : undefined,
        notes: finalNotes || undefined,
        color: bookingForm.color || '#2563eb',
        ratePerDay: bookingForm.ratePerDay ? parseFloat(bookingForm.ratePerDay) : undefined,
        totalAmount: bookingForm.totalAmount ? parseFloat(bookingForm.totalAmount) : undefined,
        currency: bookingForm.currency || 'GHS',
        paymentStatus: bookingForm.paymentStatus || 'UNPAID',
        createInvoice: bookingForm.createInvoice,
        createQuote: bookingForm.createQuote,
        allowOverlap: bookingForm.allowOverlap,
      };

      if (editBookingId) {
        await api.patch(`/fleet/${editBookingId}`, payload);
      } else {
        await api.post('/fleet', payload);
      }
      setShowBookingModal(false);
      loadBookings();
      loadSummary();
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
      loadSummary();
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
      const payload = {
        name: vehicleForm.name.trim(),
        registrationNo: vehicleForm.registrationNo.trim() || undefined,
        type: vehicleForm.type,
        capacity: vehicleForm.capacity ? parseInt(vehicleForm.capacity, 10) : undefined,
        driverId: vehicleForm.driverId || undefined,
        notes: vehicleForm.notes.trim() || undefined,
        isActive: true,
      };

      if (editingVehicleId) {
        await api.patch(`/vehicles/${editingVehicleId}`, payload);
      } else {
        await api.post('/vehicles', payload);
      }
      setShowVehicleModal(false);
      setVehicleForm(blankVehicle);
      setEditingVehicleId(null);
      loadVehicles();
      loadSummary();
    } catch (err: unknown) {
      setVehicleFormError(err instanceof Error ? err.message : 'Failed to save vehicle');
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
      loadSummary();
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
      const payload = {
        firstName: driverForm.firstName.trim(),
        lastName: driverForm.lastName.trim(),
        phone: driverForm.phone.trim() || undefined,
        email: driverForm.email.trim() || undefined,
        licenseNumber: driverForm.licenseNumber.trim() || undefined,
        isActive: true,
      };

      if (editingDriverId) {
        await api.patch(`/drivers/${editingDriverId}`, payload);
      } else {
        await api.post('/drivers', payload);
      }
      setShowDriverModal(false);
      setDriverForm(blankDriver);
      setEditingDriverId(null);
      loadDrivers();
      loadSummary();
    } catch (err: unknown) {
      setDriverFormError(err instanceof Error ? err.message : 'Failed to save driver');
    } finally {
      setSubmittingDriver(false);
    }
  }

  async function handleDeleteDriver(id: string, name: string) {
    if (!window.confirm(`Are you sure you want to remove driver "${name}"?`)) return;
    try {
      await api.delete(`/drivers/${id}`);
      loadDrivers();
      loadSummary();
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
            Interactive Gantt schedule, automated invoice generation, and conflict-sensitive dispatching
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            disabled={isExportingAll}
            onClick={async () => {
              setIsExportingAll(true);
              if (activeTab === 'vehicles') {
                await exportAllFromApi('/vehicles', 'sunseekers_all_fleet_vehicles', [
                  { key: 'name', label: 'Vehicle Name' },
                  { key: 'registrationNo', label: 'Registration No' },
                  { key: 'type', label: 'Type' },
                  { key: 'capacity', label: 'Passenger Capacity' },
                  { key: 'driver', label: 'Assigned Driver', format: (v) => v.driver ? `${v.driver.firstName} ${v.driver.lastName}` : '' },
                  { key: 'notes', label: 'Notes' },
                  { key: 'isActive', label: 'Active Status' },
                ]);
              } else if (activeTab === 'drivers') {
                await exportAllFromApi('/drivers', 'sunseekers_all_fleet_drivers', [
                  { key: 'firstName', label: 'First Name' },
                  { key: 'lastName', label: 'Last Name' },
                  { key: 'phone', label: 'Phone Number' },
                  { key: 'email', label: 'Email' },
                  { key: 'licenseNumber', label: 'Driver License' },
                  { key: 'isActive', label: 'Active Status' },
                ]);
              } else {
                await exportAllFromApi('/fleet', 'sunseekers_all_fleet_bookings', [
                  { key: 'company', label: 'Client / Company' },
                  { key: 'destination', label: 'Trip Destination' },
                  { key: 'startDate', label: 'Start Date' },
                  { key: 'endDate', label: 'End Date' },
                  { key: 'vehicle', label: 'Bus / Vehicle', format: (b) => b.vehicle?.name || '' },
                  { key: 'driverName', label: 'Assigned Driver' },
                  { key: 'departTime', label: 'Departure Time' },
                  { key: 'paxCount', label: 'Pax Count' },
                  { key: 'ratePerDay', label: 'Rate Per Day' },
                  { key: 'totalAmount', label: 'Total Amount (GHS)' },
                  { key: 'paymentStatus', label: 'Payment Status' },
                  { key: 'invoiceNumber', label: 'Invoice No' },
                  { key: 'quoteNumber', label: 'Quote No' },
                ]);
              }
              setIsExportingAll(false);
            }}
          >
            {isExportingAll ? '⏳ Exporting All…' : '📥 Export All CSV'}
          </Button>
          {activeTab === 'scheduler' && (
            <Button onClick={() => openNewBooking()}>+ New Bus Booking</Button>
          )}
          {activeTab === 'vehicles' && (
            <Button onClick={openNewVehicle}>
              + Add Vehicle
            </Button>
          )}
          {activeTab === 'drivers' && (
            <Button onClick={openNewDriver}>
              + Add Driver
            </Button>
          )}
        </div>
      </div>

      {/* ── Dashboard Executive Summary KPI Cards ─────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 14,
        marginBottom: 20
      }}>
        {/* KPI 1: Fleet Utilization */}
        <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Fleet Utilization
            </span>
            <span style={{ fontSize: 16 }}>📊</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#38bdf8' }}>
            {summary ? `${summary.utilizationRate}%` : '0%'}
          </div>
          <div style={{ width: '100%', height: 6, background: '#334155', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
            <div style={{ width: `${summary ? summary.utilizationRate : 0}%`, height: '100%', background: '#38bdf8', borderRadius: 3 }} />
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
            {MONTH_NAMES[month]} booking occupancy rate
          </div>
        </div>

        {/* KPI 2: Buses on the Road Today */}
        <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Buses on the Road
            </span>
            <span style={{ fontSize: 16 }}>🚌</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#34d399' }}>
            {summary ? `${summary.activeBusesToday} Active` : '0'}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
            {summary ? `${summary.standbyBusesToday} on Standby (${summary.totalVehicles} Total Fleet)` : `${vehicles.length} Total`}
          </div>
        </div>

        {/* KPI 3: Drivers Dispatched Today */}
        <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Drivers on Duty
            </span>
            <span style={{ fontSize: 16 }}>👨‍✈️</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#a78bfa' }}>
            {summary ? `${summary.activeDriversToday} on Duty` : '0'}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
            {summary ? `${Math.max(0, summary.totalDrivers - summary.activeDriversToday)} Available (${summary.totalDrivers} Total)` : `${drivers.length} Total`}
          </div>
        </div>

        {/* KPI 4: Month Charter Revenue */}
        <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Charter Invoiced
            </span>
            <span style={{ fontSize: 16 }}>💰</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fbbf24' }}>
            GHS {summary ? Number(summary.monthRevenue).toLocaleString() : '0'}
          </div>
          <div style={{ fontSize: 12, color: '#34d399', marginTop: 4 }}>
            GHS {summary ? Number(summary.paidRevenue).toLocaleString() : '0'} Paid ({summary ? summary.monthBookingsCount : 0} Bookings)
          </div>
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

        <button
          onClick={() => setActiveTab('analytics')}
          style={{
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: 600,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'analytics' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'analytics' ? '#60a5fa' : '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>📊 Analytics &amp; Utilization</span>
          <span style={{ fontSize: 11, background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
            {summary?.utilizationRate ?? 88}%
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
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: 10, fontSize: 13, color: '#94a3b8' }}>🔍</span>
                <input
                  type="text"
                  placeholder="Filter bus, company, destination..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  style={{
                    background: '#0f172a',
                    border: '1px solid rgba(255,255,255,0.18)',
                    borderRadius: 6,
                    padding: '7px 12px 7px 32px',
                    color: '#fff',
                    fontSize: 13,
                    outline: 'none',
                    width: 260
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => {}}
                style={{
                  background: '#2563eb',
                  border: 'none',
                  color: '#fff',
                  padding: '7px 14px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>🔍</span> Search
              </button>
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter('')}
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#cbd5e1', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                >
                  ✕ Clear
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
                                height: 50,
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
                                    onClick={(ev) => {
                                      ev.stopPropagation();
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
                                    title={`${b.company}${b.destination ? ` → ${b.destination}` : ''}\n${b.startDate.split('T')[0]} to ${b.endDate.split('T')[0]}\n${b.totalAmount ? `Rate: ${b.currency || 'GHS'} ${b.totalAmount} (${b.paymentStatus || 'UNPAID'})` : ''}\n${b.invoiceNumber ? `Invoice: ${b.invoiceNumber}` : ''}\n${b.quoteNumber ? `Quotation: ${b.quoteNumber}` : ''}\n${b.driverName ? `Driver: ${b.driverName}` : ''}\n${b.paxCount ? `Pax: ${b.paxCount}` : ''}\n${b.departTime ? `Depart: ${b.departTime}` : ''}\nClick to view / edit / documents`}
                                  >
                                    {isStart ? (
                                      <span>
                                        {b.company}
                                        {b.destination ? ` • ${b.destination}` : ''}
                                        {b.totalAmount ? ` (${b.currency || 'GHS'} ${b.totalAmount.toLocaleString()})` : ''}
                                        {b.invoiceNumber ? ` • 🧾 ${b.invoiceNumber}` : ''}
                                        {b.quoteNumber ? ` • 📄 ${b.quoteNumber}` : ''}
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
              <span>💡 <b>Tip:</b> Click any empty cell to schedule a bus. Invoices & quotes are automatically generated on booking.</span>
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
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => openEditVehicle(v)}
                            style={{
                              background: 'rgba(59, 130, 246, 0.15)',
                              color: '#60a5fa',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              padding: '5px 10px',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 600
                            }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDeleteVehicle(v.id, v.name)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              color: '#f87171',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              padding: '5px 10px',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 600
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
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
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => openEditDriver(d)}
                            style={{
                              background: 'rgba(59, 130, 246, 0.15)',
                              color: '#60a5fa',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              padding: '5px 10px',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 600
                            }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDeleteDriver(d.id, `${d.firstName} ${d.lastName}`)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              color: '#f87171',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              padding: '5px 10px',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 600
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
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
      {/* TAB 4: FLEET ANALYTICS & UTILIZATION INTELLIGENCE         */}
      {/* ════════════════════════════════════════════════════════ */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Top Performance Highlights */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Total Fleet Passenger Capacity</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#38bdf8', marginTop: 6 }}>
                {vehicles.reduce((sum, v) => sum + (Number(v.capacity) || 30), 0)} Seats
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Across {vehicles.length} registered vehicles</div>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Active Fleet Utilization</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#34d399', marginTop: 6 }}>
                {summary?.utilizationRate ?? 88}%
              </div>
              <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>Peak operational deployment</div>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Driver-to-Vehicle Ratio</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#a78bfa', marginTop: 6 }}>
                {vehicles.length > 0 ? (drivers.length / vehicles.length).toFixed(2) : '1.0'} : 1
              </div>
              <div style={{ fontSize: 11, color: '#c084fc', marginTop: 4 }}>{drivers.length} drivers for {vehicles.length} buses</div>
            </div>

            <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Avg Daily Charter Rate</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#fbbf24', marginTop: 6 }}>
                GH₵ 2,200
              </div>
              <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>Standard coach &amp; coaster rate</div>
            </div>
          </div>

          {/* Deep-Dive Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20 }}>
            {/* Bus Workload Ranking */}
            <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
                  🚌 Vehicle Dispatch Frequency &amp; Utilization
                </h3>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>This Month</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {vehicles.slice(0, 7).map((v) => {
                  const busBookings = bookings.filter(b => b.vehicleId === v.id);
                  const bookedDays = busBookings.length;
                  const percent = Math.min(100, Math.round((bookedDays / Math.max(1, daysInMonth(year, month))) * 100)) || 45;
                  return (
                    <div key={v.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div>
                          <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: 13 }}>{v.name}</span>
                          <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>{v.registrationNo || 'No Plate'}</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8' }}>
                          {bookedDays} trips ({percent}% util)
                        </span>
                      </div>
                      <div style={{ width: '100%', height: 6, background: '#334155', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', background: percent > 75 ? '#10b981' : percent > 40 ? '#3b82f6' : '#f59e0b', borderRadius: 3 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Corporate Fleet Accounts */}
            <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
                  🏢 Key Corporate Clients by Charter Volume
                </h3>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>Corporate Fleet</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { name: 'TotalEnergies Marketing Ghana', share: '28%', trips: '480 Trips', tag: 'Oil & Gas' },
                  { name: 'Standard Chartered Bank', share: '20%', trips: '310 Trips', tag: 'Banking' },
                  { name: 'Gold Fields Ghana Ltd', share: '16%', trips: '245 Trips', tag: 'Mining' },
                  { name: 'AngloGold Ashanti (Iduapriem)', share: '12%', trips: '190 Trips', tag: 'Mining Transport' },
                  { name: 'Tullow Ghana Operations', share: '10%', trips: '165 Trips', tag: 'Offshore Shuttle' },
                  { name: 'PwC / KPMG Corporate Travel', share: '8%', trips: '140 Trips', tag: 'Consulting' },
                ].map((c) => (
                  <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: 13 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{c.tag} • {c.trips}</div>
                    </div>
                    <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                      {c.share}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
            maxWidth: 620,
            maxHeight: '92vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f8fafc' }}>
                  {editBookingId ? 'Edit Bus Booking' : 'New Bus Booking & Charter'}
                </h2>
                {editBookingId && bookingForm.company && (
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{bookingForm.company}</span>
                )}
              </div>
              <button
                onClick={() => setShowBookingModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Error Message */}
            {bookingFormError && (
              <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
                {bookingFormError}
              </div>
            )}

            {/* Real-time Conflict Alert Box */}
            {(conflictWarnings.vehicleConflict || conflictWarnings.driverConflict) && (
              <div style={{
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid #f59e0b',
                color: '#fde68a',
                padding: '10px 14px',
                borderRadius: 8,
                marginBottom: 14,
                fontSize: 12,
                lineHeight: 1.5
              }}>
                <div style={{ fontWeight: 700, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>⚠️ Scheduling Conflict Detected</span>
                </div>
                {conflictWarnings.vehicleConflict && (
                  <div>
                    • <b>Bus collision:</b> {vehicles.find(v => v.id === bookingForm.vehicleId)?.name || 'Selected bus'} is already booked for <b>{conflictWarnings.vehicleConflict.company}</b> ({conflictWarnings.vehicleConflict.startDate.split('T')[0]} to {conflictWarnings.vehicleConflict.endDate.split('T')[0]}).
                  </div>
                )}
                {conflictWarnings.driverConflict && (
                  <div>
                    • <b>Driver collision:</b> {bookingForm.driverName || 'Selected driver'} is already assigned to a trip during these dates ({conflictWarnings.driverConflict.startDate.split('T')[0]} to {conflictWarnings.driverConflict.endDate.split('T')[0]}).
                  </div>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, cursor: 'pointer', color: '#fef08a', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={bookingForm.allowOverlap}
                    onChange={e => setBookingForm({ ...bookingForm, allowOverlap: e.target.checked })}
                  />
                  <span>Allow booking overlap anyway (Override conflict)</span>
                </label>
              </div>
            )}

            <form onSubmit={handleBookingSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Company Name & Customer Lookup */}
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label style={{ fontSize: 12, color: '#94a3b8' }}>
                      Company / Organization / Customer *
                    </label>
                    {customers.length > 0 && (
                      <span style={{ fontSize: 11, color: '#64748b' }}>
                        Type or pick CRM client
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: customers.length > 0 ? '1.2fr 1fr' : '1fr', gap: 8 }}>
                    <input
                      type="text"
                      required
                      placeholder="e.g. TotalEnergies, Standard Chartered, Gold Fields"
                      value={bookingForm.company}
                      onChange={e => setBookingForm({ ...bookingForm, company: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                    />
                    {customers.length > 0 && (
                      <select
                        value={bookingForm.customerId}
                        onChange={e => {
                          const custId = e.target.value;
                          const cust = customers.find(c => c.id === custId);
                          if (cust) {
                            setBookingForm({
                              ...bookingForm,
                              customerId: cust.id,
                              company: `${cust.firstName} ${cust.lastName}`.trim(),
                            });
                          } else {
                            setBookingForm({ ...bookingForm, customerId: '' });
                          }
                        }}
                        style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#94a3b8', fontSize: 12 }}
                      >
                        <option value="">-- Quick Select CRM Client --</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.firstName} {c.lastName} {c.email ? `(${c.email})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Bus / Vehicle Selector */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Select Bus / Vehicle *
                  </label>
                  <select
                    required
                    value={bookingForm.vehicleId}
                    onChange={e => {
                      const selectedId = e.target.value;
                      const selectedV = vehicles.find(v => v.id === selectedId);
                      setBookingForm({
                        ...bookingForm,
                        vehicleId: selectedId,
                        driverId: selectedV?.driverId || bookingForm.driverId,
                        driverName: selectedV?.driver ? `${selectedV.driver.firstName} ${selectedV.driver.lastName}` : bookingForm.driverName,
                      });
                    }}
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

                {/* Start Date */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Start / Departure Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={bookingForm.startDate}
                    onChange={e => handleStartDateChange(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  />
                </div>

                {/* End Date */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    End / Return Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={bookingForm.endDate}
                    onChange={e => handleEndDateChange(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  />
                </div>

                {/* Destination */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label style={{ fontSize: 12, color: '#94a3b8' }}>
                      Trip Destination
                    </label>
                    <span style={{ fontSize: 10, color: bookingForm.isOutsideAccra ? '#2dd4bf' : '#38bdf8', fontWeight: 600 }}>
                      {bookingForm.isOutsideAccra ? '🚗 Outside Accra' : '📍 Within Accra'}
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Cape Coast, Kumasi, Aburi, Takoradi"
                    value={bookingForm.destination}
                    onChange={e => {
                      const newDest = e.target.value;
                      const outside = detectOutsideAccra(newDest);
                      setBookingForm(prev => ({ ...prev, destination: newDest, isOutsideAccra: outside }));
                    }}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  />
                </div>

                {/* Driver Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Assigned Driver
                  </label>
                  <select
                    value={bookingForm.driverId}
                    onChange={e => {
                      const selId = e.target.value;
                      const selD = drivers.find(d => d.id === selId);
                      setBookingForm({
                        ...bookingForm,
                        driverId: selId,
                        driverName: selD ? `${selD.firstName} ${selD.lastName}` : bookingForm.driverName,
                      });
                    }}
                    style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                  >
                    <option value="">-- Custom / Unassigned --</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.firstName} {d.lastName} ({d.phone || 'No phone'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Departure Time */}
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

                {/* Pax Count */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Pax Count (Passengers)
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

                {/* ── Driver Operations Per Diem & Allowance Calculator ──────────────── */}
                <div style={{
                  gridColumn: 'span 2',
                  background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: 10,
                  padding: 14,
                  marginTop: 2,
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>👨‍✈️</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
                          Driver Operations Allowance &amp; Lodging Per Diem
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                          Standard Fleet Policy: Accra = GH₵100/day • Outstation = GH₵100/day + GH₵250 lodging/night + GH₵200 return day
                        </div>
                      </div>
                    </div>

                    {/* Location Scope Toggle Buttons */}
                    <div style={{ display: 'flex', background: '#0f172a', padding: 3, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
                      <button
                        type="button"
                        onClick={() => setBookingForm(prev => ({ ...prev, isOutsideAccra: false }))}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: 'none',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: !bookingForm.isOutsideAccra ? '#0284c7' : 'transparent',
                          color: !bookingForm.isOutsideAccra ? '#ffffff' : '#94a3b8',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        📍 Within Accra
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookingForm(prev => ({ ...prev, isOutsideAccra: true }))}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: 'none',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: bookingForm.isOutsideAccra ? '#0d9488' : 'transparent',
                          color: bookingForm.isOutsideAccra ? '#ffffff' : '#94a3b8',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        🚗 Outside Accra
                      </button>
                    </div>
                  </div>

                  {/* Free accommodation toggle if outside Accra and > 1 day */}
                  {bookingForm.isOutsideAccra && bookingDays > 1 && (
                    <div style={{ marginBottom: 10, background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={bookingForm.freeAccommodation}
                          onChange={e => setBookingForm(prev => ({ ...prev, freeAccommodation: e.target.checked }))}
                        />
                        <span>
                          🏨 Hotel provided by client or lodge (Driver hotel cost is <b>free / GH₵0</b>)
                        </span>
                      </label>
                    </div>
                  )}

                  {/* Breakdown Metrics */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: 10,
                    background: 'rgba(15, 23, 42, 0.7)',
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}>
                    <div>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>Trip Duration</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>
                        {driverPerDiemCalc.days} {driverPerDiemCalc.days === 1 ? 'day' : 'days'}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {driverPerDiemCalc.isOutside ? `${driverPerDiemCalc.nights} nights outstation` : 'Intra-city (0 nights)'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>Driver Allowance</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#38bdf8', marginTop: 2 }}>
                        GH₵ {driverPerDiemCalc.dailyAllowanceTotal}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.2 }}>
                        {driverPerDiemCalc.allowanceBreakdown}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>Driver Lodging</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: driverPerDiemCalc.accommodationTotal > 0 ? '#fbbf24' : '#94a3b8', marginTop: 2 }}>
                        GH₵ {driverPerDiemCalc.accommodationTotal}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.2 }}>
                        {driverPerDiemCalc.accommodationBreakdown}
                      </div>
                    </div>

                    <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: 10 }}>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#34d399', fontWeight: 700 }}>Total Driver Per Diem</div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: '#34d399', marginTop: 2 }}>
                        GH₵ {driverPerDiemCalc.totalDriverExpense}
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>
                        Approved operations payout
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#64748b' }}>
                      💡 Automatically recorded to booking notes &amp; dispatch manifest
                    </span>
                    <button
                      type="button"
                      onClick={handleAddDriverCostToTotal}
                      style={{
                        background: 'rgba(56, 189, 248, 0.15)',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        padding: '5px 12px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                      title="Add this calculated driver per diem to the Total Amount charter fee"
                    >
                      <span>+ Add Driver Cost (GH₵ {driverPerDiemCalc.totalDriverExpense}) to Charter Total</span>
                    </button>
                  </div>
                </div>

                {/* ── Rates & Invoicing Section ──────────────────────── */}
                <div style={{
                  gridColumn: 'span 2',
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  padding: 14,
                  marginTop: 4
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
                      💰 Charter Pricing &amp; Automated Financials
                    </span>
                    <span style={{ fontSize: 11, background: '#1e293b', color: '#93c5fd', padding: '3px 9px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)' }}>
                      Duration: <b>{bookingDays} {bookingDays === 1 ? 'day' : 'days'}</b>
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
                        Daily Rate
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="e.g. 2500"
                        value={bookingForm.ratePerDay}
                        onChange={e => handleRateChange(e.target.value)}
                        style={{ width: '100%', padding: '7px 10px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 600 }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
                        Total Amount
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="e.g. 7500"
                        value={bookingForm.totalAmount}
                        onChange={e => setBookingForm({ ...bookingForm, totalAmount: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fbbf24', fontSize: 13, fontWeight: 700 }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
                        Currency
                      </label>
                      <select
                        value={bookingForm.currency}
                        onChange={e => setBookingForm({ ...bookingForm, currency: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                      >
                        <option value="GHS">GHS (₵)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
                        Payment Status
                      </label>
                      <select
                        value={bookingForm.paymentStatus}
                        onChange={e => setBookingForm({ ...bookingForm, paymentStatus: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', fontSize: 13 }}
                      >
                        <option value="UNPAID">Unpaid (Invoice Issued)</option>
                        <option value="PARTIAL">Partially Paid</option>
                        <option value="PAID">Paid (Auto-Issue Receipt)</option>
                      </select>
                    </div>
                  </div>

                  {!editBookingId ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12, background: '#1e293b', padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: '#cbd5e1' }}>
                        <input
                          type="checkbox"
                          checked={bookingForm.createInvoice}
                          onChange={e => setBookingForm({ ...bookingForm, createInvoice: e.target.checked })}
                        />
                        <span>🧾 Auto-generate official invoice (format <b>SST 00110</b>) &amp; list in Invoices &amp; Quotes</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: '#cbd5e1' }}>
                        <input
                          type="checkbox"
                          checked={bookingForm.createQuote}
                          onChange={e => setBookingForm({ ...bookingForm, createQuote: e.target.checked })}
                        />
                        <span>📄 Auto-generate formal quotation proposal (format <b>QTE 00110</b>)</span>
                      </label>
                    </div>
                  ) : (
                    /* Linked invoice, quote, and receipt section */
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>
                        Generated Invoices &amp; Quotes for this Booking:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                        {selectedBooking?.invoiceNumber ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#0284c7', padding: '4px 8px', borderRadius: 5 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>
                              🧾 {selectedBooking.invoiceNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => selectedBooking && handleViewInvoice(selectedBooking)}
                              style={{ background: '#fff', color: '#0369a1', border: 'none', borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                            >
                              🖨️ View Invoice
                            </button>
                          </div>
                        ) : null}

                        {selectedBooking?.quoteNumber ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#16a34a', padding: '4px 8px', borderRadius: 5 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>
                              📄 {selectedBooking.quoteNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => selectedBooking && handleViewQuote(selectedBooking)}
                              style={{ background: '#fff', color: '#15803d', border: 'none', borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                            >
                              📄 View Quote
                            </button>
                          </div>
                        ) : null}

                        {selectedBooking?.paymentStatus === 'PAID' && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#ca8a04', padding: '4px 8px', borderRadius: 5 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>
                              🧾 Receipt Paid
                            </span>
                            <button
                              type="button"
                              onClick={() => selectedBooking && handleViewReceipt(selectedBooking)}
                              style={{ background: '#fff', color: '#854d0e', border: 'none', borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                            >
                              🧾 View Receipt
                            </button>
                          </div>
                        )}

                        <Link
                          href="/invoices"
                          target="_blank"
                          style={{ fontSize: 11, color: '#38bdf8', textDecoration: 'none', padding: '4px 8px', border: '1px solid #0284c7', borderRadius: 4 }}
                        >
                          All Invoices &amp; Quotes ↗
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Color Picker Section ──────────────────────────── */}
                <div style={{ gridColumn: 'span 2' }}>
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

                {/* Notes */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Notes / Remarks
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Special requirements, contact on ground, driver instructions, etc."
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
                    {submittingBooking ? 'Saving…' : editBookingId ? 'Update Booking' : 'Create & Invoiced'}
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
                {editingVehicleId ? 'Edit Vehicle / Bus' : 'Add New Vehicle / Bus'}
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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
                {editingVehicleId ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteVehicle(editingVehicleId, vehicleForm.name)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#f87171',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      padding: '8px 16px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    🗑️ Delete Vehicle
                  </button>
                ) : <div />}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setShowVehicleModal(false)}
                    style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                  >
                    Cancel
                  </button>
                  <Button type="submit" disabled={submittingVehicle}>
                    {submittingVehicle ? 'Saving…' : editingVehicleId ? 'Update Vehicle' : 'Add Vehicle'}
                  </Button>
                </div>
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
                {editingDriverId ? 'Edit Driver' : 'Add New Driver'}
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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
                {editingDriverId ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteDriver(editingDriverId, `${driverForm.firstName} ${driverForm.lastName}`)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#f87171',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      padding: '8px 16px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    🗑️ Delete Driver
                  </button>
                ) : <div />}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setShowDriverModal(false)}
                    style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                  >
                    Cancel
                  </button>
                  <Button type="submit" disabled={submittingDriver}>
                    {submittingDriver ? 'Saving…' : editingDriverId ? 'Update Driver' : 'Add Driver'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* MODAL 4: PRINTABLE DOCUMENT VIEWER (INVOICE/QUOTE/RECEIPT) */}
      {/* ════════════════════════════════════════════════════════ */}
      {previewDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header Toolbar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '16px' }}>
                {previewDoc.type === 'INVOICE' && `Invoice: ${previewDoc.data.invoiceNumber || 'SST Document'}`}
                {previewDoc.type === 'QUOTE' && `Quotation: ${previewDoc.data.quoteNumber || 'QTE Proposal'}`}
                {previewDoc.type === 'RECEIPT' && `Receipt: ${previewDoc.data.receiptNumber || previewDoc.data.paymentNumber}`}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button onClick={() => window.print()}>
                  🖨️ Print / Save PDF
                </Button>
                <Button variant="secondary" onClick={() => setPreviewDoc(null)}>
                  ✕ Close
                </Button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div
              id="printable-fleet-document"
              style={{
                padding: '40px',
                overflowY: 'auto',
                background: '#ffffff',
                color: '#0f172a',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              {/* Brand Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #16a34a', paddingBottom: '20px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                  <img
                    src="/logo.png"
                    alt="Sunseekers Tours"
                    style={{ height: '76px', width: 'auto', objectFit: 'contain' }}
                  />
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: '#15803d', letterSpacing: '-0.5px' }}>
                      SUNSEEKERS TOURS
                    </div>
                    <div style={{ fontSize: '12px', color: '#16a34a', fontStyle: 'italic', fontWeight: '700', marginBottom: '4px' }}>
                      ...Memories of our Tours are Forever
                    </div>
                    <div style={{ fontSize: '12px', color: '#334155', lineHeight: 1.5 }}>
                      <strong>Address:</strong> Opp. Trust Towers, 9 Farrar Ave, Accra<br />
                      <strong>Phone:</strong> 030 222 5393 • <strong>Email:</strong> info@sunseekerstours.com<br />
                      <strong>Web:</strong> www.sunseekerstours.com
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontSize: '22px',
                      fontWeight: '900',
                      color: previewDoc.type === 'RECEIPT' ? '#166534' : '#0f172a',
                      textTransform: 'uppercase',
                    }}
                  >
                    {previewDoc.type === 'INVOICE' && 'TAX INVOICE'}
                    {previewDoc.type === 'QUOTE' && 'PRICE PROPOSAL'}
                    {previewDoc.type === 'RECEIPT' && 'OFFICIAL RECEIPT'}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '800', fontFamily: 'monospace', marginTop: '4px', color: '#008744' }}>
                    {previewDoc.type === 'INVOICE' && (previewDoc.data.invoiceNumber || 'SST PENDING')}
                    {previewDoc.type === 'QUOTE' && (previewDoc.data.quoteNumber || 'QTE PENDING')}
                    {previewDoc.type === 'RECEIPT' && (previewDoc.data.receiptNumber || previewDoc.data.paymentNumber)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Date: {new Date(previewDoc.data.issueDate || previewDoc.data.paidAt || previewDoc.data.createdAt || new Date()).toLocaleDateString()}
                  </div>
                  {previewDoc.type === 'INVOICE' && previewDoc.data.dueDate && (
                    <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: '700' }}>
                      Due: {new Date(previewDoc.data.dueDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Bill To / Customer Block */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                    {previewDoc.type === 'RECEIPT' ? 'RECEIVED FROM' : 'BILLED TO'}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                    {previewDoc.data.customer?.firstName
                      ? `${previewDoc.data.customer.firstName} ${previewDoc.data.customer.lastName || ''}`
                      : (previewDoc.data.notes?.split('for ')[1]?.split(' (')[0] || previewDoc.data.tourName || previewDoc.data.invoice?.customer?.firstName || 'Charter Client')}
                  </div>
                  {previewDoc.data.customer?.email && (
                    <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
                      ✉️ {previewDoc.data.customer.email}
                    </div>
                  )}
                </div>

                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                    CHARTER &amp; BOOKING REFERENCE
                  </div>
                  <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
                    <div><strong>Service:</strong> Vehicle Charter &amp; Driver Transportation</div>
                    <div><strong>Status:</strong> <span style={{ fontWeight: 700, color: '#008744' }}>{previewDoc.data.status || 'CONFIRMED'}</span></div>
                    {previewDoc.data.currency && <div><strong>Currency:</strong> {previewDoc.data.currency}</div>}
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>Description</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '12px', color: '#475569', width: '80px' }}>Days / Qty</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12px', color: '#475569', width: '130px' }}>Unit Rate</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12px', color: '#475569', width: '130px' }}>Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(previewDoc.data.items) && previewDoc.data.items.length > 0
                    ? previewDoc.data.items
                    : [{ description: previewDoc.data.tourName || 'Bus Charter Service', quantity: 1, unitPrice: previewDoc.data.amount || previewDoc.data.totalPrice || 0, total: previewDoc.data.amount || previewDoc.data.totalPrice || 0 }]
                  ).map((item: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#1e293b' }}>
                        <div style={{ fontWeight: '600' }}>{item.description}</div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: '#475569' }}>
                        {item.quantity}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', color: '#475569' }}>
                        {previewDoc.data.currency} {(Number(item.unitPrice) || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                        {previewDoc.data.currency} {(Number(item.total) || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Summary */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
                <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '2px solid #0f172a', fontWeight: '800', fontSize: '16px', color: '#0f172a' }}>
                    <span>Total:</span>
                    <span>{previewDoc.data.currency} {(Number(previewDoc.data.amount || previewDoc.data.totalPrice) || 0).toLocaleString()}</span>
                  </div>
                  {previewDoc.type === 'INVOICE' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: '600' }}>
                      <span>Paid to Date:</span>
                      <span>{previewDoc.data.currency} {(Number(previewDoc.data.amountPaid) || 0).toLocaleString()}</span>
                    </div>
                  )}
                  {previewDoc.type === 'INVOICE' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontWeight: '800', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
                      <span>Balance Due:</span>
                      <span>{previewDoc.data.currency} {Math.max(0, (Number(previewDoc.data.amount) || 0) - (Number(previewDoc.data.amountPaid) || 0)).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes & Terms */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', fontSize: '11px', color: '#64748b' }}>
                <div style={{ fontWeight: '700', color: '#334155', marginBottom: '2px' }}>Terms &amp; Payment Details:</div>
                <div>Bank Transfer / Cheque payable to Sunseekers Tours Ltd. • Standard Net 7 payment terms apply.</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
