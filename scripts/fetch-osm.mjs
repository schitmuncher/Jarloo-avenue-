// Fetches the Nantwich map from OpenStreetMap (Overpass API) and writes
// data/nantwich.json for the game to load:
//   - every named street (highway ways), with a width estimate
//   - every building footprint, with height from OSM tags where present
//   - pubs, bars and shops
//   - house-number address points (so individual houses can be placed)
//
// Usage: node scripts/fetch-osm.mjs
// Data © OpenStreetMap contributors, licensed under ODbL.

import { writeFile, mkdir } from 'node:fs/promises';

const OVERPASS = 'https://overpass-api.de/api/interpreter';
// Nantwich bounding box (south, west, north, east). Matches the extent of the
// Minecraft reference world (Arnis, "Arnis World: Nantwich", ~3.6 x 3.6 km).
const BBOX = '53.051127,-2.544484,53.083138,-2.490843';

const query = `
[out:json][timeout:300];
(
  way["building"](${BBOX});
  node["addr:housenumber"](${BBOX});
  way["addr:housenumber"](${BBOX});
  way["highway"]["name"](${BBOX});
  node["amenity"~"pub|bar"](${BBOX});
  node["shop"](${BBOX});
  way["amenity"~"pub|bar"](${BBOX});
  way["shop"](${BBOX});
);
out body geom;
`;

const res = await fetch(OVERPASS, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'data=' + encodeURIComponent(query),
});
if (!res.ok) throw new Error(`Overpass request failed: ${res.status}`);
const osm = await res.json();

// Local metres around the centre of the bounding box (1 unit = 1 metre), the same
// origin the game uses, so OSM data and the anchor file line up.
const CENTRE = { lat: 53.067132, lon: -2.517664 };
const M_PER_DEG_LAT = 111320;
const M_PER_DEG_LON = 111320 * Math.cos((CENTRE.lat * Math.PI) / 180);
const toXZ = (lat, lon) => ({
  x: +((lon - CENTRE.lon) * M_PER_DEG_LON).toFixed(2),
  z: +(-(lat - CENTRE.lat) * M_PER_DEG_LAT).toFixed(2),
});

// Typical carriageway widths in metres, used when OSM has no width tag.
const ROAD_WIDTH = {
  motorway: 14, trunk: 12, primary: 10, secondary: 9, tertiary: 8,
  unclassified: 6, residential: 6, living_street: 5, service: 4,
  pedestrian: 6, footway: 2, path: 1.5, track: 3, cycleway: 2,
};

const buildings = [];
const streets = [];
const addresses = [];

for (const el of osm.elements) {
  const tags = el.tags || {};
  const isPub = tags.amenity === 'pub' || tags.amenity === 'bar';
  const name = tags.name || null;

  // Named streets: keep the centreline and a width.
  if (el.type === 'way' && tags.highway && name && el.geometry?.length >= 2) {
    const explicit = parseFloat(tags.width);
    streets.push({
      name,
      highway: tags.highway,
      widthM: explicit || ROAD_WIDTH[tags.highway] || 6,
      points: el.geometry.map((g) => toXZ(g.lat, g.lon)),
      osmId: `${el.type}/${el.id}`,
    });
  }

  // Building footprints, kept as polygons so the game can draw true shapes.
  if (el.type === 'way' && tags.building && el.geometry?.length >= 3) {
    const pts = el.geometry.map((g) => toXZ(g.lat, g.lon));
    const xs = pts.map((p) => p.x), zs = pts.map((p) => p.z);
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
    const cz = (Math.max(...zs) + Math.min(...zs)) / 2;
    const levels = parseInt(tags['building:levels']);
    const height = parseFloat(tags.height) || (levels || 2) * 3.0 + 1.5;
    buildings.push({
      x: cx, z: cz,
      width: Math.max(...xs) - Math.min(...xs) || 4,
      depth: Math.max(...zs) - Math.min(...zs) || 4,
      height,
      footprint: pts.map((p) => [p.x, p.z]),
      name, isPub,
      number: tags['addr:housenumber'] || null,
      street: tags['addr:street'] || null,
      osmId: `${el.type}/${el.id}`,
    });
  }

  // House-number address points.
  if (el.type === 'node' && tags['addr:housenumber']) {
    const p = toXZ(el.lat, el.lon);
    addresses.push({
      x: p.x, z: p.z,
      number: tags['addr:housenumber'],
      street: tags['addr:street'] || null,
      osmId: `${el.type}/${el.id}`,
    });
  }

  // Pubs, bars and shops as points.
  if (el.type === 'node' && (isPub || tags.shop || name)) {
    const p = toXZ(el.lat, el.lon);
    buildings.push({
      x: p.x, z: p.z, width: 4, depth: 4, height: isPub ? 5 : 4,
      name, isPub, footprint: null,
      osmId: `${el.type}/${el.id}`,
    });
  }
}

// Summary by street name so you can see coverage at a glance.
const streetNames = [...new Set(streets.map((s) => s.name))].sort();
const withNumbers = addresses.length;

await mkdir('data', { recursive: true });
await writeFile(
  'data/nantwich.json',
  JSON.stringify({
    attribution: '© OpenStreetMap contributors (ODbL)',
    generated: new Date().toISOString(),
    centre: CENTRE,
    streets,
    buildings,
    addresses,
  }, null, 2)
);
console.log(`Wrote ${streets.length} street segments (${streetNames.length} named streets),`);
console.log(`${buildings.length} buildings and points, ${withNumbers} house-number addresses.`);
