// Fetches buildings, shops and pubs for Nantwich from OpenStreetMap (Overpass API)
// and writes data/nantwich.json for the game to load.
//
// Usage: node scripts/fetch-osm.mjs
// Data © OpenStreetMap contributors, licensed under ODbL.

import { writeFile, mkdir } from 'node:fs/promises';

const OVERPASS = 'https://overpass-api.de/api/interpreter';
// Nantwich bounding box (south, west, north, east).
const BBOX = '53.0500,-2.5600,53.0900,-2.4900';

const query = `
[out:json][timeout:120];
(
  way["building"](${BBOX});
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

// Convert lat/lon to local metres around the town centre so the game works in
// a flat coordinate space.
const CENTRE = { lat: 53.0700, lon: -2.5200 };
const M_PER_DEG_LAT = 111320;
const M_PER_DEG_LON = 111320 * Math.cos((CENTRE.lat * Math.PI) / 180);
const toXZ = (lat, lon) => ({
  x: (lon - CENTRE.lon) * M_PER_DEG_LON,
  z: -(lat - CENTRE.lat) * M_PER_DEG_LAT,
});

const buildings = [];
for (const el of osm.elements) {
  const tags = el.tags || {};
  const isPub = tags.amenity === 'pub' || tags.amenity === 'bar';
  const name = tags.name || null;

  if (el.type === 'way' && tags.building && el.geometry?.length >= 3) {
    const pts = el.geometry.map((g) => toXZ(g.lat, g.lon));
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cz = pts.reduce((s, p) => s + p.z, 0) / pts.length;
    const xs = pts.map((p) => p.x), zs = pts.map((p) => p.z);
    const height = parseFloat(tags.height) || (parseInt(tags['building:levels']) || 2) * 3.2;
    buildings.push({
      x: cx, z: cz,
      width: Math.max(...xs) - Math.min(...xs) || 4,
      depth: Math.max(...zs) - Math.min(...zs) || 4,
      height,
      name, isPub,
      osmId: `${el.type}/${el.id}`,
    });
  } else if (el.type === 'node' && (isPub || tags.shop || name)) {
    const p = toXZ(el.lat, el.lon);
    buildings.push({
      x: p.x, z: p.z, width: 4, depth: 4, height: isPub ? 5 : 4,
      name, isPub, osmId: `${el.type}/${el.id}`,
    });
  }
}

await mkdir('data', { recursive: true });
await writeFile(
  'data/nantwich.json',
  JSON.stringify({
    attribution: '© OpenStreetMap contributors (ODbL)',
    generated: new Date().toISOString(),
    centre: CENTRE,
    buildings,
  }, null, 2)
);
console.log(`Wrote ${buildings.length} features to data/nantwich.json`);
