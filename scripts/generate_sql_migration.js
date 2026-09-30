const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, 'clean_fleet_migration_data.json');
if (!fs.existsSync(dataFile)) {
  console.error('clean_fleet_migration_data.json does not exist!');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

const lines = [];
lines.push('-- =========================================================');
lines.push('-- SUNSEEKERS FLEET MANAGEMENT MIGRATION SCRIPT');
lines.push('-- =========================================================');
lines.push('BEGIN;');

// 1. Vehicles
const vehicleIdMap = new Map(); // name -> id
lines.push('\n-- 1. Upsert Vehicles');
for (const v of data.vehicles) {
  const id = `veh-${slugify(v.name)}`;
  vehicleIdMap.set(v.name.toLowerCase(), id);
  lines.push(`
INSERT INTO vehicles (id, name, "registrationNo", type, capacity, notes, "isActive", "createdAt", "updatedAt")
VALUES (${escapeSql(id)}, ${escapeSql(v.name)}, ${escapeSql(v.registrationNo)}, ${escapeSql(v.type)}::"VehicleType", ${v.capacity || 30}, ${escapeSql(v.notes)}, true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  "registrationNo" = EXCLUDED."registrationNo",
  type = EXCLUDED.type,
  capacity = EXCLUDED.capacity,
  notes = EXCLUDED.notes;
  `.trim());
}

// 2. Drivers
const driverIdMap = new Map(); // name -> id
lines.push('\n-- 2. Upsert Drivers');
for (const d of data.drivers) {
  const fullName = `${d.firstName} ${d.lastName}`;
  const id = `drv-${slugify(fullName)}`;
  driverIdMap.set(fullName.toLowerCase(), id);
  lines.push(`
INSERT INTO drivers (id, "firstName", "lastName", phone, email, "licenseNumber", "isActive", "createdAt", "updatedAt")
VALUES (${escapeSql(id)}, ${escapeSql(d.firstName)}, ${escapeSql(d.lastName)}, ${escapeSql(d.phone || null)}, ${escapeSql(d.email || null)}, ${escapeSql(d.licenseNumber || null)}, true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName",
  phone = EXCLUDED.phone,
  email = EXCLUDED.email;
  `.trim());
}

// 3. Fleet Bookings
lines.push('\n-- 3. Insert Fleet Bookings');
let bookingIdx = 0;
for (const b of data.bookings) {
  bookingIdx++;
  const id = `flt-${String(bookingIdx).padStart(6, '0')}`;
  let vehId = vehicleIdMap.get(b.vehicleName.toLowerCase());
  if (!vehId) {
    vehId = vehicleIdMap.get('sstc 24') || 'veh-sstc-24';
  }

  let drvId = null;
  if (b.driverName) {
    drvId = driverIdMap.get(b.driverName.toLowerCase()) || null;
  }

  const startIso = b.startDate.replace('T', ' ').replace('.000Z', '');
  const endIso = b.endDate.replace('T', ' ').replace('.000Z', '');

  lines.push(`
INSERT INTO fleet_bookings (
  id, company, destination, "startDate", "endDate", "vehicleId", "driverName", "driverId",
  "departTime", notes, color, "ratePerDay", "totalAmount", currency, "invoiceNumber",
  "quoteNumber", "paymentStatus", "createdAt", "updatedAt"
) VALUES (
  ${escapeSql(id)},
  ${escapeSql(b.company)},
  ${escapeSql(b.destination)},
  ${escapeSql(startIso)}::timestamp,
  ${escapeSql(endIso)}::timestamp,
  ${escapeSql(vehId)},
  ${escapeSql(b.driverName)},
  ${escapeSql(drvId)},
  ${escapeSql(b.departTime)},
  ${escapeSql(b.notes)},
  ${escapeSql(b.color)},
  ${b.ratePerDay !== null ? b.ratePerDay : 'NULL'},
  ${b.totalAmount !== null ? b.totalAmount : 'NULL'},
  'GHS',
  ${escapeSql(b.invoiceNumber)},
  ${escapeSql(b.quoteNumber)},
  ${escapeSql(b.paymentStatus)},
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;
  `.trim());
}

lines.push('\nCOMMIT;');

const sqlContent = lines.join('\n');
const outPath = path.join(__dirname, 'fleet_migration.sql');
fs.writeFileSync(outPath, sqlContent, 'utf8');

console.log(`Generated SQL migration script at: ${outPath}`);
console.log(`File size: ${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB`);
console.log(`Total statements: ${lines.length}`);
