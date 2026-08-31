export type Route =
  | { name: 'home' }
  | { name: 'list'; resource: string }
  | { name: 'customerDetail'; id: string }
  | { name: 'customerForm'; customerId?: string }
  | { name: 'productList' }
  | { name: 'productForm' }
  | { name: 'notifications' };
