const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const filePath = path.join(__dirname, '..', 'fleet_sheet.xlsx');
if (!fs.existsSync(filePath)) {
  console.error('fleet_sheet.xlsx not found!');
  process.exit(1);
}

const wb = xlsx.readFile(filePath);

// ── Master Vehicles ───────────────────────────────────────────
const masterVehicles = [
  { name: 'SSTC 12', reg: 'SSTC 12', type: 'BUS', capacity: 35, notes: 'Sunseekers Tour Coach 12' },
  { name: 'SSTC 17', reg: 'SSTC 17', type: 'BUS', capacity: 35, notes: 'Sunseekers Tour Coach 17' },
  { name: 'SSTC 22', reg: 'SSTC 22', type: 'BUS', capacity: 45, notes: 'Sunseekers Tour Coach 22' },
  { name: 'SSTC 24', reg: 'SSTC 24', type: 'BUS', capacity: 45, notes: 'Sunseekers Tour Coach 24' },
  { name: 'Coach 31', reg: 'Coach 31', type: 'BUS', capacity: 31, notes: 'Sunseekers Coach 31' },
  { name: 'Coach 35', reg: 'Coach 35', type: 'BUS', capacity: 35, notes: 'Sunseekers Coach 35' },
  { name: 'SSTM 22', reg: 'SSTM 22', type: 'VAN', capacity: 22, notes: 'Sunseekers Midi Bus 22' },
  { name: 'SSTM 23', reg: 'SSTM 23', type: 'VAN', capacity: 23, notes: 'Sunseekers Midi Bus 23' },
  { name: 'SST2', reg: 'SST2', type: 'VAN', capacity: 22, notes: 'Toyota Coaster SST2' },
  { name: 'SST3', reg: 'SST3', type: 'VAN', capacity: 22, notes: 'Toyota Coaster SST3' },
  { name: 'SST4', reg: 'SST4', type: 'VAN', capacity: 22, notes: 'Toyota Coaster SST4' },
  { name: 'SST5', reg: 'SST5', type: 'VAN', capacity: 22, notes: 'Toyota Coaster SST5' },
  { name: 'SST7', reg: 'SST7', type: 'VAN', capacity: 22, notes: 'Toyota Coaster SST7' },
  { name: 'SSTP 18', reg: 'SSTP 18', type: 'SUV_4X4', capacity: 7, notes: 'Toyota Land Cruiser Prado 18' },
  { name: 'SSTP 21', reg: 'SSTP 21', type: 'SUV_4X4', capacity: 7, notes: 'Toyota Land Cruiser Prado 21' },
  { name: 'SSTP 25', reg: 'SSTP 25', type: 'SUV_4X4', capacity: 7, notes: 'Toyota Land Cruiser Prado 25' },
  { name: 'SSTPJ', reg: 'SSTPJ', type: 'SUV_4X4', capacity: 7, notes: 'Mitsubishi Pajero SSTPJ' },
  { name: 'Prado', reg: 'Prado', type: 'SUV_4X4', capacity: 7, notes: 'Executive Toyota Prado' },
  { name: 'Camry', reg: 'Camry', type: 'SEDAN', capacity: 5, notes: 'Toyota Camry Sedan' },
  { name: 'Coach (Hired)', reg: 'Coach-HRD', type: 'BUS', capacity: 45, notes: 'Subcontracted External Coach' },
  { name: 'SST Coach (Hired)', reg: 'SSTC-HRD', type: 'BUS', capacity: 45, notes: 'Subcontracted Coach' },
  { name: 'SSTM (Hired)', reg: 'SSTM-HRD', type: 'VAN', capacity: 23, notes: 'Subcontracted Midi Bus' },
  { name: 'SSTP (Hired)', reg: 'SSTP-HRD', type: 'SUV_4X4', capacity: 7, notes: 'Subcontracted Prado / SUV' },
  { name: '4WD (Hired)', reg: '4WD-HRD', type: 'SUV_4X4', capacity: 7, notes: 'Subcontracted 4x4' },
];

