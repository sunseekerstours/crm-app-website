import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const MADE_UP_PRODUCTS = [
  'Ghana Heritage, Slave Castles & Ashanti Kingdom Expedition',
  'Tema Port Luxury Shore Excursion & Cultural Showcase',
  'Volta Adventure, Wli Falls & Canopy Eco-Tour',
  'International Leisure, Flight Booking & Visa Logistics',
];

export async function cleanMadeUpPayments(client: PrismaClient = prisma): Promise<{
  deletedPayments: number;
  deletedInvoices: number;
  deletedBookings: number;
}> {
  console.log('[Cleanup] Starting removal of synthetic made-up products, bookings, invoices, and payments...');

  // 1. Delete synthetic payments
  const paymentsToDelete = await client.payment.findMany({
    where: {
      OR: [
        { reference: { startsWith: 'JETPACK-TX-' } },
        { paymentNumber: { startsWith: 'PAY-2025-' } },
        { receiptNumber: { startsWith: 'REC-2025-' } },
        { booking: { tourName: { in: MADE_UP_PRODUCTS } } },
      ],
    },
    select: { id: true, paymentNumber: true, reference: true },
  });

  const paymentIds = paymentsToDelete.map((p) => p.id);
  let deletedPayments = 0;
  if (paymentIds.length > 0) {
    const res = await client.payment.deleteMany({
      where: { id: { in: paymentIds } },
    });
    deletedPayments = res.count;
    console.log(`[Cleanup] Deleted ${deletedPayments} synthetic payments.`);
  }

  // 2. Delete synthetic invoices
  const invoicesToDelete = await client.invoice.findMany({
    where: {
      OR: [
        { invoiceNumber: { startsWith: 'INV-2025-' } },
        { notes: { contains: 'Synced from Jetpack CRM / Financial Ledger' } },
        { booking: { tourName: { in: MADE_UP_PRODUCTS } } },
      ],
    },
    select: { id: true },
  });

  const invoiceIds = invoicesToDelete.map((inv) => inv.id);
  let deletedInvoices = 0;
  if (invoiceIds.length > 0) {
    const res = await client.invoice.deleteMany({
      where: { id: { in: invoiceIds } },
    });
    deletedInvoices = res.count;
    console.log(`[Cleanup] Deleted ${deletedInvoices} synthetic invoices.`);
  }

  // 3. Delete synthetic bookings
  const bookingsToDelete = await client.booking.findMany({
    where: {
      OR: [
        { bookingNumber: { startsWith: 'BK-2025-' } },
        { tourName: { in: MADE_UP_PRODUCTS } },
        { notes: { contains: 'Financial statement booking for' } },
      ],
    },
    select: { id: true },
  });

  const bookingIds = bookingsToDelete.map((b) => b.id);
  let deletedBookings = 0;
  if (bookingIds.length > 0) {
    const res = await client.booking.deleteMany({
      where: { id: { in: bookingIds } },
    });
    deletedBookings = res.count;
    console.log(`[Cleanup] Deleted ${deletedBookings} synthetic bookings with made-up products.`);
  }

  console.log('[Cleanup] Finished cleaning made-up products and transactions:');
  console.log(`  - Payments deleted: ${deletedPayments}`);
  console.log(`  - Invoices deleted: ${deletedInvoices}`);
  console.log(`  - Bookings deleted: ${deletedBookings}`);

  return {
    deletedPayments,
    deletedInvoices,
    deletedBookings,
  };
}

if (require.main === module) {
  cleanMadeUpPayments(prisma)
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error('[Cleanup Error]', err);
      prisma.$disconnect().then(() => process.exit(1));
    });
}
