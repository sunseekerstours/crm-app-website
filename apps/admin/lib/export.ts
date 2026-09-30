/**
 * Universal Data Export Utility for Sunseekers CRM Super Admin
 * Exports arrays of objects to CSV or JSON with Excel UTF-8 BOM support.
 */

export interface ExportColumn<T = any> {
  key: string;
  label: string;
  format?: (row: T) => any;
}

function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '';
  if (Array.isArray(val)) {
    val = val.join(', ');
  } else if (typeof val === 'object') {
    if (val.name) val = val.name;
    else if (val.title) val = val.title;
    else val = JSON.stringify(val);
  }
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCSV<T extends Record<string, any>>(
  rows: T[],
  filename: string,
  columns?: ExportColumn<T>[]
): void {
  if (!rows || rows.length === 0) {
    if (typeof window !== 'undefined') {
      window.alert('No records available to export.');
    }
    return;
  }

  let headers: string[] = [];
  let keys: string[] = [];

  if (columns && columns.length > 0) {
    headers = columns.map((c) => escapeCSV(c.label));
    keys = columns.map((c) => c.key);
  } else {
    // Infer columns from first row
    keys = Object.keys(rows[0]).filter((k) => k !== 'id' && typeof rows[0][k] !== 'function');
    headers = keys.map((k) => escapeCSV(k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, ' $1')));
  }

  const csvLines: string[] = [];
  csvLines.push(headers.join(','));

  for (const row of rows) {
    const line: string[] = [];
    if (columns && columns.length > 0) {
      for (const col of columns) {
        if (col.format) {
          line.push(escapeCSV(col.format(row)));
        } else {
          line.push(escapeCSV(row[col.key]));
        }
      }
    } else {
      for (const key of keys) {
        line.push(escapeCSV(row[key]));
      }
    }
    csvLines.push(line.join(','));
  }

  // Prepend UTF-8 BOM (\uFEFF) so Excel respects UTF-8 encoding
  const csvContent = '\uFEFF' + csvLines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const cleanName = filename.endsWith('.csv') ? filename : `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.setAttribute('download', cleanName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToJSON<T>(rows: T[], filename: string): void {
  if (!rows || rows.length === 0) {
    if (typeof window !== 'undefined') {
      window.alert('No records available to export.');
    }
    return;
  }
  const jsonContent = JSON.stringify(rows, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const cleanName = filename.endsWith('.json') ? filename : `${filename}_${new Date().toISOString().split('T')[0]}.json`;
  link.setAttribute('download', cleanName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