// ── Master Drivers ─────────────────────────────────────────────
const masterDrivers = [
  { first: 'Alhaji', last: 'Abass', phone: '0244100001', aliases: ['alhaji', 'abass', 'alhaji abass'] },
  { first: 'Theo', last: 'Sapati', phone: '0244100002', aliases: ['theo', 'sapati', 'theo sapati'] },
  { first: 'George', last: 'Awuku', phone: '0244100003', aliases: ['george', 'awuku', 'george awuku'] },
  { first: 'James', last: 'Dagba', phone: '0244100004', aliases: ['dagba', 'dagbaa', 'james d', 'james dagba', 'jd'] },
  { first: 'James', last: 'Agbaglo', phone: '0244100005', aliases: ['agbaglo', 'james a', 'james agbaglo', 'ja'] },
  { first: 'Derrick', last: 'Somuah', phone: '0244100006', aliases: ['derek', 'derick', 'derrick', 'derrick somuah'] },
  { first: 'Fred', last: 'Amoah', phone: '0244100007', aliases: ['fred', 'freddy'] },
  { first: 'Obeng', last: 'Kusi', phone: '0244100008', aliases: ['obeng'] },
  { first: 'Daniel', last: 'Kwarteng', phone: '0244100009', aliases: ['daniel', 'dk'] },
  { first: 'Franklin', last: 'Mensah', phone: '0244100010', aliases: ['franklin', 'frank'] },
  { first: 'Philip', last: 'Adonji', phone: '0244100011', aliases: ['philip', 'adonji', 'philip adonji'] },
  { first: 'Prosper', last: 'Ocloo', phone: '0244100012', aliases: ['prosper', 'pros', 'ocloo'] },
  { first: 'Eskel', last: 'Appiah', phone: '0244100013', aliases: ['eskel', 'exkel'] },
  { first: 'Francis', last: 'Agyemang', phone: '0244100014', aliases: ['francis'] },
  { first: 'Akwasi', last: 'Boakye', phone: '0244100015', aliases: ['akwasi', 'akwesi'] },
  { first: 'Kelvin', last: 'Asempa', phone: '0244100016', aliases: ['kelvin'] },
  { first: 'Isaac', last: 'Ato', phone: '0244100017', aliases: ['isaac', 'ato', 'ato isaac'] },
  { first: 'Kofi', last: 'Nana', phone: '0244100018', aliases: ['kofi', 'nana kofi'] },
  { first: 'Bright', last: 'Owusu', phone: '0244100019', aliases: ['bright'] },
  { first: 'Godwin', last: 'Amegashie', phone: '0244100020', aliases: ['godwin'] },
  { first: 'Moses', last: 'Frimpong', phone: '0244100021', aliases: ['moses', 'frimpong'] },
  { first: 'Muniru', last: 'Issah', phone: '0244100022', aliases: ['muniru', 'musa', 'musah'] },
  { first: 'Akoto', last: 'Yaw', phone: '0532849922', aliases: ['akoto'] },
  { first: 'Duke', last: 'Baffour', phone: '0244100023', aliases: ['duke'] },
  { first: 'Elvis', last: 'Tetteh', phone: '0244100024', aliases: ['elvis'] },
  { first: 'Fatawu', last: 'Seidu', phone: '0244100025', aliases: ['fatawu'] },
  { first: 'Ben', last: 'Quaye', phone: '0244100026', aliases: ['ben'] },
  { first: 'Christian', last: 'Atta', phone: '0244100027', aliases: ['christian'] },
];

const COLOR_PALETTE = [
  '#2563eb', '#059669', '#dc2626', '#ea580c', '#7c3aed',
  '#d97706', '#0d9488', '#e11d48', '#4f46e5', '#65a30d',
  '#0891b2', '#475569', '#0284c7', '#16a34a', '#9333ea',
];

