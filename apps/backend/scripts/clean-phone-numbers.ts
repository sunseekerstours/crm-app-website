import * as fs from 'fs';
import * as path from 'path';
import * as xlsx from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CleanPhoneResult {
  formatted: string;
  country: string;
  isGhana: boolean;
  cleanWhatsApp: string;
  e164: string;
}

/**
 * Normalizes any phone number string into clean international format.
 * Recognizes Ghana (+233) local and international formats, UK (+44), Italy (+39), etc.
 */
export function normalizePhoneNumber(rawPhone?: string | number | null, countryHint?: string | null): CleanPhoneResult | null {
  if (!rawPhone) return null;
  let str = String(rawPhone).trim();
  if (!str) return null;

  // Ignore scientific notation remnants if impossible to parse cleanly
  if (/[eE]\+?\d+/.test(str)) {
    const num = Number(str);
    if (!isNaN(num)) {
      try {
        str = BigInt(Math.round(num)).toString();
      } catch {
        return null;
      }
    }
  }

  // Remove common separators but preserve leading +
  const hasPlus = str.startsWith('+');
  const digits = str.replace(/\D/g, '');
  if (!digits || digits.length < 5) return null;

  // 1. GHANA IDENTIFICATION
  // Case A: Starts with 233 (e.g. 233243705455 or +233243705455)
  if (digits.startsWith('233') && digits.length >= 12) {
    const rest = digits.slice(3); // e.g. 243705455 (9 digits)
    const net = rest.slice(0, 2);
    const mid = rest.slice(2, 5);
    const end = rest.slice(5);
    const formatted = `+233 ${net} ${mid} ${end}`.trim();
    return {
      formatted,
      country: 'Ghana',
      isGhana: true,
      cleanWhatsApp: `233${rest}`,
      e164: `+233${rest}`,
    };
  }

  // Case B: Ghanaian local 10-digit number starting with 0 (e.g. 0243705455, 0550244242, 0201234567)
  const isGhanaHint = (countryHint || '').toLowerCase().includes('ghana');
  const ghanaPrefixes = ['024', '054', '055', '059', '053', '020', '050', '027', '057', '026', '056', '030', '031', '032', '033', '034', '035', '036', '037', '038', '039'];
  const startsWithGhPrefix = ghanaPrefixes.some((p) => digits.startsWith(p));

  if ((digits.length === 10 && digits.startsWith('0')) && (startsWithGhPrefix || isGhanaHint || true)) {
    // Standard Ghana mobile/landline 10-digit format
    const rest = digits.slice(1); // strip leading 0 -> 9 digits
    const net = rest.slice(0, 2);
    const mid = rest.slice(2, 5);
    const end = rest.slice(5);
    const formatted = `+233 ${net} ${mid} ${end}`.trim();
    return {
      formatted,
      country: 'Ghana',
      isGhana: true,
      cleanWhatsApp: `233${rest}`,
      e164: `+233${rest}`,
    };
  }

  // Case C: 9 digits without leading 0 if Ghana hint
  if (digits.length === 9 && (isGhanaHint || ghanaPrefixes.some((p) => digits.startsWith(p.slice(1))))) {
    const net = digits.slice(0, 2);
    const mid = digits.slice(2, 5);
    const end = digits.slice(5);
    const formatted = `+233 ${net} ${mid} ${end}`.trim();
    return {
      formatted,
      country: 'Ghana',
      isGhana: true,
      cleanWhatsApp: `233${digits}`,
      e164: `+233${digits}`,
    };
  }

  // 2. UNITED KINGDOM (+44)
  if (digits.startsWith('44') && digits.length >= 11) {
    const rest = digits.slice(2);
    let formatted = `+44 ${rest}`;
    if (rest.length === 10) {
      formatted = `+44 ${rest.slice(0, 4)} ${rest.slice(4)}`;
    }
    return {
      formatted,
      country: 'United Kingdom',
      isGhana: false,
      cleanWhatsApp: `44${rest}`,
      e164: `+44${rest}`,
    };
  }

  // 3. ITALY (+39)
  if (digits.startsWith('39') && digits.length >= 11) {
    const rest = digits.slice(2);
    const formatted = `+39 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`;
    return {
      formatted,
      country: 'Italy',
      isGhana: false,
      cleanWhatsApp: `39${rest}`,
      e164: `+39${rest}`,
    };
  }

  // 4. NIGERIA (+234)
  if (digits.startsWith('234') && digits.length >= 13) {
    const rest = digits.slice(3);
    const formatted = `+234 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`;
    return {
      formatted,
      country: 'Nigeria',
      isGhana: false,
      cleanWhatsApp: `234${rest}`,
      e164: `+234${rest}`,
    };
  }

  // 5. UNITED STATES / CANADA (+1)
  if (digits.startsWith('1') && digits.length === 11) {
    const rest = digits.slice(1);
    const formatted = `+1 (${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6)}`;
    return {
      formatted,
      country: 'United States',
      isGhana: false,
      cleanWhatsApp: `1${rest}`,
      e164: `+1${rest}`,
    };
  }

  // 6. Generic with plus or country prefix
  if (hasPlus) {
    return {
      formatted: `+${digits}`,
      country: countryHint || 'International',
      isGhana: digits.startsWith('233'),
      cleanWhatsApp: digits,
      e164: `+${digits}`,
    };
  }

  // Fallback: If 10 or 11 digits starting with known country calling codes:
  if (digits.length >= 8) {
    return {
      formatted: `+${digits}`,
      country: countryHint || 'International',
      isGhana: false,
      cleanWhatsApp: digits,
      e164: `+${digits}`,
    };
  }

  return {
    formatted: str,
    country: countryHint || '',
    isGhana: false,
    cleanWhatsApp: digits,
    e164: str,
  };
}

