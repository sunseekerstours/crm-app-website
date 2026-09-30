const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'fleet_sheet.xlsx');
const wb = xlsx.readFile(filePath);

const yearSummary = {};
const coreVehicles = new Map();
const coreDrivers = new Map();

const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

wb.SheetNames.forEach(sheetName => {
  const s = sheetName.trim();
  // Find year
  let year = null;
  const match = s.match(/(\d{2})$/);
  if (match) {
    const yrNum = parseInt(match[1], 10);
    year = yrNum > 50 ? 1900 + yrNum : 2000 + yrNum;
  } else {
    // maybe no year or schedule
    if (s.toLowerCase().startsWith('schd')) year = 'Schedules';
    else year = 'Other/Older';
  }

  if (!yearSummary[year]) yearSummary[year] = { sheets: 0, rows: 0, revenueCount: 0 };
  yearSummary[year].sheets++;

  const sheet = wb.Sheets[sheetName];
  if (!sheet) return;
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (rows.length < 2) return;

  // Header detection
  let colCompany = 1, colVeh = 4, colDrv = 5, colSstIn = -1;
  const r0 = rows[0] || [];
  for (let c = 0; c < r0.length; c++) {
    const title = String(r0[c]).toUpperCase().trim();
    if (title === 'COMPANY' || title === 'CLIENT') colCompany = c;
    if (title === 'VEHICLE' || title === 'BUS') colVeh = c;
    if (title === 'DRIVER') colDrv = c;
    if (title === 'SST IN' || title === 'SSTIN') colSstIn = c;
  }

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const comp = String(row[colCompany] || '').trim();
    const veh = String(row[colVeh] || '').trim();
    const drv = String(row[colDrv] || '').trim();
    const rev = colSstIn !== -1 ? row[colSstIn] : '';

    if (comp || veh || drv) {
      yearSummary[year].rows++;
      if (rev) yearSummary[year].revenueCount++;

      if (veh && veh.length <= 25) {
        coreVehicles.set(veh, (coreVehicles.get(veh) || 0) + 1);
      }
      if (drv && drv.length <= 25 && !drv.includes('pm') && !drv.includes('am')) {
        coreDrivers.set(drv, (coreDrivers.get(drv) || 0) + 1);
      }
    }
  }
});

console.log('=== YEAR BY YEAR BREAKDOWN ===');
console.table(yearSummary);

console.log('\n=== TOP 25 VEHICLES BY FREQUENCY ===');
const sortedVeh = Array.from(coreVehicles.entries()).sort((a,b) => b[1] - a[1]).slice(0, 25);
console.table(sortedVeh.map(([v, count]) => ({ Vehicle: v, Bookings: count })));

console.log('\n=== TOP 25 DRIVERS BY FREQUENCY ===');
const sortedDrv = Array.from(coreDrivers.entries()).sort((a,b) => b[1] - a[1]).slice(0, 25);
console.table(sortedDrv.map(([d, count]) => ({ Driver: d, Bookings: count })));