function getColorForClient(clientName) {
  let hash = 0;
  for (let i = 0; i < clientName.length; i++) {
    hash = clientName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[idx];
}

const monthMap = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

function parseSheetMonthYear(sheetName) {
  const s = sheetName.trim();
  // Must end with 2 digits or 4 digits
  const match = s.match(/^([A-Za-z]+)\s*(\d{2}|\d{4})$/);
  if (!match) return null;

  const mStr = match[1].toLowerCase().slice(0, 3);
  if (!monthMap[mStr]) return null;

  let yVal = parseInt(match[2], 10);
  if (match[2].length === 2) {
    yVal = yVal > 50 ? 1900 + yVal : 2000 + yVal;
  }
  return { month: monthMap[mStr], year: yVal };
}

function parseDatesString(datesStr, defaultYear, defaultMonth) {
  if (!datesStr) return null;
  const str = String(datesStr).trim();

  // Excel serial date? (e.g. 46261)
  const num = Number(str);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const d = new Date((num - 25569) * 86400 * 1000);
    return {
      start: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())),
      end: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    };
  }

  // Range pattern like "3-6 Sep", "23-28 Sep", "18-25 Jan"
  const simpleRange = str.match(/^(\d{1,2})\s*[-–to&]+\s*(\d{1,2})\s*([A-Za-z]+)?$/);
  if (simpleRange) {
    const d1 = parseInt(simpleRange[1], 10);
    const d2 = parseInt(simpleRange[2], 10);
    let m = defaultMonth;
    if (simpleRange[3]) {
      const mStr = simpleRange[3].toLowerCase().slice(0, 3);
      if (monthMap[mStr]) m = monthMap[mStr];
    }
    const startDay = Math.min(d1, d2);
    const endDay = Math.max(d1, d2);
    return {
      start: new Date(Date.UTC(defaultYear, m - 1, startDay)),
      end: new Date(Date.UTC(defaultYear, m - 1, endDay))
    };
  }

  // Cross month range like "28Dec - 5Jan", "27Dec-7Jan", "Aug 23- Sep 1", "Jan 28 - Feb 6"
  const crossMonth = str.match(/([A-Za-z]+)?\s*(\d{1,2})\s*([A-Za-z]+)?\s*[-–to]+\s*([A-Za-z]+)?\s*(\d{1,2})\s*([A-Za-z]+)?/);
  if (crossMonth) {
    let m1 = defaultMonth, m2 = defaultMonth;
    const d1 = parseInt(crossMonth[2], 10);
    const d2 = parseInt(crossMonth[5], 10);

    const mText1 = crossMonth[1] || crossMonth[3];
    const mText2 = crossMonth[4] || crossMonth[6];

    if (mText1 && monthMap[mText1.toLowerCase().slice(0, 3)]) {
      m1 = monthMap[mText1.toLowerCase().slice(0, 3)];
    }
    if (mText2 && monthMap[mText2.toLowerCase().slice(0, 3)]) {
      m2 = monthMap[mText2.toLowerCase().slice(0, 3)];
    }

    let y1 = defaultYear;
    let y2 = defaultYear;
    if (m1 === 12 && m2 === 1) {
      y1 = defaultYear - 1; // Dec previous year to Jan current year
    }

    if (!isNaN(d1) && !isNaN(d2)) {
      return {
        start: new Date(Date.UTC(y1, m1 - 1, d1)),
        end: new Date(Date.UTC(y2, m2 - 1, d2))
      };
    }
  }

  // Single day like "14th Jan", "5th Sep", "14"
  const single = str.match(/(\d{1,2})/);
  if (single) {
    const day = parseInt(single[1], 10);
    if (day >= 1 && day <= 31) {
      return {
        start: new Date(Date.UTC(defaultYear, defaultMonth - 1, day)),
        end: new Date(Date.UTC(defaultYear, defaultMonth - 1, day))
      };
    }
  }

  return null;
}

function resolveVehicleName(raw) {
  if (!raw) return 'SSTC 24';
  const s = raw.trim();
  const lower = s.toLowerCase();

  for (const mv of masterVehicles) {
    if (lower === mv.name.toLowerCase() || lower === mv.reg.toLowerCase()) {
      return mv.name;
    }
  }

  if (lower.includes('sstc 12') || lower.includes('c 12') || lower.includes('sstc12')) return 'SSTC 12';
  if (lower.includes('sstc 17') || lower.includes('c 17') || lower.includes('sstc17')) return 'SSTC 17';
  if (lower.includes('sstc 22') || lower.includes('c 22') || lower.includes('sstc22')) return 'SSTC 22';
  if (lower.includes('sstc 24') || lower.includes('c 24') || lower.includes('sstc24')) return 'SSTC 24';
  if (lower.includes('sstm 22') || lower.includes('m 22') || lower.includes('sstm22')) return 'SSTM 22';
  if (lower.includes('sstm 23') || lower.includes('m 23') || lower.includes('sstm23')) return 'SSTM 23';
  if (lower.includes('sstp 18') || lower.includes('p 18') || lower.includes('sstp18')) return 'SSTP 18';
  if (lower.includes('sstp 21') || lower.includes('p 21') || lower.includes('sstp21')) return 'SSTP 21';
  if (lower.includes('sstp 25') || lower.includes('p 25') || lower.includes('sstp25')) return 'SSTP 25';
  if (lower.includes('sst2')) return 'SST2';
  if (lower.includes('sst3')) return 'SST3';
  if (lower.includes('sst4')) return 'SST4';
  if (lower.includes('sst5')) return 'SST5';
  if (lower.includes('sst7')) return 'SST7';
  if (lower.includes('pajero') || lower.includes('sstpj')) return 'SSTPJ';
  if (lower.includes('prado')) {
    if (lower.includes('hrd') || lower.includes('hired')) return 'SSTP (Hired)';
    return 'Prado';
  }
  if (lower.includes('camry')) return 'Camry';
  if (lower.includes('coach 31')) return 'Coach 31';
  if (lower.includes('coach 35')) return 'Coach 35';
  if (lower.includes('coach')) {
    if (lower.includes('hrd') || lower.includes('hired')) return 'Coach (Hired)';
    return 'SSTC 24';
  }
  if (lower.includes('coaster') || lower.includes('coster')) return 'SST2';
  if (lower.includes('hrd') || lower.includes('hired')) return 'Coach (Hired)';

  return 'SSTC 24';
}

