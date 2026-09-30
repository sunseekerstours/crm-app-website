const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'fleet_sheet.xlsx');
const wb = xlsx.readFile(filePath);

const sheet = wb.Sheets['Sep 26'];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

console.log('Sep 26 Headers (Row 0):');
rows[0].forEach((col, idx) => {
  if (col !== '') console.log(`Col ${idx}: ${col}`);
});

console.log('\nSample Row 1 full:');
rows[1].forEach((val, idx) => {
  if (val !== '') console.log(`Col ${idx} (${rows[0][idx]}): ${val}`);
});
