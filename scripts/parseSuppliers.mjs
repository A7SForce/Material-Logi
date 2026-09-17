import fs from 'fs';

const csv = fs.readFileSync('D:\\Downloads\\suppliers_2026-09-15.csv', 'utf8');
const lines = csv.split('\n').filter(l => l.trim());

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

function cleanPhone(s) {
  if (!s) return null;
  s = s.replace(/\s+/g, ' ').trim();
  const m = s.match(/(\+?60[\d\s\-]+|0\d[\d\s\-]+)/);
  if (m) return m[1].replace(/[\s\-]/g, '').trim();
  return null;
}

const suppliers = [];
const seen = new Set();

for (const row of lines.slice(1)) {
  const cols = parseCSVLine(row);
  const name = (cols[0] || '').replace(/"/g, '').trim();
  if (!name) continue;

  const categories = (cols[1] || '').replace(/"/g, '').trim();
  const location = (cols[2] || '').replace(/"/g, '').trim();
  const contactRaw = (cols[3] || '').replace(/"/g, '').trim();
  const whatsapp = (cols[4] || '').replace(/"/g, '').trim();
  const accountNumber = (cols[5] || '').replace(/"/g, '').trim();
  const bankName = (cols[6] || '').replace(/"/g, '').trim();

  let address = location.replace(/https?:\/\/[^\s]+\s*/g, '').trim();
  let contact = cleanPhone(whatsapp) || cleanPhone(contactRaw);

  const tags = categories ? categories.split(/[;,]/).map(t => t.trim().toLowerCase()).filter(Boolean) : [];

  const key = (name + '|' + address).toLowerCase();
  if (seen.has(key)) continue;
  seen.add(key);

  const supplier = { businessName: name, contact, address: address || null, tags };
  if (accountNumber) supplier.accountNumber = accountNumber;
  if (bankName) supplier.bankName = bankName;
  suppliers.push(supplier);
}

console.log(`Parsed ${suppliers.length} unique suppliers from ${lines.length - 1} rows`);

fs.writeFileSync(
  'D:\\Desktop\\Material_logi\\src\\data\\seedSuppliers.json',
  JSON.stringify(suppliers, null, 2)
);
console.log('Wrote seedSuppliers.json');