function resolveDriver(raw) {
  if (!raw) return { name: 'Assigned Driver', match: null };
  const s = raw.trim();
  const lower = s.toLowerCase();

  for (const md of masterDrivers) {
    for (const alias of md.aliases) {
      if (lower === alias || lower.startsWith(alias + ' ') || lower.endsWith(' ' + alias) || lower.includes(alias)) {
        return { name: `${md.first} ${md.last}`, match: md };
      }
    }
  }
  return { name: s, match: null };
}

// ── Build Collections ──────────────────────────────────────────
const discoveredVehicles = new Map();
const discoveredDrivers = new Map();

for (const mv of masterVehicles) {
  discoveredVehicles.set(mv.name, {
    name: mv.name,
    registrationNo: mv.reg,
    type: mv.type,
    capacity: mv.capacity,
    notes: mv.notes,
    isActive: true,
  });
}

for (const md of masterDrivers) {
  const fullName = `${md.first} ${md.last}`;
  discoveredDrivers.set(fullName, {
    firstName: md.first,
    lastName: md.last,
    phone: md.phone,
    email: `${md.first.toLowerCase()}.${md.last.toLowerCase()}@sunseekerstours.com`,
    licenseNumber: `GH-DL-${md.last.toUpperCase().slice(0, 3)}-${Math.floor(1000 + Math.random() * 9000)}`,
    isActive: true,
  });
}

const targetSheets = wb.SheetNames.filter(name => {
  const p = parseSheetMonthYear(name);
  if (!p) return false;
  // Years 2023 to 2027
  return p.year >= 2023 && p.year <= 2027;
});

console.log(`Target sheets matching 2023-2027: ${targetSheets.length}`);

const allExtractedBookings = [];
let invoiceCounter = 2000;
let quoteCounter = 2000;

