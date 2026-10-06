import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [
    paymentCount,
    bookingCount,
    productCount,
    tourCount,
    customerCount,
  ] = await Promise.all([
    prisma.payment.count(),
    prisma.booking.count(),
    prisma.product.count(),
    prisma.tour.count(),
    prisma.customer.count(),
  ]);

  console.log({
    paymentCount,
    bookingCount,
    productCount,
    tourCount,
    customerCount,
  });

  const samplePayments = await prisma.payment.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      booking: true,
      customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
    },
  });

  console.log('Sample payments:');
  for (const p of samplePayments) {
    console.log(`- Receipt: ${p.receiptNumber}, Ref: ${p.reference}, Amount: ${p.amount}, TourName: ${p.booking?.tourName}, Customer: ${p.customer?.firstName} ${p.customer?.lastName} (${p.customer?.phone})`);
  }

  const allTours = await prisma.tour.findMany({ select: { id: true, name: true, slug: true } });
  console.log('Tours in DB:', allTours);

  const allProducts = await prisma.product.findMany({ select: { id: true, name: true, category: true } });
  console.log('Products in DB:', allProducts);

  // Check how many customers have phone numbers with scientific notation
  const customers = await prisma.customer.findMany({
    where: { phone: { not: null } },
    select: { id: true, firstName: true, lastName: true, phone: true, country: true },
  });

  const sciPhone = customers.filter(c => /[eE]\+?\d+/.test(c.phone || '') || (c.phone && c.phone.includes('000000')));
  console.log(`Customers with phone: ${customers.length}, scientific/truncated zeros: ${sciPhone.length}`);
  if (sciPhone.length > 0) {
    console.log('Sample weird phones:', sciPhone.slice(0, 10));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
