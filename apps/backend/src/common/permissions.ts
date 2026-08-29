// Application permission keys (RBAC). New modules register their permissions here.

export const Permission = {
  USER_VIEW: 'users.view',
  USER_CREATE: 'users.create',
  USER_UPDATE: 'users.update',
  USER_DELETE: 'users.delete',
  USER_ASSIGN_ROLE: 'users.assign_role',

  ROLE_VIEW: 'roles.view',
  ROLE_CREATE: 'roles.create',
  ROLE_UPDATE: 'roles.update',
  ROLE_DELETE: 'roles.delete',

  PERMISSION_VIEW: 'permissions.view',

  CUSTOMER_VIEW: 'customers.view',
  CUSTOMER_CREATE: 'customers.create',
  CUSTOMER_UPDATE: 'customers.update',
  CUSTOMER_DELETE: 'customers.delete',

  COMPANY_VIEW: 'companies.view',
  COMPANY_CREATE: 'companies.create',
  COMPANY_UPDATE: 'companies.update',
  COMPANY_DELETE: 'companies.delete',

  CONTACT_CREATE: 'contacts.create',
  CONTACT_UPDATE: 'contacts.update',
  CONTACT_DELETE: 'contacts.delete',

  ACTIVITY_CREATE: 'activities.create',
  ACTIVITY_VIEW: 'activities.view',
  ACTIVITY_DELETE: 'activities.delete',

  TASK_CREATE: 'tasks.create',
  TASK_VIEW: 'tasks.view',
  TASK_UPDATE: 'tasks.update',
  TASK_DELETE: 'tasks.delete',

  NOTE_CREATE: 'notes.create',
  NOTE_VIEW: 'notes.view',
  NOTE_UPDATE: 'notes.update',
  NOTE_DELETE: 'notes.delete',

  SEARCH: 'search.global',

  LEAD_VIEW: 'leads.view',
  LEAD_CREATE: 'leads.create',
  LEAD_UPDATE: 'leads.update',
  LEAD_DELETE: 'leads.delete',

  DEAL_VIEW: 'deals.view',
  DEAL_CREATE: 'deals.create',
  DEAL_UPDATE: 'deals.update',
  DEAL_DELETE: 'deals.delete',

  TOUR_VIEW: 'tours.view',
  TOUR_CREATE: 'tours.create',
  TOUR_UPDATE: 'tours.update',
  TOUR_PUBLISH: 'tours.publish',
  TOUR_DELETE: 'tours.delete',

  DESTINATION_VIEW: 'destinations.view',
  DESTINATION_CREATE: 'destinations.create',
  DESTINATION_UPDATE: 'destinations.update',
  DESTINATION_DELETE: 'destinations.delete',

  DEPARTURE_VIEW: 'departures.view',
  DEPARTURE_CREATE: 'departures.create',
  DEPARTURE_UPDATE: 'departures.update',
  DEPARTURE_DELETE: 'departures.delete',

  TRAVELER_VIEW: 'travelers.view',
  TRAVELER_CREATE: 'travelers.create',
  TRAVELER_UPDATE: 'travelers.update',
  TRAVELER_DELETE: 'travelers.delete',

  BOOKING_VIEW: 'bookings.view',
  BOOKING_CREATE: 'bookings.create',
  BOOKING_UPDATE: 'bookings.update',
  BOOKING_CANCEL: 'bookings.cancel',

  PAYMENT_VIEW: 'payments.view',
  PAYMENT_CREATE: 'payments.create',
  PAYMENT_REFUND: 'payments.refund',

  INVOICE_VIEW: 'invoices.view',
  INVOICE_CREATE: 'invoices.create',
  INVOICE_UPDATE: 'invoices.update',

  QUOTE_VIEW: 'quotes.view',
  QUOTE_CREATE: 'quotes.create',
  QUOTE_UPDATE: 'quotes.update',

  SUPPLIER_VIEW: 'suppliers.view',
  SUPPLIER_CREATE: 'suppliers.create',
  SUPPLIER_UPDATE: 'suppliers.update',
  SUPPLIER_DELETE: 'suppliers.delete',

  HOTEL_VIEW: 'hotels.view',
  HOTEL_CREATE: 'hotels.create',
  HOTEL_UPDATE: 'hotels.update',
  HOTEL_DELETE: 'hotels.delete',

  VEHICLE_VIEW: 'vehicles.view',
  VEHICLE_CREATE: 'vehicles.create',
  VEHICLE_UPDATE: 'vehicles.update',
  VEHICLE_DELETE: 'vehicles.delete',

  GUIDE_VIEW: 'guides.view',
  GUIDE_CREATE: 'guides.create',
  GUIDE_UPDATE: 'guides.update',
  GUIDE_DELETE: 'guides.delete',

  DRIVER_VIEW: 'drivers.view',
  DRIVER_CREATE: 'drivers.create',
  DRIVER_UPDATE: 'drivers.update',
  DRIVER_DELETE: 'drivers.delete',

  TRIP_VIEW: 'trips.view',
  TRIP_CONFIGURE: 'trips.configure',

  CHECKLIST_VIEW: 'checklists.view',
  CHECKLIST_CREATE: 'checklists.create',
  CHECKLIST_UPDATE: 'checklists.update',
  CHECKLIST_COMPLETE: 'checklists.complete',
  CHECKLIST_DELETE: 'checklists.delete',

  OPERATION_VIEW: 'operations.view',
  OPERATION_UPDATE: 'operations.update',

  REPORT_VIEW: 'reports.view',

  AUDIT_VIEW: 'audit.view',

  SETTINGS_VIEW: 'settings.view',
  SETTINGS_UPDATE: 'settings.update',

  NOTIFICATION_VIEW: 'notifications.view',
  NOTIFICATION_MANAGE: 'notifications.manage',

  AUTOMATION_VIEW: 'automation.view',
  AUTOMATION_RUN: 'automation.run',
} as const;

export type PermissionKey = (typeof Permission)[keyof typeof Permission];

/** Convenience grouping for full access (used by system roles). */
export const ALL_PERMISSIONS: string[] = Object.values(Permission);
