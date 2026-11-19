// Erzeugt den MIKRO-Datenblock (je 100 g) aus den USDA-CSVs
const fs = require('fs'), path = require('path');
const { csv } = require('./suche.js');

// App-Name -> USDA fdc_id (+ faktor fuer verduennte Getraenke)
const WAHL = {
  'Whey Protein (Pulver)': 173180, 'Kollagen (Pulver)': 169599, 'Proteinriegel': 173137,
  'Proteinpudding': 168799, 'Skyr natur': 170894, 'Magerquark': 172181, 'Körniger Frischkäse': 172182,
  'Hähnchenbrust, gegart': 171477, 'Hähnchenbrust, roh': 171077, 'Putenbrust, gegart': 171496,
  'Rinderhack, gebraten': 174032, 'Rindersteak, gebraten': 168635, 'Schweineschnitzel, natur': 168253,
  'Schnitzel, paniert': 170718, 'Bratwurst': 171620, 'Kochschinken': 173864, 'Salami': 174582,
  'Putenbrust-Aufschnitt': 174572, 'Lachs, gegart': 175168, 'Thunfisch in Wasser': 173709,
  'Seelachs, gegart': 174237, 'Ei': 171287, 'Vollmilch 3,5 %': 171265, 'Milch 1,5 %': 170872,
  'Joghurt natur 3,5 %': 171284, 'Fruchtjoghurt': 170889, 'Gouda': 171241, 'Mozzarella': 170845,
  'Feta': 173420, 'Parmesan': 171247, 'Butter': 173430,
  'Haferflocken': 173904, 'Müsli (ohne Zucker)': 171646, 'Vollkornbrot': 172688, 'Mischbrot': 172684,
  'Toast': 174924, 'Brötchen': 175031, 'Vollkornbrötchen': 172794, 'Laugenbrezel': 169064,
  'Reis, gekocht': 169757, 'Reis, roh': 169756, 'Nudeln, gekocht': 168928, 'Nudeln, roh': 168927,
  'Kartoffeln, gekocht': 170440, 'Bratkartoffeln': 170036, 'Pommes frites': 170698,
  'Reiswaffel': 170250, 'Wrap / Tortilla': 175037,
  'Himbeeren': 167755, 'Milchreis, gekocht': 169605,
  'Apfel': 171688, 'Banane': 173944, 'Birne': 169118, 'Orange': 169097, 'Mandarine': 169105,
  'Kiwi': 168153, 'Erdbeeren': 167762, 'Heidelbeeren': 171711, 'Weintrauben': 174683,
  'Ananas': 169124, 'Wassermelone': 167765,
  'Tomate': 170457, 'Gurke': 168409, 'Paprika': 170108, 'Möhre': 170393, 'Brokkoli': 170379,
  'Blumenkohl': 169986, 'Zucchini': 169291, 'Champignons': 169251, 'Spinat': 168462,
  'Salat, gemischt': 169249, 'Zwiebel': 170000, 'Mais (Dose)': 169214, 'Kidneybohnen (Dose)': 174285,
  'Linsen, gekocht': 172421, 'Kichererbsen (Dose)': 173800, 'Avocado': 171705,
  'Olivenöl': 171413, 'Rapsöl': 172336, 'Erdnussbutter': 174266, 'Mandeln': 170567,
  'Walnüsse': 170187, 'Erdnüsse, geröstet': 174262,
  'Honig': 169640, 'Marmelade': 169641, 'Nuss-Nougat-Creme': 168000, 'Frischkäse': 173418,
  'Ketchup': 168556, 'Mayonnaise': 171009, 'Senf': 172234, 'Tomatensoße': 171192, 'Zucker': 169655,
  'Pizza Margherita': 173292, 'Döner Kebab': 170696, 'Burger': 170694, 'Currywurst': 174614,
  'Belegtes Brötchen': 170696, 'Lasagne': 173333, 'Gulasch': 173330, 'Eintopf': 171190,
  'Schokolade': 167587, 'Gummibärchen': 167989, 'Kekse': 174967, 'Kuchen': 172704, 'Eis': 167575,
  'Chips': 169677,
  'Apfelsaft': 173933, 'Orangensaft': 169098, 'Apfelschorle': 173933, 'Limonade': 173205, 'Isodrink': 171923,
};
const FAKTOR = { 'Apfelschorle': 0.55 };

// nutrient_id -> Kurzschluessel (Werte in: g fuer bal/zuk/gesf/salz, mg, ug je nach Naehrstoff)
const NID = {
  1079: 'bal', 2000: 'zuk', 1258: 'gesf', 1093: 'na',
  1092: 'kal', 1087: 'ca', 1090: 'mgn', 1091: 'ph', 1089: 'fe', 1095: 'zn', 1098: 'cu', 1101: 'mn', 1103: 'se',
  1106: 'va', 1114: 'vd', 1109: 've', 1185: 'vk', 1162: 'vc',
  1165: 'b1', 1166: 'b2', 1167: 'b3', 1170: 'b5', 1175: 'b6', 1177: 'fol', 1178: 'b12',
  1278: 'epa', 1272: 'dha',
};
const ids = new Set(Object.values(WAHL).map(String));
const werte = {}; // fdc_id -> {key: amount}
for (const r of csv('food_nutrient.csv')) {
  if (!ids.has(r[1])) continue;
  const k = NID[Number(r[2])]; if (!k) continue;
  (werte[r[1]] = werte[r[1]] || {})[k] = Number(r[3]);
}
const rund = v => v >= 100 ? Math.round(v) : v >= 10 ? Math.round(v * 10) / 10 : Math.round(v * 100) / 100;
let aus = 'const MIKRO = {\n', fehlt = [];
for (const [app, fid] of Object.entries(WAHL)) {
  const w = werte[String(fid)];
  if (!w) { fehlt.push(app + '=' + fid); continue; }
  const f = FAKTOR[app] || 1, o = {};
  for (const k of Object.values(NID)) {
    if (k === 'na' || k === 'epa' || k === 'dha') continue;
    if (w[k] != null && w[k] * f > 0) o[k] = rund(w[k] * f);
  }
  /* Omega-3 = EPA + DHA, in mg */
  const o3 = ((w.epa || 0) + (w.dha || 0)) * 1000 * f; if (o3 >= 1) o.o3 = rund(o3);
  if (w.na != null) { const salz = w.na * 2.5 / 1000 * f; if (salz >= 0.005) o.salz = Math.round(salz * 100) / 100; }
  aus += JSON.stringify(app) + ': {' + Object.entries(o).map(([k, v]) => k + ':' + v).join(',') + '},\n';
}
aus += '};';
fs.writeFileSync(path.join(__dirname, 'mikro-block.js'), aus);
console.log('Lebensmittel mit Daten:', Object.keys(WAHL).length - fehlt.length, '| ohne:', fehlt.join(', ') || 'keine');
console.log('Blockgröße:', aus.length, 'Zeichen');
// Stichproben
const probe = (app, k) => { const w = werte[String(WAHL[app])]; console.log('PROBE', app, k, '=', w && w[k]); };
probe('Banane', 'kal'); probe('Ei', 'b12'); probe('Lachs, gegart', 'vd'); probe('Haferflocken', 'fe');
probe('Paprika', 'vc'); probe('Spinat', 'vk'); probe('Mandeln', 've'); probe('Salami', 'na');