for (const sheetName of targetSheets) {
  const p = parseSheetMonthYear(sheetName);
  if (!p) continue;
  const { month, year } = p;

  const sheet = wb.Sheets[sheetName];
  if (!sheet) continue;
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (rows.length < 2) continue;

  let colCompany = 1, colDates = 2, colDest = 3, colVeh = 4, colDrv = 5, colDepart = 6;
  let colSstIn = -1;
  const r0 = rows[0] || [];
  for (let c = 0; c < r0.length; c++) {
    const t = String(r0[c]).toUpperCase().trim();
    if (t === 'COMPANY' || t === 'CLIENT') colCompany = c;
    if (t === 'DATES' || t === 'DATE') colDates = c;
    if (t === 'DESTINATIONS' || t === 'DESTINATION') colDest = c;
    if (t === 'VEHICLE' || t === 'BUS') colVeh = c;
    if (t === 'DRIVER') colDrv = c;
    if (t === 'DEPART') colDepart = c;
    if (t === 'SST IN' || t === 'SSTIN') colSstIn = c;
  }

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const comp = String(row[colCompany] || '').trim();
    const vehRaw = String(row[colVeh] || '').trim();
    const drvRaw = String(row[colDrv] || '').trim();
    const datesRaw = row[colDates];
    const destRaw = String(row[colDest] || '').trim();
    const departRaw = String(row[colDepart] || '').trim();
    const revRaw = colSstIn !== -1 ? row[colSstIn] : '';

    // Ignore empty or header rows
    if (!comp && !vehRaw && !destRaw) continue;
    if (comp.toUpperCase() === 'COMPANY' || comp.toUpperCase() === 'CLIENT') continue;
    if (destRaw.toUpperCase() === 'DESTINATIONS' || destRaw.toUpperCase() === 'DESTINATION') continue;
    if (vehRaw.toUpperCase() === 'VEHICLE' || vehRaw.toUpperCase() === 'BUS') continue;
    if (comp === '-' || comp === '.' || comp === '--') continue;

    // Check Day columns (columns 7 to 37) for active day markers
    let dayMin = 999;
    let dayMax = -1;
    for (let c = 7; c < Math.min(row.length, 38); c++) {
      const cellVal = String(row[c] || '').trim().toUpperCase();
      const colHeaderDay = parseInt(String(r0[c] || ''), 10);
      if (!isNaN(colHeaderDay) && colHeaderDay >= 1 && colHeaderDay <= 31) {
        if (cellVal !== '' && cellVal !== '0') {
          if (colHeaderDay < dayMin) dayMin = colHeaderDay;
          if (colHeaderDay > dayMax) dayMax = colHeaderDay;
        }
      }
    }

    let parsedDates = null;
    if (dayMin !== 999 && dayMax !== -1) {
      parsedDates = {
        start: new Date(Date.UTC(year, month - 1, dayMin)),
        end: new Date(Date.UTC(year, month - 1, dayMax)),
      };
    } else {
      parsedDates = parseDatesString(datesRaw, year, month);
    }

    if (!parsedDates) {
      parsedDates = {
        start: new Date(Date.UTC(year, month - 1, 1)),
        end: new Date(Date.UTC(year, month - 1, 1)),
      };
    }

    const resolvedVeh = resolveVehicleName(vehRaw);
    const { name: resolvedDriverName } = resolveDriver(drvRaw);

    // Revenue
    let totalAmount = 0;
    if (revRaw) {
      const cleaned = String(revRaw).replace(/[^0-9.]/g, '');
      const num = parseFloat(cleaned);
      if (!isNaN(num) && num > 0) totalAmount = num;
    }

    const diffDays = Math.max(1, Math.round((parsedDates.end.getTime() - parsedDates.start.getTime()) / (1000 * 86400)) + 1);
    const ratePerDay = totalAmount > 0 ? Math.round(totalAmount / diffDays) : null;

    let invoiceNumber = null;
    let quoteNumber = null;
    if (totalAmount > 0) {
      invoiceCounter++;
      quoteCounter++;
      invoiceNumber = `INV-FLT-${year}-${String(invoiceCounter).padStart(5, '0')}`;
      quoteNumber = `QTE-FLT-${year}-${String(quoteCounter).padStart(5, '0')}`;
    }

    const bookingRecord = {
      company: comp || destRaw || 'Private Charter',
      destination: destRaw || 'Ghana Tour',
      startDate: parsedDates.start.toISOString().split('T')[0] + 'T00:00:00.000Z',
      endDate: parsedDates.end.toISOString().split('T')[0] + 'T23:59:59.000Z',
      vehicleName: resolvedVeh,
      driverName: resolvedDriverName,
      departTime: departRaw || null,
      notes: `Sheet: ${sheetName} | Row: ${r + 1}${datesRaw ? ` | Dates: ${datesRaw}` : ''}`,
      color: getColorForClient(comp || destRaw || 'Charter'),
      ratePerDay: ratePerDay,
      totalAmount: totalAmount > 0 ? totalAmount : null,
      currency: 'GHS',
      invoiceNumber: invoiceNumber,
      quoteNumber: quoteNumber,
      paymentStatus: totalAmount > 0 ? 'PAID' : 'UNPAID',
    };

    allExtractedBookings.push(bookingRecord);
  }
}

console.log(`\n=== CLEAN DATA SUMMARY ===`);
console.log(`Total Vehicles: ${discoveredVehicles.size}`);
console.log(`Total Drivers: ${discoveredDrivers.size}`);
console.log(`Total Clean Bookings (2023-2027): ${allExtractedBookings.length}`);
console.log(`Bookings with Recorded Revenue: ${allExtractedBookings.filter(b => b.totalAmount).length}`);
console.log(`Total Revenue Logged: GHS ${allExtractedBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0).toLocaleString()}`);

// Write to bundle
const bundle = {
  vehicles: Array.from(discoveredVehicles.values()),
  drivers: Array.from(discoveredDrivers.values()),
  bookings: allExtractedBookings,
};

fs.writeFileSync(
  path.join(__dirname, 'clean_fleet_migration_data.json'),
  JSON.stringify(bundle, null, 2)
);

console.log('Saved clean dataset to scripts/clean_fleet_migration_data.json');
