import { PrismaClient, DepartureStatus, TourStatus } from '@prisma/client';

const prisma = new PrismaClient();

const NOW = Date.now();
const daysFromNow = (d: number) => new Date(NOW + d * 24 * 60 * 60 * 1000);

async function main(): Promise<void> {
  const gh = (n: number) =>
    prisma.destination.upsert({
      where: { slug: n.slug },
      create: { name: n.name, slug: n.slug, country: n.country, region: n.region, summary: n.summary, description: n.description, isActive: true },
      update: { isActive: true, summary: n.summary, description: n.description },
    });

  const accra = await gh({
    slug: 'accra',
    name: 'Accra & the Coast',
    country: 'Ghana',
    region: 'Greater Accra',
    summary: 'Vibrant capital, historic forts and golden beaches.',
    description: 'Explore the bustling streets of Accra, the haunting history of Cape Coast Castle and the laid-back sands of the Gold Coast.',
  });

  const kumasi = await gh({
    slug: 'kumasi',
    name: 'Kumasi & Ashanti Kingdom',
    country: 'Ghana',
    region: 'Ashanti',
    summary: 'The cultural heart of Ghana and the Ashanti Kingdom.',
    description: 'Discover the rich traditions of the Ashanti people, vibrant markets and royal heritage in Kumasi.',
  });

  const cairo = await gh({
    slug: 'cairo-nile',
    name: 'Cairo & the Nile',
    country: 'Egypt',
    region: 'Cairo',
    summary: 'Ancient wonders and the timeless flow of the Nile.',
    description: 'From the pyramids of Giza to a serene cruise along the Nile, journey through five thousand years of history.',
  });

  const marrakech = await gh({
    slug: 'marrakech',
    name: 'Marrakech & the Sahara',
    country: 'Morocco',
    region: 'Marrakech',
    summary: 'Colourful souks, Atlas mountains and desert dunes.',
    description: 'Lose yourself in Marrakech, trek the High Atlas and sleep beneath the stars of the Sahara.',
  });

  const dests = { accra, kumasi, cairo, marrakech };

  async function tour(t: {
    slug: string; name: string; summary: string; description: string;
    durationDays: number; basePrice: number; difficulty: string; type: string;
    highlights: string[]; dests: string[];
  }) {
    const existing = await prisma.tour.findUnique({ where: { slug: t.slug } });
    const data = {
      slug: t.slug,
      name: t.name,
      summary: t.summary,
      description: t.description,
      durationDays: t.durationDays,
      type: t.type,
      difficulty: t.difficulty,
      minPax: 4,
      maxPax: 16,
      highlights: t.highlights,
      currency: 'GHS',
      basePrice: t.basePrice,
      status: TourStatus.ACTIVE,
    };
    let tourRow;
    if (existing) {
      tourRow = await prisma.tour.update({ where: { slug: t.slug }, data });
    } else {
      tourRow = await prisma.tour.create({ data });
    }
    const links = [];
    for (const s of t.dests) {
      const d = await prisma.destination.findUnique({ where: { slug: s } });
      if (d) links.push({ tourId: tourRow.id, destinationId: d.id });
      else console.warn(`  !! destination not found: ${s}`);
    }
    await prisma.tourDestination.deleteMany({ where: { tourId: tourRow.id } });
    await prisma.tourDestination.createMany({ data: links, skipDuplicates: true });
    return tourRow;
  }

  const ghanaClassic = await tour({
    slug: 'ghana-classic',
    name: 'Ghana Classic',
    summary: 'Ten days through the history, culture and coastlines of Ghana.',
    description: 'Begin in Accra, travel to the Ashanti Kingdom and end on the beaches of the Gold Coast. A perfect introduction to West Africa.',
    durationDays: 10,
    basePrice: 18500,
    difficulty: 'Easy',
    type: 'Cultural',
    highlights: ['Guided tour of Cape Coast and Elmina Castles', 'Kente-weaving workshop in Bonwire', 'Kakum Canopy Walkway', 'Beach stay at Busua'],
    dests: ['accra', 'kumasi'],
  });

  await prisma.departure.createMany({
    data: [
      {
        tourId: ghanaClassic.id, startDate: daysFromNow(30), endDate: daysFromNow(40),
        status: DepartureStatus.OPEN, price: 18500, currency: 'GHS', minPax: 4, maxPax: 16, bookedCount: 5,
      },
      {
        tourId: ghanaClassic.id, startDate: daysFromNow(90), endDate: daysFromNow(100),
        status: DepartureStatus.SCHEDULED, price: 18500, currency: 'GHS', minPax: 4, maxPax: 16, bookedCount: 0,
      },
    ],
    skipDuplicates: true,
  });

  const nile = await tour({
    slug: 'nile-odyssey',
    name: 'Nile Odyssey',
    summary: 'Seven days from the pyramids of Giza to the temples of Luxor.',
    description: 'Sail the legendary Nile, marvelling at ancient wonders and the timeless rhythm of the river.',
    durationDays: 7,
    basePrice: 22400,
    difficulty: 'Moderate',
    type: 'Historical',
    highlights: ['Pyramids of Giza and the Sphinx', 'Nile felucca cruise', 'Valley of the Kings', 'Karnak Temple at sunset'],
    dests: ['cairo-nile'],
  });

  await prisma.departure.createMany({
    data: [
      {
        tourId: nile.id, startDate: daysFromNow(45), endDate: daysFromNow(52),
        status: DepartureStatus.GUARANTEED, price: 22400, currency: 'GHS', minPax: 4, maxPax: 14, bookedCount: 9,
      },
    ],
    skipDuplicates: true,
  });

  const sahara = await tour({
    slug: 'sahara-starlight',
    name: 'Sahara Starlight',
    summary: 'Marrakech souks, Atlas trekking and a night under Saharan stars.',
    description: 'From the vibrant heart of Marrakech to the silent dunes of the Sahara, this is Morocco at its most magical.',
    durationDays: 6,
    basePrice: 16800,
    difficulty: 'Moderate',
    type: 'Adventure',
    highlights: ['Jemaa el-Fnaa night market', 'High Atlas mountain trek', 'Overnight camel trek into the Sahara', 'Desert camp under the stars'],
    dests: ['marrakech'],
  });

  await prisma.departure.createMany({
    data: [
      {
        tourId: sahara.id, startDate: daysFromNow(20), endDate: daysFromNow(26),
        status: DepartureStatus.OPEN, price: 16800, currency: 'GHS', minPax: 4, maxPax: 12, bookedCount: 3,
      },
    ],
    skipDuplicates: true,
  });

  // A DRAFT tour that must NOT appear on the public site.
  await prisma.tour.upsert({
    where: { slug: 'private-draft-tour' },
    create: {
      slug: 'private-draft-tour', name: 'Private Draft Tour', summary: 'Hidden tour', status: TourStatus.DRAFT,
      basePrice: 1000, currency: 'GHS',
    },
    update: {},
  });

  console.log('Sample public data ready: Accra, Kumasi, Cairo & the Nile, Marrakech + 3 active tours with departures.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