/**
 * Reads upload Crm.csv and Sunseekers Data.xlsx to build reference map
 * of clean, uncorrupted phone numbers.
 */
function loadReferencePhoneMaps(): {
  byEmail: Map<string, { phone: string; country?: string; company?: string; name?: string }>;
  byName: Map<string, { phone: string; country?: string }>;
  byCompany: Map<string, { phone: string; country?: string }>;
} {
  const byEmail = new Map<string, { phone: string; country?: string; company?: string; name?: string }>();
  const byName = new Map<string, { phone: string; country?: string }>();
  const byCompany = new Map<string, { phone: string; country?: string }>();

  // 1. upload Crm.csv
  const uploadPath = path.resolve(__dirname, 'data/upload Crm.csv');
  if (fs.existsSync(uploadPath)) {
    try {
      const raw = fs.readFileSync(uploadPath, 'utf8').replace(/^\uFEFF/, '');
      const lines = raw.split(/\r?\n/).filter(Boolean);
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        const email = (parts[3] || '').trim().toLowerCase();
        const tel = (parts[10] || '').trim();
        const comp = (parts[12] || '').trim();
        const fname = (parts[1] || '').trim();
        const lname = (parts[2] || '').trim();
        const fullName = `${fname} ${lname}`.trim().toLowerCase();

        // Ensure not scientific notation
        if (tel && !/[eE]\+/.test(tel)) {
          if (email) byEmail.set(email, { phone: tel, company: comp, name: fullName });
          if (fullName) byName.set(fullName, { phone: tel });
          if (comp) byCompany.set(comp.toLowerCase(), { phone: tel });
        }
      }
      console.log(`[Phone Cleaner] Loaded reference contacts from upload Crm.csv`);
    } catch (e: any) {
      console.warn(`[Phone Cleaner] Could not read upload Crm.csv: ${e.message}`);
    }
  }

  // 2. Sunseekers Data.xlsx
  const xlsxPath = path.resolve(__dirname, 'data/Sunseekers Data.xlsx');
  if (fs.existsSync(xlsxPath)) {
    try {
      const wb = xlsx.readFile(xlsxPath);
      const sheet = wb.Sheets['Data'];
      if (sheet) {
        const rows = xlsx.utils.sheet_to_json<any>(sheet);
        for (const r of rows) {
          const email = String(r['Email'] || '').trim().toLowerCase();
          const phone = String(r['Phone'] || '').trim();
          const comp = String(r['Company'] || '').trim();
          const name = String(r['Name'] || '').trim().toLowerCase();

          if (phone && !/[eE]\+/.test(phone)) {
            if (email && !byEmail.has(email)) byEmail.set(email, { phone, company: comp, name });
            if (name && !byName.has(name)) byName.set(name, { phone });
            if (comp && !byCompany.has(comp.toLowerCase())) byCompany.set(comp.toLowerCase(), { phone });
          }
        }
        console.log(`[Phone Cleaner] Loaded reference contacts from Sunseekers Data.xlsx`);
      }
    } catch (e: any) {
      console.warn(`[Phone Cleaner] Could not read Sunseekers Data.xlsx: ${e.message}`);
    }
  }

  return { byEmail, byName, byCompany };
}

