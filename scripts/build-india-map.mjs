#!/usr/bin/env node
/* ============================================================
   build-india-map.mjs — one-off data-prep tool.

   Fetches a district-level India GeoJSON, dissolves districts into
   states, projects with a cos-corrected equirectangular projection into
   a fixed SVG viewBox, simplifies rings with Douglas-Peucker, and writes
   data/india-map.json:

     { viewBox:[W,H],
       proj:{cosLat0,rxMin,ryMax,s,pad},   // lets the client place lat/lng
       states:{ "State Name": { d, cx, cy } } }  //  markers in the SAME space

   The projection descriptor is the whole point: because state polygons and
   city markers are projected with identical arithmetic (build-time here,
   run-time in site.js), the incubator dots land exactly on their states.

   Source GeoJSON: udit-001/india-maps-data (district level, current names
   incl. Telangana, Ladakh, and canonical state spellings). Run this only
   when you want to regenerate data/india-map.json; the output is committed.

   Usage:  node scripts/build-india-map.mjs
   ============================================================ */
import { writeFileSync, readFileSync, existsSync } from "node:fs";

const SRC_URL = "https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/india.geojson";
const CACHE = "scratch/india_districts.geojson";
const OUT = "data/india-map.json";
const W = 1000, PAD = 12, TOL = 0.55; // svg px: canvas width, padding, simplify tolerance
const MEAN_LAT = 21.9;                // India centroid latitude for the cos correction

const raw = existsSync(CACHE)
  ? readFileSync(CACHE, "utf8")
  : await (await fetch(SRC_URL)).text();
const g = JSON.parse(raw);

const ringsOf = (geom) =>
  geom.type === "Polygon" ? [geom.coordinates] :
  geom.type === "MultiPolygon" ? geom.coordinates : [];
const byState = new Map();
for (const f of g.features) {
  const name = f.properties.st_nm;
  if (!name) continue;
  const arr = byState.get(name) || [];
  for (const poly of ringsOf(f.geometry)) for (const ring of poly) arr.push(ring);
  byState.set(name, arr);
}

const cosLat0 = Math.cos((MEAN_LAT * Math.PI) / 180);
let rxMin = Infinity, rxMax = -Infinity, ryMin = Infinity, ryMax = -Infinity;
for (const rings of byState.values())
  for (const ring of rings)
    for (const [lng, lat] of ring) {
      const rx = lng * cosLat0;
      if (rx < rxMin) rxMin = rx; if (rx > rxMax) rxMax = rx;
      if (lat < ryMin) ryMin = lat; if (lat > ryMax) ryMax = lat;
    }
const s = (W - 2 * PAD) / (rxMax - rxMin);
const H = Math.round((ryMax - ryMin) * s + 2 * PAD);
const project = (lng, lat) => [PAD + (lng * cosLat0 - rxMin) * s, PAD + (ryMax - lat) * s];

function dp(pts, tol) { // Douglas-Peucker on projected [x,y] points
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let idx = -1, max = tol;
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy || 1e-9;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i];
      const t = ((px - ax) * dx + (py - ay) * dy) / len2;
      const cx = ax + t * dx, cy = ay + t * dy;
      const d = Math.hypot(px - cx, py - cy);
      if (d > max) { max = d; idx = i; }
    }
    if (idx !== -1) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const ringArea = (pts) => {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++)
    a += (pts[j][0] * pts[i][1]) - (pts[i][0] * pts[j][1]);
  return Math.abs(a / 2);
};
const round = (n) => Math.round(n * 10) / 10;

const states = {};
for (const [name, rings] of byState) {
  const subpaths = [];
  let cxSum = 0, cySum = 0, wSum = 0;
  for (const ring of rings) {
    let pts = dp(ring.map(([lng, lat]) => project(lng, lat)), TOL);
    if (pts.length < 4) continue;
    const area = ringArea(pts);
    if (area < 3) continue; // drop specks (tiny islands / slivers)
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (const [x, y] of pts) { if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
    cxSum += ((minx + maxx) / 2) * area; cySum += ((miny + maxy) / 2) * area; wSum += area;
    subpaths.push([area, "M" + pts.map(([x, y]) => `${round(x)},${round(y)}`).join("L") + "Z"]);
  }
  subpaths.sort((a, b) => b[0] - a[0]);
  states[name] = { d: subpaths.map((x) => x[1]).join(""), cx: round(cxSum / (wSum || 1)), cy: round(cySum / (wSum || 1)) };
}

writeFileSync(OUT, JSON.stringify({
  viewBox: [W, H],
  proj: { cosLat0: Math.round(cosLat0 * 1e6) / 1e6, rxMin, ryMax, s, pad: PAD },
  states,
}));
console.log(`✓ ${Object.keys(states).length} states → ${OUT} (${(readFileSync(OUT).length / 1024).toFixed(0)} KB), viewBox 0 0 ${W} ${H}`);
