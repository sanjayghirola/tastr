/**
 * Generate CSV string from array of objects.
 * @param {Array<Object>} data
 * @param {string[]} columns - keys to include
 * @param {Object} headers - optional { key: 'Display Name' } mapping
 */
export function toCSV(data, columns, headers = {}) {
  const headerRow = columns.map(c => headers[c] || c).join(',');
  const rows = data.map(row =>
    columns.map(c => {
      let val = row[c];
      if (val === null || val === undefined) val = '';
      if (val instanceof Date) val = val.toISOString();
      if (typeof val === 'object') val = JSON.stringify(val);
      val = String(val).replace(/"/g, '""');
      return `"${val}"`;
    }).join(',')
  );
  return [headerRow, ...rows].join('\n');
}

/**
 * Send CSV as downloadable response
 */
export function sendCSV(res, data, columns, filename, headers = {}) {
  const csv = toCSV(data, columns, headers);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}
