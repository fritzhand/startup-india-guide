#!/usr/bin/env node
/* ============================================================
   build-india-map.mjs — one-off data-prep tool.

   Fetches an India GeoJSON, keeps ONE dissolved outline per state/UT,
   projects with a cos-corrected equirectangular projection into a fixed
   SVG viewBox, simplifies rings with Douglas-Peucker, and writes
   data/india-map.json:

     { viewBox:[W,H],
       proj:{cosLat0,rxMin,ryMax,s,pad},   // lets the client place lat/lng
       states:{ "State Name": { d, cx, cy } } }  //  markers in the SAME space

   The projection descriptor is the whole point: because state polygons and
   city markers are projected with identical arithmetic (build-time here,
   run-time in site.js), the incubator dots land exactly on their states.

   Source GeoJSON: udit-001/india-maps-data (current names incl. Telangana,
   Ladakh, and canonical state spellings). The file mixes two kinds of
   feature: 726 districts, which carry a `district` property, and 34
   already-dissolved state outlines, which do not. Only the outlines are
   drawn — taking the districts instead is what used to paint a district
   ("county") border grid across every state, because the walkable map
   strokes the state path it is given.

   Chandigarh and Lakshadweep have no outline feature; their district rings
   are the whole territory, so they fall back to those (deduplicated — both
   are listed twice upstream).

   The bounding box is deliberately measured over EVERY source vertex, not
   just the drawn ones. The outlines share the districts' extremes, so this
   keeps `proj` and `viewBox` byte-stable across a regeneration — which is
   what lets the walkable map keep its hardcoded signpost, ferry and spawn
   coordinates.

   Run this only when you want to regenerate data/india-map.json; the output
   is committed.

   Usage:  node scripts/build-india-map.mjs
   ============================================================ */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { closedPath, dp, ringArea, ringsOf, round } from "./geo.mjs";

const SRC_URL = "https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/india.geojson";
const CACHE = "scratch/india_districts.geojson";
const OUT = "data/india-map.json";
const W = 1000, PAD = 12, TOL = 0.55; // svg px: canvas width, padding, simplify tolerance
const MEAN_LAT = 21.9;                // India centroid latitude for the cos correction
const MIN_AREA = 3;                   // drop specks (tiny islands / slivers)

mkdirSync("scratch", { recursive: true });
const raw = existsSync(CACHE)
  ? readFileSync(CACHE, "utf8")
  : await (async () => { const t = await (await fetch(SRC_URL)).text(); writeFileSync(CACHE, t); return t; })();
const g = JSON.parse(raw);

/* ---- partition: dissolved state outlines vs. the districts inside them ---- */
const outlineRings = new Map();  // state -> rings of the dissolved outline
const districtRings = new Map(); // state -> rings of its districts
for (const f of g.features) {
  const name = f.properties.st_nm;
  if (!name) continue;
  const target = f.properties.district == null ? outlineRings : districtRings;
  const arr = target.get(name) || [];
  arr.push(...ringsOf(f.geometry));
  target.set(name, arr);
}
const dedupe = (rings) => {
  const seen = new Set();
  return rings.filter((ring) => {
    const key = ring.map((p) => `${p[0]},${p[1]}`).join(";");
    return seen.has(key) ? false : (seen.add(key), true);
  });
};
const shapeRings = new Map();
for (const name of new Set([...outlineRings.keys(), ...districtRings.keys()]))
  shapeRings.set(name, dedupe(outlineRings.get(name) || districtRings.get(name) || []));

/* ---- projection: bbox over every source vertex, drawn or not ---- */
const cosLat0 = Math.cos((MEAN_LAT * Math.PI) / 180);
let rxMin = Infinity, rxMax = -Infinity, ryMin = Infinity, ryMax = -Infinity;
for (const f of g.features)
  for (const ring of ringsOf(f.geometry))
    for (const [lng, lat] of ring) {
      const rx = lng * cosLat0;
      if (rx < rxMin) rxMin = rx; if (rx > rxMax) rxMax = rx;
      if (lat < ryMin) ryMin = lat; if (lat > ryMax) ryMax = lat;
    }
const s = (W - 2 * PAD) / (rxMax - rxMin);
const H = Math.round((ryMax - ryMin) * s + 2 * PAD);
const project = (lng, lat) => [PAD + (lng * cosLat0 - rxMin) * s, PAD + (ryMax - lat) * s];

/** Project, simplify and drop specks — the shared front half of both passes. */
const usableRings = (rings) => rings
  .map((ring) => dp(ring.map(([lng, lat]) => project(lng, lat)), TOL))
  .filter((pts) => pts.length >= 4 && ringArea(pts) >= MIN_AREA);

/**
 * Area-weighted centre of a state's DISTRICT rings. Districts partition the
 * state evenly, so their combined centre tracks the state's mass far better
 * than the bbox centre of one big outline would — which matters because the
 * walkable map spawns landmarks (and the avatar) on it.
 */
function centre(rings) {
  let cxSum = 0, cySum = 0, wSum = 0;
  for (const pts of usableRings(rings)) {
    const area = ringArea(pts);
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (const [x, y] of pts) { if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
    cxSum += ((minx + maxx) / 2) * area; cySum += ((miny + maxy) / 2) * area; wSum += area;
  }
  return [round(cxSum / (wSum || 1)), round(cySum / (wSum || 1))];
}

const warnings = [];
const states = {};
let subpaths = 0;
for (const [name, rings] of shapeRings) {
  const kept = usableRings(rings)
    .map((pts) => [ringArea(pts), closedPath(pts)])
    .sort((a, b) => b[0] - a[0]);
  if (!kept.length) warnings.push(`${name}: every ring is below the ${MIN_AREA}px² floor — the client must supply a fallback path`);
  subpaths += kept.length;
  const [cx, cy] = centre(districtRings.get(name) || rings);
  states[name] = { d: kept.map(([, d]) => d).join(""), cx, cy };
}

writeFileSync(OUT, JSON.stringify({
  viewBox: [W, H],
  proj: { cosLat0: Math.round(cosLat0 * 1e6) / 1e6, rxMin, ryMax, s, pad: PAD },
  states,
}));
for (const w of warnings) console.warn(`⚠ ${w}`);
console.log(`✓ ${Object.keys(states).length} states, ${subpaths} subpaths → ${OUT} (${(readFileSync(OUT).length / 1024).toFixed(0)} KB), viewBox 0 0 ${W} ${H}`);
