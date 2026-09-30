const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const filePath = path.join(__dirname, '..', 'fleet_sheet.xlsx');
const wb = xlsx.readFile(filePath, { cellStyles: true });

function inspectCalendarSheet(sheetName) {
  console.log(`\n=================== CALENDAR INSPECTION: ${sheetName} ===================`);
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return;
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  // print header
  console.log('Row 0 (Headers):', rows[0].slice(0, 20));
  
  // Look at rows 1 to 20
  for (let r = 1; r < Math.min(rows.length, 25); r++) {
    const row = rows[r];
    const comp = row[1];
    const dates = row[2];
    const dest = row[3];
    const veh = row[4];
    const drv = row[5];
    const depart = row[6];
    
    // Check day columns 7 to 37 (days 1 to 31)
    const dayCells = [];
    for (let c = 7; c < row.length; c++) {
      if (row[c] !== '') {
        const dayNum = rows[0][c];
        dayCells.push({ day: dayNum, val: row[c] });
      }
    }
    
    if (comp || veh || drv || dayCells.length > 0) {
      console.log(`Row ${r}: [Company: "${comp}"] [Dates: "${dates}"] [Dest: "${dest}"] [Veh: "${veh}"] [Drv: "${drv}"] [Depart: "${depart}"] ActiveDays:`, JSON.stringify(dayCells));
    }
  }
}

inspectCalendarSheet('Jan 26');
inspectCalendarSheet('Sep 26');
