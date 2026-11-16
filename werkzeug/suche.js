// Sucht je App-Lebensmittel USDA-Kandidaten
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, 'usda-download/sr/FoodData_Central_sr_legacy_food_csv_2018-04');
function csv(name) {
  const t = fs.readFileSync(path.join(dir, name), 'utf8'), zeilen = [];
  let z = [], feld = '', inQ = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQ) { if (c === '"') { if (t[i + 1] === '"') { feld += '"'; i++; } else inQ = false; } else feld += c; }
    else if (c === '"') inQ = true;
    else if (c === ',') { z.push(feld); feld = ''; }
    else if (c === '\n') { z.push(feld); feld = ''; if (z.length > 1 || z[0]) zeilen.push(z); z = []; }
    else if (c !== '\r') feld += c;
  }
  if (feld || z.length) { z.push(feld); zeilen.push(z); }
  return zeilen.slice(1);
}
module.exports = { csv, dir };
if (require.main === module) {
  const foods = csv('food.csv').map(r => ({ id: r[0], d: r[2] }));
  const MAP = JSON.parse(fs.readFileSync(path.join(__dirname, 'mapping.json'), 'utf8'));
  for (const m of MAP) {
    const qs = m.q.map(s => s.toLowerCase()), nots = (m.not || []).map(s => s.toLowerCase());
    const tr = foods.filter(f => { const d = f.d.toLowerCase(); return qs.every(q => d.includes(q)) && !nots.some(n => d.includes(n)); })
      .sort((a, b) => a.d.length - b.d.length).slice(0, 2);
    console.log(m.app + ' ||| ' + (tr.map(t => t.id + '=' + t.d).join(' ||| ') || 'NICHTS'));
  }
}