export async function cleanAllPhoneNumbers(client: PrismaClient = prisma): Promise<{
  customersUpdated: number;
  leadsUpdated: number;
  ghanaianIdentified: number;
}> {
  console.log('[Phone Cleaner] Starting phone number formatting & Ghana identification...');
  const { byEmail, byName, byCompany } = loadReferencePhoneMaps();

  let customersUpdated = 0;
  let leadsUpdated = 0;
  let ghanaianIdentified = 0;

  // 1. Process Customers
  const customers = await client.customer.findMany({
    select: {
      id: true,
      email: true,
      phone: true,
      country: true,
      firstName: true,
      lastName: true,
    },
  });

  console.log(`[Phone Cleaner] Auditing ${customers.length} customer records...`);

  for (const c of customers) {
    const email = (c.email || '').toLowerCase().trim();
    const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim().toLowerCase();
    const currentPhone = (c.phone || '').trim();

    // Check if phone needs restoration from source (has E+, ends with 000000, or missing)
    const isCorrupted = !currentPhone || /[eE]\+/.test(currentPhone) || currentPhone.endsWith('000000');
    let phoneToUse = currentPhone;

    if (isCorrupted) {
      const ref = (email ? byEmail.get(email) : null) || (fullName ? byName.get(fullName) : null);
      if (ref?.phone) {
        phoneToUse = ref.phone;
      }
    }

    if (!phoneToUse) continue;

    const norm = normalizePhoneNumber(phoneToUse, c.country);
    if (!norm) continue;

    const needsPhoneUpdate = c.phone !== norm.formatted;
    const needsCountryUpdate = norm.isGhana && (!c.country || c.country === 'International');

    if (norm.isGhana) {
      ghanaianIdentified++;
    }

    if (needsPhoneUpdate || needsCountryUpdate) {
      await client.customer.update({
        where: { id: c.id },
        data: {
          phone: norm.formatted,
          ...(needsCountryUpdate ? { country: 'Ghana' } : {}),
        },
      });
      customersUpdated++;
    }
  }

  // 2. Process Leads
  const leads = await client.lead.findMany({
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      customerId: true,
    },
  });

  console.log(`[Phone Cleaner] Auditing ${leads.length} lead records...`);

  for (const l of leads) {
    const email = (l.email || '').toLowerCase().trim();
    const fullName = `${l.firstName || ''} ${l.lastName || ''}`.trim().toLowerCase();
    const currentPhone = (l.phone || '').trim();

    const isCorrupted = !currentPhone || /[eE]\+/.test(currentPhone) || currentPhone.endsWith('000000');
    let phoneToUse = currentPhone;

    if (isCorrupted) {
      const ref = (email ? byEmail.get(email) : null) || (fullName ? byName.get(fullName) : null);
      if (ref?.phone) {
        phoneToUse = ref.phone;
      }
    }

    if (!phoneToUse) continue;

    const norm = normalizePhoneNumber(phoneToUse);
    if (!norm) continue;

    if (l.phone !== norm.formatted) {
      await client.lead.update({
        where: { id: l.id },
        data: {
          phone: norm.formatted,
        },
      });
      leadsUpdated++;
    }
  }

  console.log('[Phone Cleaner] Completed successfully:');
  console.log(`  - Customer phone numbers cleaned/formatted: ${customersUpdated}`);
  console.log(`  - Lead phone numbers cleaned/formatted: ${leadsUpdated}`);
  console.log(`  - Ghanaian contacts identified & normalized: ${ghanaianIdentified}`);

  return {
    customersUpdated,
    leadsUpdated,
    ghanaianIdentified,
  };
}

if (require.main === module) {
  cleanAllPhoneNumbers(prisma)
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error('[Phone Cleaner Error]', err);
      prisma.$disconnect().then(() => process.exit(1));
    });
}
