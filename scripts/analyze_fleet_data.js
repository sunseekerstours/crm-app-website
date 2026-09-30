const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const filePath = path.join(__dirname, '..', 'fleet_sheet.xlsx');
const wb = xlsx.readFile(filePath);

const vehicles = new Set();
const drivers = new Set();
const companies = new Set();
let totalBookings = 0;
const monthlyStats = [];

// Sample recent years: 2024, 2025, 2026, 2027
const targetSheets = wb.SheetNames.filter(name => {
  const n = name.trim().toLowerCase();
  return (
    n.endsWith('24') || n.endsWith('25') || n.endsWith('26') || n.endsWith('27') ||
    n.includes('schd')
  );
});

console.log('Target sheets to analyze:', targetSheets.length);

for (const sheetName of targetSheets) {
  if (sheetName.toLowerCase().startsWith('schd')) continue;
  const sheet = wb.Sheets[sheetName];
  if (!sheet) continue;
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (rows.length < 2) continue;

  // Find header row with COMPANY / VEHICLE / DRIVER
  let headerIdx = -1;
  let colCompany = -1;
  let colVehicle = -1;
  let colDriver = -1;
  let colDates = -1;
  let colDest = -1;

  for (let r = 0; r < Math.min(rows.length, 5); r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const val = String(row[c]).toUpperCase().trim();
      if (val === 'COMPANY' || val === 'CLIENT') colCompany = c;
      if (val === 'VEHICLE' || val === 'BUS' || val === 'CAR') colVehicle = c;
      if (val === 'DRIVER') colDriver = c;
      if (val === 'DATES' || val === 'DATE') colDates = c;
      if (val === 'DESTINATIONS' || val === 'DESTINATION') colDest = c;
    }
    if (colCompany !== -1 || colVehicle !== -1) {
      headerIdx = r;
      break;
    }
  }

  let countInSheet = 0;
  if (headerIdx !== -1) {
    for (let r = headerIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      const comp = colCompany !== -1 ? String(row[colCompany] || '').trim() : '';
      const veh = colVehicle !== -1 ? String(row[colVehicle] || '').trim() : '';
      const drv = colDriver !== -1 ? String(row[colDriver] || '').trim() : '';

      if (comp || veh || drv) {
        if (veh && veh.length < 30) vehicles.add(veh);
        if (drv && drv.length < 30) drivers.add(drv);
        if (comp && comp.length < 50) companies.add(comp);
        countInSheet++;
      }
    }
  }
  monthlyStats.push({ sheet: sheetName, bookings: countInSheet });
  totalBookings += countInSheet;
}

console.log('=== SUMMARY OF RECENT YEARS (2024-2027) ===');
console.log(`Total Sheets checked: ${monthlyStats.length}`);
console.log(`Total Booking rows found: ${totalBookings}`);
console.log(`Unique Vehicles found: ${vehicles.size}`);
console.log('Vehicles list:', Array.from(vehicles).sort());
console.log(`Unique Drivers found: ${drivers.size}`);
console.log('Drivers list:', Array.from(drivers).sort());
console.log(`Unique Companies/Clients found: ${companies.size}`);
console.log('Sample Companies/Clients:', Array.from(companies).slice(0, 25));
console.log('Sample monthly booking counts:', monthlyStats.slice(-15));
