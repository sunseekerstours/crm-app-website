const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const filePath = path.join(__dirname, '..', 'fleet_sheet.xlsx');
const wb = xlsx.readFile(filePath);

function inspectSheet(sheetName, maxRows = 15) {
  console.log(`\n=================== SHEET: ${sheetName} ===================`);
  const sheet = wb.Sheets[sheetName];
  if (!sheet) {
    console.log('Sheet not found!');
    return;
  }
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log(`Total rows: ${data.length}`);
  for (let i = 0; i < Math.min(data.length, maxRows); i++) {
    // print row if not empty
    const nonEmpties = data[i].filter(c => c !== '');
    if (nonEmpties.length > 0) {
      console.log(`Row ${i}:`, JSON.stringify(data[i].slice(0, 15)));
    }
  }
}

inspectSheet('Schd25', 20);
inspectSheet('Jan 25', 20);
inspectSheet('Jan 26', 20);
inspectSheet('Sheet1', 15);
inspectSheet('Sheet2', 15);
inspectSheet('Sheet3', 15);
