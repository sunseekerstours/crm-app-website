import type { Column } from './screens/ListScreen';
import type { Route } from './navigation';

interface ResourceConfig<T> {
  endpoint: string;
  title: string;
  columns: Column<T>[];
  badgeKey?: keyof T;
  addPermission?: string;
  addLabel?: string;
  addRoute?: Route;
  detailRoute?: (id: string) => Route;
  editRoute?: (id: string) => Route;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  status: string;
  products?: { id: string; name: string; category?: string | null }[];
}
interface Lead { id: string; firstName?: string; lastName?: string; email?: string | null; company?: string; stage: string; }
interface Deal { id: string; name?: string; title?: string; stage: string; amount?: number; value?: number | null; currency?: string; }
interface Tour { id: string; name: string; summary?: string | null; status: string; }
interface Departure { id: string; reference?: string; name?: string; startDate?: string; status: string; }
interface Booking { id: string; bookingNumber?: string; status: string; }
interface Payment { id: string; amount?: number | null | string; currency?: string; status: string; }

export const RESOURCES: Record<string, ResourceConfig<any>> = {
  customers: {
    endpoint: '/customers?limit=50',
    title: 'Customers',
    badgeKey: 'status',
    addPermission: 'customers.create',
    addLabel: '+ Add',
    addRoute: { name: 'customerForm' },
    detailRoute: (id: string): Route => ({ name: 'customerDetail', id }),
    columns: [
      { key: 'name', label: 'Name', render: (r: Customer) => `${r.firstName} ${r.lastName}`.trim() },
      {
        key: 'contact',
        label: 'Contact',
        render: (r: Customer) => `${r.email ?? ''}${r.phone ? ` · ${r.phone}` : ''}`,
      },
    ],
  },
  leads: {
    endpoint: '/leads?limit=50',
    title: 'Leads',
    badgeKey: 'stage',
    addPermission: 'leads.create',
    addLabel: '+ Add',
    addRoute: { name: 'leadForm' },
    editRoute: (id: string): Route => ({ name: 'leadForm', leadId: id }),
    columns: [
      {
        key: 'name',
        label: 'Name',
        render: (r: Lead) => `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() || (r.company as string) || '—',
      },
      { key: 'email', label: 'Email', render: (r: Lead) => r.email ?? '—' },
    ],
  },
  deals: {
    endpoint: '/deals?limit=50',
    title: 'Deals',
    badgeKey: 'stage',
    addPermission: 'deals.create',
    addLabel: '+ Add',
    addRoute: { name: 'dealForm' },
    editRoute: (id: string): Route => ({ name: 'dealForm', dealId: id }),
    columns: [
      { key: 'title', label: 'Title', render: (r: Deal) => r.name ?? r.title ?? '—' },
      { key: 'amount', label: 'Amount', render: (r: Deal) => `${(Number(r.value ?? r.amount ?? 0)).toLocaleString()} ${r.currency ?? 'GHS'}` },
    ],
  },
  tours: {
    endpoint: '/tours?limit=50',
    title: 'Tours',
    badgeKey: 'status',
    addPermission: 'tours.create',
    addLabel: '+ Add',
    addRoute: { name: 'tourForm' },
    editRoute: (id: string): Route => ({ name: 'tourForm', tourId: id }),
    columns: [
      { key: 'name', label: 'Name', render: (r: Tour) => r.name },
      { key: 'summary', label: 'Summary', render: (r: Tour) => r.summary ?? '—' },
    ],
  },
  departures: {
    endpoint: '/departures?limit=50',
    title: 'Departures',
    badgeKey: 'status',
    columns: [
      { key: 'reference', label: 'Reference', render: (r: Departure) => r.reference ?? r.name ?? '—' },
      { key: 'startDate', label: 'Start', render: (r: Departure) => (r.startDate ? new Date(r.startDate).toLocaleDateString() : '—') },
    ],
  },
  bookings: {
    endpoint: '/bookings?limit=50',
    title: 'Bookings',
    badgeKey: 'status',
    columns: [
      { key: 'bookingNumber', label: 'Booking #', render: (r: Booking) => r.bookingNumber ?? r.id.slice(0, 8) },
      { key: 'id', label: 'ID', render: (r: Booking) => r.id.slice(0, 8) },
    ],
  },
  payments: {
    endpoint: '/payments?limit=50',
    title: 'Payments',
    badgeKey: 'status',
    columns: [
      { key: 'amount', label: 'Amount', render: (r: Payment) => `${(Number(r.amount ?? 0)).toLocaleString()} ${r.currency ?? ''}` },
      { key: 'status', label: 'Status', render: (r: Payment) => r.status },
    ],
  },
};

export function resourceConfig(key: string): ResourceConfig<any> | null {
  return RESOURCES[key] ?? null;
}
