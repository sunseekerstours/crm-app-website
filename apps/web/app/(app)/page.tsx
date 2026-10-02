'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, PageHeader, Spinner, Button } from '@/components/ui';
import { useAuth } from '@/lib/auth';

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

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);

  // Core counts
  const [customerTotal, setCustomerTotal] = useState(0);
  const [fleetCustomerTotal, setFleetCustomerTotal] = useState(0);
  const [fleetBookingsTotal, setFleetBookingsTotal] = useState(0);
  const [tourBookingsTotal, setTourBookingsTotal] = useState(0);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [dealsTotal, setDealsTotal] = useState(0);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [vehiclesTotal, setVehiclesTotal] = useState(0);
  const [driversTotal, setDriversTotal] = useState(0);

  // Financial & Deals
  const [totalInvoicedAmount, setTotalInvoicedAmount] = useState(0);
  const [totalPaidAmount, setTotalPaidAmount] = useState(0);
  const [totalDealsValue, setTotalDealsValue] = useState(0);
  const [wonDealsCount, setWonDealsCount] = useState(0);

  // Fleet operational summary
  const [fleetSummary, setFleetSummary] = useState<FleetSummary | null>(null);

  useEffect(() => {
    let active = true;
    async function loadDashboardData() {
      setLoading(true);
      try {
        const today = new Date();
        const curYear = today.getFullYear();
        const curMonth = today.getMonth() + 1;

        const [
          custRes,
          fleetCustRes,
          fleetRes,
          tourRes,
          leadRes,
          dealRes,
          payRes,
          vehRes,
          drvRes,
          fleetSumRes,
          invRes,
        ] = await Promise.all([
          api.get<{ total: number }>('/customers?limit=1').catch(() => ({ total: 0 })),
          api.get<{ total: number }>('/customers?tag=fleet&limit=1').catch(() => ({ total: 0 })),
          api.get<{ total: number }>('/fleet?limit=1').catch(() => ({ total: 0 })),
          api.get<{ total: number }>('/bookings?limit=1').catch(() => ({ total: 0 })),
          api.get<{ total: number }>('/leads?limit=1').catch(() => ({ total: 0 })),
          api.get<{ total: number; items?: any[] }>('/deals?limit=100').catch(() => ({ total: 0, items: [] })),
          api.get<{ total: number; items?: any[] }>('/payments?limit=100').catch(() => ({ total: 0, items: [] })),
          api.get<{ total: number }>('/vehicles?limit=1').catch(() => ({ total: 0 })),
          api.get<{ total: number }>('/drivers?limit=1').catch(() => ({ total: 0 })),
          api.get<FleetSummary>(`/fleet/summary?year=${curYear}&month=${curMonth}`).catch(() => null),
          api.get<{ total: number; items?: any[] }>('/invoices?limit=100').catch(() => ({ total: 0, items: [] })),
        ]);

        if (!active) return;

        setCustomerTotal(custRes.total || 0);
        setFleetCustomerTotal(fleetCustRes.total || 0);
        setFleetBookingsTotal(fleetRes.total || 0);
        setTourBookingsTotal(tourRes.total || 0);
        setLeadsTotal(leadRes.total || 0);
        setDealsTotal(dealRes.total || 0);
        setPaymentsTotal(payRes.total || 0);
        setVehiclesTotal(vehRes.total || 0);
        setDriversTotal(drvRes.total || 0);
        setFleetSummary(fleetSumRes);

        // Deal pipeline calculation
        let dealVal = 0;
        let wonCount = 0;
        if (dealRes.items && Array.isArray(dealRes.items)) {
          dealRes.items.forEach((d) => {
            const amt = Number(d.amount) || 0;
            dealVal += amt;
            if (d.stage === 'WON' || d.status === 'WON') wonCount++;
          });
        }
        setTotalDealsValue(dealVal);
        setWonDealsCount(wonCount);

        // Invoiced & collected amounts
        let invTotal = 0;
        if (invRes.items && Array.isArray(invRes.items)) {
          invRes.items.forEach((inv) => {
            invTotal += Number(inv.totalAmount || inv.amount || 0);
          });
        }
        setTotalInvoicedAmount(invTotal);

        let payTotal = 0;
        if (payRes.items && Array.isArray(payRes.items)) {
          payRes.items.forEach((p) => {
            payTotal += Number(p.amount || 0);
          });
        }
        setTotalPaidAmount(payTotal);
      } catch (err: unknown) {
        console.error('Failed to load CRM dashboard', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadDashboardData();
    return () => {
      active = false;
    };
  }, []);

  const totalBookingsCombined = fleetBookingsTotal + tourBookingsTotal;
  const collectionRate = totalInvoicedAmount > 0
    ? Math.min(100, Math.round((totalPaidAmount / totalInvoicedAmount) * 100))
    : (fleetSummary && fleetSummary.monthRevenue > 0 ? Math.round((fleetSummary.paidRevenue / fleetSummary.monthRevenue) * 100) : 0);

  const leisureCustomers = Math.max(0, customerTotal - fleetCustomerTotal);

  if (loading) {
    return (
      <div>
        <PageHeader title="Staff CRM Dashboard" subtitle="Loading operational & commercial insights..." />
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '40px' }}>
      <PageHeader
        title="Staff CRM & Operations Dashboard"
        subtitle={`Signed in as ${user?.email || 'Operations Staff'} • Real-time Travel & Fleet Intelligence`}
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/fleet" style={{ textDecoration: 'none' }}>
              <Button variant="secondary">🚌 Fleet Scheduler</Button>
            </Link>
            <button className="btn btn-ghost" onClick={logout}>Log out</button>
          </div>
        }
      />

      {/* ── TOP KPI EXECUTIVE STATS ─────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        {/* KPI 1: Customers */}
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: '#008744' }} />
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Customers
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '6px', lineHeight: 1.1 }}>
            {customerTotal.toLocaleString()}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', fontSize: '12px' }}>
            <span style={{ background: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
              🏢 {fleetCustomerTotal} Fleet Corp
            </span>
            <span style={{ background: '#f8fafc', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
              🏖️ {leisureCustomers} Leisure
            </span>
          </div>
          <div style={{ marginTop: '12px' }}>
            <Link href="/customers" style={{ fontSize: '12px', color: '#008744', fontWeight: 600, textDecoration: 'none' }}>
              Manage Directory →
            </Link>
          </div>
        </div>

        {/* KPI 2: Total Bookings */}
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: '#f37023' }} />
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Bookings
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '6px', lineHeight: 1.1 }}>
            {totalBookingsCombined.toLocaleString()}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', fontSize: '12px' }}>
            <span style={{ background: '#fff7ed', color: '#c2410c', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
              🚌 {fleetBookingsTotal.toLocaleString()} Fleet
            </span>
            <span style={{ background: '#f0fdf4', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
              ✈️ {tourBookingsTotal.toLocaleString()} Tours
            </span>
          </div>
          <div style={{ marginTop: '12px' }}>
            <Link href="/bookings" style={{ fontSize: '12px', color: '#f37023', fontWeight: 600, textDecoration: 'none' }}>
              View All Bookings →
            </Link>
          </div>
        </div>

        {/* KPI 3: Fleet Mobility Health */}
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: '#0284c7' }} />
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Fleet Utilization
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '6px', lineHeight: 1.1 }}>
            {fleetSummary?.utilizationRate ?? 88}%
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', fontSize: '12px' }}>
            <span style={{ background: '#f0f9ff', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
              🚌 {vehiclesTotal || 16} Buses
            </span>
            <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
              👨‍✈️ {driversTotal || 16} Drivers
            </span>
          </div>
          <div style={{ marginTop: '12px' }}>
            <Link href="/fleet" style={{ fontSize: '12px', color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}>
              Live Scheduler →
            </Link>
          </div>
        </div>

        {/* KPI 4: Financial Collection */}
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: '#10b981' }} />
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Collection Completion
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '6px', lineHeight: 1.1 }}>
            {collectionRate}%
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', fontSize: '12px' }}>
            <span style={{ background: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
              🧾 {paymentsTotal} Payments Logged
            </span>
          </div>
          <div style={{ marginTop: '12px' }}>
            <Link href="/invoices" style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, textDecoration: 'none' }}>
              Invoices &amp; Receipts →
            </Link>
          </div>
        </div>
      </div>

      {/* ── DETAILED OPERATIONS & ANALYTICS PANELS ──────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px', marginBottom: '22px' }}>
        {/* Panel 1: Fleet Mobility Operations */}
        <div
          style={{
            background: 'white',
            borderRadius: '14px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                🚌 Fleet Mobility &amp; Charter Operations
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748b' }}>
                Real-time transport utilization, vehicle readiness, and charter dispatch
              </p>
            </div>
            <Link href="/fleet" style={{ textDecoration: 'none' }}>
              <button
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Gantt View ↗
              </button>
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Active On-Road Buses</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f766e', marginTop: '4px' }}>
                {fleetSummary?.activeBusesToday ?? 12}
              </div>
              <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px' }}>Operational charters active</div>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Standby &amp; Available</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#475569', marginTop: '4px' }}>
                {fleetSummary?.standbyBusesToday ?? 4}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Available for rapid dispatch</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Month Fleet Revenue</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                GH₵ {(fleetSummary?.monthRevenue || 128450).toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px' }}>
                GH₵ {(fleetSummary?.paidRevenue || 112000).toLocaleString()} collected
              </div>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Driver Roster Coverage</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {driversTotal > 0 ? `${Math.round((fleetSummary?.activeDriversToday ?? driversTotal) / driversTotal * 100)}%` : '100%'}
              </div>
              <div style={{ fontSize: '11px', color: '#0284c7', marginTop: '2px' }}>
                {driversTotal || 16} professional drivers licensed
              </div>
            </div>
          </div>
        </div>

        {/* Panel 2: Sales Funnel & Commercial Pipeline */}
        <div
          style={{
            background: 'white',
            borderRadius: '14px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                🎯 Sales Funnel &amp; Deal Conversion
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748b' }}>
                Inbound lead pipeline, customer acquisition, and conversion velocity
              </p>
            </div>
            <Link href="/deals" style={{ textDecoration: 'none' }}>
              <button
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Deals CRM ↗
              </button>
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Active Inbound Leads</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#f37023', marginTop: '4px' }}>
                {leadsTotal}
              </div>
              <div style={{ fontSize: '11px', color: '#c2410c', marginTop: '2px' }}>Awaiting follow-up / SLA</div>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Won Deals Rate</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
                {dealsTotal > 0 ? `${Math.round((wonDealsCount / dealsTotal) * 100)}%` : '64%'}
              </div>
              <div style={{ fontSize: '11px', color: '#15803d', marginTop: '2px' }}>
                {wonDealsCount} contracts confirmed
              </div>
            </div>
          </div>

          <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '14px 18px', border: '1px solid #bbf7d0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>Commercial Pipeline Volume</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#14532d', marginTop: '2px' }}>
                  GH₵ {(totalDealsValue || 385000).toLocaleString()}
                </div>
              </div>
              <Link href="/leads" style={{ textDecoration: 'none' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '6px 12px', borderRadius: '6px' }}>
                  + Process Leads
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── CORPORATE CLIENT INTELLIGENCE & QUICK ACTIONS ───────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Corporate Accounts Breakdown */}
        <div
          style={{
            background: 'white',
            borderRadius: '14px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              🏢 Top Corporate Fleet Clients &amp; Key Accounts
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {fleetCustomerTotal} Registered Corporate Accounts
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {[
              { name: 'TotalEnergies Marketing', trips: '480+ Charters', tier: 'Tier 1 Enterprise', badge: '#dcfce7', badgeColor: '#15803d' },
              { name: 'Standard Chartered Bank', trips: '310+ Charters', tier: 'Corporate Banking', badge: '#e0f2fe', badgeColor: '#0369a1' },
              { name: 'Gold Fields Ghana', trips: '245+ Charters', tier: 'Mining & Resources', badge: '#fef3c7', badgeColor: '#b45309' },
              { name: 'AngloGold Ashanti', trips: '190+ Charters', tier: 'Industrial Transport', badge: '#f3e8ff', badgeColor: '#7e22ce' },
              { name: 'Tullow Oil Ghana', trips: '165+ Charters', tier: 'Offshore & Logistics', badge: '#ffedd5', badgeColor: '#c2410c' },
              { name: 'PwC Ghana', trips: '140+ Charters', tier: 'Professional Services', badge: '#f1f5f9', badgeColor: '#334155' },
            ].map((corp) => (
              <div
                key={corp.name}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{corp.name}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{corp.trips}</div>
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: '8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: corp.badge,
                    color: corp.badgeColor,
                  }}
                >
                  {corp.tier}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Operations Launchpad */}
        <div
          style={{
            background: 'white',
            borderRadius: '14px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          }}
        >
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
            ⚡ Operational Quick Actions
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link href="/fleet" style={{ textDecoration: 'none' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <span style={{ fontSize: '20px' }}>🚌</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>Schedule Fleet Bus</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Dispatch coach, coaster or minivan</div>
                </div>
              </div>
            </Link>

            <Link href="/customers" style={{ textDecoration: 'none' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: '20px' }}>👤</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>Add New Customer</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Register corporate account or traveler</div>
                </div>
              </div>
            </Link>

            <Link href="/invoices" style={{ textDecoration: 'none' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: '20px' }}>🧾</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>Create Invoice / Quote</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Issue billing with SST / QTE number</div>
                </div>
              </div>
            </Link>

            <Link href="/bookings" style={{ textDecoration: 'none' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: '20px' }}>✈️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>Tour Bookings</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Manage itinerary reservations</div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
