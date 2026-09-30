const fs = require('fs');
const crypto = require('crypto');

// Load clean fleet migration data
const data = JSON.parse(fs.readFileSync('scripts/clean_fleet_migration_data.json', 'utf8'));

console.log(`Read ${data.bookings.length} fleet bookings.`);

const companyMap = new Map();

for (const booking of data.bookings) {
  let raw = (booking.company || '').trim();
  if (!raw) continue;

  // Filter out pure single or double digit numbers (excel row/index noise like "1", "2", "12")
  if (/^\d{1,5}$/.test(raw)) continue;

  // Clean extra whitespace
  raw = raw.replace(/\s+/g, ' ').trim();
  if (!raw) continue;

  const key = raw.toLowerCase();
  if (!companyMap.has(key)) {
    // Generate deterministic UUID based on lowercase company name
    const hash = crypto.createHash('md5').update('fleet_customer_' + key).digest('hex');
    // Format hash as UUID v4-like
    const uuid = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
    companyMap.set(key, {
      id: uuid,
      companyName: raw,
      phone: '0200000000',
      tag: 'fleet',
    });
  }
}

console.log(`Extracted ${companyMap.size} unique fleet client companies.`);

// Generate SQL migration
const sqlLines = [];
sqlLines.push('-- Fleet Customers Ingestion Migration');
sqlLines.push('BEGIN;');

// 1. Insert or update into customers
let insertCount = 0;
for (const [key, cust] of companyMap.entries()) {
  const escapedName = cust.companyName.replace(/'/g, "''");
  const id = cust.id;
  
  // Upsert query: if id already exists, update tags to include 'fleet' and phone if missing
  sqlLines.push(`
INSERT INTO customers (
  id, "firstName", "lastName", email, phone, tags, status, "createdAt", "updatedAt"
) VALUES (
  '${id}',
  '${escapedName}',
  '',
  NULL,
  '0200000000',
  ARRAY['fleet']::text[],
  'ACTIVE',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  tags = CASE WHEN 'fleet' = ANY(customers.tags) THEN customers.tags ELSE array_append(customers.tags, 'fleet') END,
  phone = COALESCE(customers.phone, '0200000000'),
  "updatedAt" = NOW();
  `);
  insertCount++;
}

// 2. Update fleet_bookings to set customerId where matching company name
sqlLines.push('-- Link fleet_bookings to customer records');
for (const [key, cust] of companyMap.entries()) {
  const escapedName = cust.companyName.replace(/'/g, "''");
  sqlLines.push(`
UPDATE fleet_bookings
SET "customerId" = '${cust.id}'
WHERE LOWER(TRIM(company)) = '${key.replace(/'/g, "''")}'
  AND ("customerId" IS NULL OR "customerId" = '');
  `);
}

sqlLines.push('COMMIT;');

fs.writeFileSync('scripts/import_fleet_customers.sql', sqlLines.join('\n'), 'utf8');
console.log(`Generated scripts/import_fleet_customers.sql with ${insertCount} customer upserts and booking link updates.`);
