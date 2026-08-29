import type { Column } from './screens/ListScreen';

interface ResourceConfig<T> {
  endpoint: string;
  title: string;
  columns: Column<T>[];
  badgeKey?: keyof T;
}

interface Customer { id: string; name: string; email: string; phone: string; status: string; }
interface Lead { id: string; name: string; company: string; stage: string; }
interface Deal { id: string; title: string; stage: string; amount: number; }
interface Tour { id: string; name: string; destination: string; price: number; }
interface Departure { id: string; reference: string; startDate: string; status: string; }
interface Booking { id: string; bookingNumber: string; status: string; }
interface Payment { id: string; amount: number; currency: string; status: string; }

export const RESOURCES: Record<string, ResourceConfig<any>> = {
  customers: {
    endpoint: '/customers?limit=50',
    title: 'Customers',
    badgeKey: 'status',
    columns: [
      { key: 'name', label: 'Name', render: (r: Customer) => r.name },
      { key: 'email', label: 'Email', render: (r: Customer) => r.email },
    ],
  },
  leads: {
    endpoint: '/leads?limit=50',
    title: 'Leads',
    badgeKey: 'stage',
    columns: [
      { key: 'name', label: 'Name', render: (r: Lead) => r.name ?? r.company },
      { key: 'company', label: 'Company', render: (r: Lead) => r.company },
    ],
  },
  deals: {
    endpoint: '/deals?limit=50',
    title: 'Deals',
    badgeKey: 'stage',
    columns: [
      { key: 'title', label: 'Title', render: (r: Deal) => r.title },
      { key: 'amount', label: 'Amount', render: (r: Deal) => `GHS ${(r.amount ?? 0).toLocaleString()}` },
    ],
  },
  tours: {
    endpoint: '/tours?limit=50',
    title: 'Tours',
    columns: [
      { key: 'name', label: 'Name', render: (r: Tour) => r.name },
      { key: 'destination', label: 'Destination', render: (r: Tour) => r.destination },
    ],
  },
  departures: {
    endpoint: '/departures?limit=50',
    title: 'Departures',
    badgeKey: 'status',
    columns: [
      { key: 'reference', label: 'Reference', render: (r: Departure) => r.reference },
      { key: 'startDate', label: 'Start', render: (r: Departure) => (r.startDate ? new Date(r.startDate).toLocaleDateString() : '—') },
    ],
  },
  bookings: {
    endpoint: '/bookings?limit=50',
    title: 'Bookings',
    badgeKey: 'status',
    columns: [
      { key: 'bookingNumber', label: 'Booking #', render: (r: Booking) => r.bookingNumber },
      { key: 'id', label: 'ID', render: (r: Booking) => r.id.slice(0, 8) },
    ],
  },
  payments: {
    endpoint: '/payments?limit=50',
    title: 'Payments',
    badgeKey: 'status',
    columns: [
      { key: 'amount', label: 'Amount', render: (r: Payment) => `${(r.amount ?? 0).toLocaleString()} ${r.currency}` },
      { key: 'status', label: 'Status', render: (r: Payment) => r.status },
    ],
  },
};

export function resourceConfig(key: string): ResourceConfig<any> | null {
  return RESOURCES[key] ?? null;
}
