import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient, CustomerStatus, LeadSource, LeadStage } from '@prisma/client';

const prisma = new PrismaClient();

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentVal.trim());
      if (currentRow.length > 1 || currentRow[0] !== '') {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.length > 1 || currentRow[0] !== '') {
      rows.push(currentRow);
    }
  }

  return rows;
}

function parseDate(dateStr?: string): Date | null {
  if (!dateStr || !dateStr.trim()) return null;
  const d = new Date(dateStr.trim());
  return isNaN(d.getTime()) ? null : d;
}

export async function importJetpackContacts(csvFilePath?: string): Promise<{
  totalRows: number;
  customersCreated: number;
  customersUpdated: number;
  customersSkipped: number;
  leadsCreated: number;
  totalInDb: number;
}> {
  const defaultPath = path.resolve(__dirname, 'jetpack-contacts.csv');
  const targetPath = csvFilePath && fs.existsSync(csvFilePath) ? csvFilePath : defaultPath;

  if (!fs.existsSync(targetPath)) {
    throw new Error(`Jetpack contacts CSV file not found at: ${targetPath}`);
  }

  console.log(`[Jetpack Import] Reading contacts from: ${targetPath}`);
  const raw = fs.readFileSync(targetPath, 'utf8').replace(/^\uFEFF/, '');
  const rows = parseCSV(raw);

  if (rows.length < 2) {
    console.log('[Jetpack Import] No data rows found in CSV');
    return {
      totalRows: 0,
      customersCreated: 0,
      customersUpdated: 0,
      customersSkipped: 0,
      leadsCreated: 0,
      totalInDb: await prisma.customer.count(),
    };
  }

  const headers = rows[0].map((h) => h.toLowerCase().trim());
  const dataRows = rows.slice(1);

  // Column index helpers
  const idx = {
    id: headers.indexOf('id'),
    status: headers.indexOf('status'),
    email: headers.indexOf('email'),
    prefix: headers.indexOf('prefix'),
    firstName: headers.indexOf('first name'),
    lastName: headers.indexOf('last name'),
    addr1: headers.indexOf('address line 1 (main address)'),
    addr2: headers.indexOf('address line 2 (main address)'),
    city: headers.indexOf('city (main address)'),
    state: headers.indexOf('state (main address)'),
    postcode: headers.indexOf('post code (main address)'),
    country: headers.indexOf('country (main address)'),
    homeTel: headers.indexOf('home telephone'),
    workTel: headers.indexOf('work telephone'),
    mobTel: headers.indexOf('mobile telephone'),
    createdDate: headers.indexOf('created date'),
    from: headers.indexOf('from'),
    to: headers.indexOf('to'),
    departure: headers.indexOf('departure'),
    passengers: headers.indexOf('passengers'),
    companyName: headers.indexOf('company name'),
    companyEmail: headers.indexOf('company email'),
    tags: headers.indexOf('tags'),
  };

  let customersCreated = 0;
  let customersUpdated = 0;
  let customersSkipped = 0;
  let leadsCreated = 0;

  for (let r = 0; r < dataRows.length; r++) {
    const row = dataRows[r];
    const wpId = idx.id !== -1 ? row[idx.id]?.trim() : '';
    const rawEmail = idx.email !== -1 ? row[idx.email]?.trim().toLowerCase() : '';
    const homeTel = idx.homeTel !== -1 ? row[idx.homeTel]?.trim() : '';
    const workTel = idx.workTel !== -1 ? row[idx.workTel]?.trim() : '';
    const mobTel = idx.mobTel !== -1 ? row[idx.mobTel]?.trim() : '';
    const phone = mobTel || workTel || homeTel || '';

    let fname = idx.firstName !== -1 ? row[idx.firstName]?.trim() : '';
    let lname = idx.lastName !== -1 ? row[idx.lastName]?.trim() : '';

    if (!fname && !lname) {
      if (rawEmail) {
        fname = rawEmail.split('@')[0];
        lname = 'Contact';
      } else {
        fname = 'Valued';
        lname = `Guest #${wpId || r + 1}`;
      }
    } else if (!fname) {
      fname = 'Guest';
    } else if (!lname) {
      lname = 'Contact';
    }

    const rawStatus = (idx.status !== -1 ? row[idx.status]?.trim() : '') || 'Lead';
    const isCustomer = rawStatus.toLowerCase().includes('customer');

    const country = idx.country !== -1 ? row[idx.country]?.trim() : '';
    const addr1 = idx.addr1 !== -1 ? row[idx.addr1]?.trim() : '';
    const addr2 = idx.addr2 !== -1 ? row[idx.addr2]?.trim() : '';
    const city = idx.city !== -1 ? row[idx.city]?.trim() : '';
    const state = idx.state !== -1 ? row[idx.state]?.trim() : '';
    const postcode = idx.postcode !== -1 ? row[idx.postcode]?.trim() : '';
    const fullAddress = [addr1, addr2, city, state, postcode].filter(Boolean).join(', ') || null;

    const tour = idx.to !== -1 ? row[idx.to]?.trim() : idx.from !== -1 ? row[idx.from]?.trim() : '';
    const departure = idx.departure !== -1 ? row[idx.departure]?.trim() : '';
    const passengers = idx.passengers !== -1 ? row[idx.passengers]?.trim() : '';
    const company = idx.companyName !== -1 ? row[idx.companyName]?.trim() : '';
    const rawTags = idx.tags !== -1 ? row[idx.tags]?.trim() : '';
    const createdDate = idx.createdDate !== -1 ? parseDate(row[idx.createdDate]) : null;

    const tags: string[] = ['JETPACK_CRM', 'WORDPRESS_SYNC'];
    if (rawStatus) tags.push(rawStatus.toUpperCase().replace(/\s+/g, '_'));
    if (rawTags) {
      rawTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .forEach((t) => {
          if (!tags.includes(t)) tags.push(t);
        });
    }

    // Match existing customer by Email or Phone or Jetpack Note ID
    let customer = await prisma.customer.findFirst({
      where: {
        OR: [
          ...(rawEmail ? [{ email: rawEmail }] : []),
          ...(phone ? [{ phone }] : []),
        ],
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          firstName: fname,
          lastName: lname,
          email: rawEmail || null,
          phone: phone || null,
          country: country || null,
          address: fullAddress,
          status: CustomerStatus.ACTIVE,
          leadSource: LeadSource.WEBSITE,
          tags,
          createdAt: createdDate || new Date(),
        },
      });
      customersCreated++;

      // Create detailed audit note with Jetpack provenance
      const noteDetails = [
        `🌐 Imported from WordPress Jetpack CRM (Contact ID #${wpId || 'N/A'})`,
        `WP Status: ${rawStatus}`,
        phone ? `📞 Phone: ${phone}` : null,
        country ? `🌍 Country: ${country}` : null,
        fullAddress ? `🏠 Address: ${fullAddress}` : null,
        tour ? `🎒 Requested Tour / Package: ${tour}` : null,
        departure ? `📅 Target Departure: ${departure}` : null,
        passengers ? `👥 Guests / Passengers: ${passengers}` : null,
        company ? `🏢 Company: ${company}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      await prisma.note.create({
        data: {
          content: noteDetails,
          customerId: customer.id,
          createdAt: createdDate || new Date(),
        },
      });
    } else {
      // Update missing phone, address, country or tags
      const currentTags = customer.tags || [];
      const updatedTags = Array.from(new Set([...currentTags, ...tags]));
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          phone: customer.phone || phone || null,
          country: customer.country || country || null,
          address: customer.address || fullAddress || null,
          tags: updatedTags,
        },
      });
      customersUpdated++;
    }

    // If it is a Lead/New Lead and has an email, ensure it also appears in the Lead pipeline
    if (!isCustomer && rawEmail) {
      const existingLead = await prisma.lead.findFirst({
        where: { email: rawEmail },
      });

      if (!existingLead) {
        await prisma.lead.create({
          data: {
            firstName: fname,
            lastName: lname,
            email: rawEmail,
            phone: phone || null,
            source: LeadSource.WEBSITE,
            stage: LeadStage.NEW,
            destination: tour || null,
            interestedTour: tour || null,
            customerId: customer.id,
            campaign: 'WordPress Jetpack CRM Import',
            tags: ['JETPACK_CRM', 'WORDPRESS_SYNC'],
            createdAt: createdDate || new Date(),
            notes: {
              create: {
                content:
                  `Inbound Lead from Jetpack CRM (WP ID #${wpId})\n` +
                  (tour ? `• Tour: ${tour}\n` : '') +
                  (departure ? `• Departure: ${departure}\n` : '') +
                  (passengers ? `• Guests: ${passengers}\n` : ''),
                createdAt: createdDate || new Date(),
              },
            },
          },
        });
        leadsCreated++;
      }
    }
  }

  const totalInDb = await prisma.customer.count();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`[Jetpack Import Complete]`);
  console.log(`• Total Rows in CSV:       ${dataRows.length}`);
  console.log(`• New Customers Created:   ${customersCreated}`);
  console.log(`• Existing Customers Updated: ${customersUpdated}`);
  console.log(`• New Leads Created:       ${leadsCreated}`);
  console.log(`• Total Customers in DB:   ${totalInDb}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  return {
    totalRows: dataRows.length,
    customersCreated,
    customersUpdated,
    customersSkipped,
    leadsCreated,
    totalInDb,
  };
}

async function main() {
  await importJetpackContacts();
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error('[Jetpack Import Error]', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
