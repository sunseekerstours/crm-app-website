export type Route =
  | { name: 'home' }
  | { name: 'dashboard' }
  | { name: 'list'; resource: string }
  | { name: 'customerDetail'; id: string }
  | { name: 'customerForm'; customerId?: string }
  | { name: 'leadForm'; leadId?: string }
  | { name: 'dealForm'; dealId?: string }
  | { name: 'tourForm'; tourId?: string }
  | { name: 'paymentForm' }
  | { name: 'bookingForm' }
  | { name: 'departureForm' }
  | { name: 'productList' }
  | { name: 'productForm' }
  | { name: 'notifications' }
  | { name: 'settings' };
