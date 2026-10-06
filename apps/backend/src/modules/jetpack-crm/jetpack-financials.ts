import * as fs from 'fs';
import * as path from 'path';
import * as xlsx from 'xlsx';
import { PrismaClient } from '@prisma/client';

export interface MonthlyFinancial {
  month: string;
  seasonType: string;
  revenue: number;
  transportCost: number;
  staffCost: number;
  marketingCost: number;
  accommodationCost: number;
  totalCost: number;
  profit: number;
}

export const MADE_UP_PRODUCTS = [
  'Ghana Heritage, Slave Castles & Ashanti Kingdom Expedition',
  'Tema Port Luxury Shore Excursion & Cultural Showcase',
  'Volta Adventure, Wli Falls & Canopy Eco-Tour',
  'International Leisure, Flight Booking & Visa Logistics',
];

/**
 * Remove any synthetic or made-up bookings, invoices, and payments that were
 * generated during earlier mock financial ledger syncs.
 */
export async function cleanMadeUpFinancials(prisma: PrismaClient): Promise<{
  deletedPayments: number;
  deletedInvoices: number;
  deletedBookings: number;
}> {
  console.log('[Financial Cleanup] Cleaning up synthetic/made-up payments and bookings...');

  // 1. Delete synthetic payments
  const paymentsToDelete = await prisma.payment.findMany({
    where: {
      OR: [
        { reference: { startsWith: 'JETPACK-TX-' } },
        { paymentNumber: { startsWith: 'PAY-2025-' } },
        { receiptNumber: { startsWith: 'REC-2025-' } },
        { booking: { tourName: { in: MADE_UP_PRODUCTS } } },
      ],
    },
    select: { id: true },
  });

  let deletedPayments = 0;
  if (paymentsToDelete.length > 0) {
    const res = await prisma.payment.deleteMany({
      where: { id: { in: paymentsToDelete.map((p) => p.id) } },
    });
    deletedPayments = res.count;
    console.log(`[Financial Cleanup] Removed ${deletedPayments} synthetic payments.`);
  }

  // 2. Delete synthetic invoices
  const invoicesToDelete = await prisma.invoice.findMany({
    where: {
      OR: [
        { invoiceNumber: { startsWith: 'INV-2025-' } },
        { notes: { contains: 'Synced from Jetpack CRM / Financial Ledger' } },
        { booking: { tourName: { in: MADE_UP_PRODUCTS } } },
      ],
    },
    select: { id: true },
  });

  let deletedInvoices = 0;
  if (invoicesToDelete.length > 0) {
    const res = await prisma.invoice.deleteMany({
      where: { id: { in: invoicesToDelete.map((inv) => inv.id) } },
    });
    deletedInvoices = res.count;
    console.log(`[Financial Cleanup] Removed ${deletedInvoices} synthetic invoices.`);
  }

  // 3. Delete synthetic bookings
  const bookingsToDelete = await prisma.booking.findMany({
    where: {
      OR: [
        { bookingNumber: { startsWith: 'BK-2025-' } },
        { tourName: { in: MADE_UP_PRODUCTS } },
        { notes: { contains: 'Financial statement booking for' } },
      ],
    },
    select: { id: true },
  });

  let deletedBookings = 0;
  if (bookingsToDelete.length > 0) {
    const res = await prisma.booking.deleteMany({
      where: { id: { in: bookingsToDelete.map((b) => b.id) } },
    });
    deletedBookings = res.count;
    console.log(`[Financial Cleanup] Removed ${deletedBookings} synthetic bookings.`);
  }

  return { deletedPayments, deletedInvoices, deletedBookings };
}

export async function executeFinancialSync(prisma: PrismaClient): Promise<{
  invoicesCreated: number;
  paymentsCreated: number;
  bookingsCreated: number;
  totalRevenue: number;
  deletedPayments: number;
  deletedInvoices: number;
  deletedBookings: number;
}> {
  console.log('[Financial Import] Initializing Jetpack & Sunseekers Financial Data Sync...');

  // Always scrub any made-up products and synthetic transactions so customer ledgers stay clean
  const cleanupResult = await cleanMadeUpFinancials(prisma);

  // Locate Data Set.xlsx in possible locations
  const candidates = [
    path.resolve(process.cwd(), 'scripts/data/Data Set.xlsx'),
    path.resolve(__dirname, '../../../../scripts/data/Data Set.xlsx'),
    path.resolve(__dirname, '../../../scripts/data/Data Set.xlsx'),
    'C:/Users/Charis Computer Hub/Downloads/Sunseekers/Data/Data Set.xlsx',
  ];

  let filePath = '';
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      filePath = c;
      break;
    }
  }

  let totalRevenue = 0;
  if (filePath) {
    console.log(`[Financial Import] Loading workbook from: ${filePath}`);
    const wb = xlsx.readFile(filePath);

    // Read Sheet1 (12-month summary)
    const sheet1Data = xlsx.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]] || wb.Sheets['Sheet1']);
    const monthlyData: MonthlyFinancial[] = sheet1Data.map((row) => ({
      month: String(row['Month'] || '').trim(),
      seasonType: String(row['Season Type'] || 'Standard').trim(),
      revenue: Number(row['Revenue']) || 0,
      transportCost: Number(row['Transport Cost']) || 0,
      staffCost: Number(row['Staff Cost']) || 0,
      marketingCost: Number(row['Marketing Cost']) || 0,
      accommodationCost: Number(row['Accommodation Cost']) || 0,
      totalCost: Number(row['Total Cost']) || 0,
      profit: Number(row['Profit']) || 0,
    }));

    totalRevenue = monthlyData.reduce((acc, curr) => acc + curr.revenue, 0);
    console.log(`[Financial Import] Verified ${monthlyData.length} monthly financial summary rows (Total Revenue: $${totalRevenue.toLocaleString()}).`);
  }

  return {
    invoicesCreated: 0,
    paymentsCreated: 0,
    bookingsCreated: 0,
    totalRevenue,
    ...cleanupResult,
  };
}
