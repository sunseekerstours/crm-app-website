const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const filePath = path.join(__dirname, '..', 'fleet_sheet.xlsx');
if (!fs.existsSync(filePath)) {
  console.error('fleet_sheet.xlsx does not exist yet!');
  process.exit(1);
}

const stats = fs.statSync(filePath);
console.log('File size:', stats.size, 'bytes');

const wb = xlsx.readFile(filePath);
console.log('Total sheet count:', wb.SheetNames.length);
console.log('Sheet names (first 20):', wb.SheetNames.slice(0, 20));
console.log('Sheet names (last 20):', wb.SheetNames.slice(-20));

// Find schedule or master sheets
const interestingSheets = wb.SheetNames.filter(s => s.toLowerCase().includes('schd') || s.toLowerCase().includes('fleet') || s.toLowerCase().includes('driver') || s.toLowerCase().includes('car') || s.toLowerCase().includes('bus') || s.toLowerCase().includes('25') || s.toLowerCase().includes('26'));
console.log('Interesting sheet names:', interestingSheets);
