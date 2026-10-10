import test from "node:test";
import assert from "node:assert/strict";
import {
  AVATAR_HEIGHT,
  AVATAR_RADIUS,
  MEET_RANGE,
  ORBIT_RATE,
  RUN_MULTIPLIER,
  WALK_SPEED,
  ZOOM_DEFAULT,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  cameraPlace,
  cameraRelative,
  fogRange,
  fovFor,
  lookLift,
  INDIA_UNITS_PER_KM,
  NETWORK_UNITS_PER_KM,
  networkUnitsPerMapUnit,
  normalizeMovement,
  pitchFor,
  traverseSeconds,
} from "../site/network-walk.js";
import { ACCENT_COLORS, BODY_COLORS, GEAR, HATS, SKIN_TONES, specFor } from "../site/network-avatar.js";

/* These are the Portfolio Map Network's values (fritzhand/portfolio-map-3d's walk engine, as
   Embarc Collective's and Ambition Accelerated's maps run it). If one changes there, it changes
   here, deliberately. */
test("the walk uses the network's pace, walker and follow camera", () => {
  assert.equal(WALK_SPEED, 9);
  assert.equal(RUN_MULTIPLIER, 1.9);
  assert.equal(AVATAR_HEIGHT, 1.8);
  assert.equal(AVATAR_RADIUS, 0.38);
  assert.deepEqual([ZOOM_MIN, ZOOM_DEFAULT, ZOOM_MAX], [8, 22, 70]);
  assert.equal(ZOOM_STEP, 0.85);
  assert.equal(ORBIT_RATE, 1.9);
  assert.equal(MEET_RANGE, 4.5);
});

test("this map's units convert at India's ground scale, a third of the network's Florida scale", () => {
  assert.equal(NETWORK_UNITS_PER_KM, 1.5);
  assert.equal(INDIA_UNITS_PER_KM, 0.5);
  // data/india-map.json: 35.92 map units per degree, so 3.1 km per map unit.
  const perMapUnit = networkUnitsPerMapUnit(35.917286940741604, INDIA_UNITS_PER_KM);
  assert.ok(Math.abs(perMapUnit - 3.099 * 0.5) < 0.002, `received ${perMapUnit}`);
  // A degree of latitude is 111.32 km either way.
  assert.ok(Math.abs(networkUnitsPerMapUnit(1) - 111.32 * 1.5) < 1e-9);
});

test("the camera pitches up and looks down as it pulls out, and widens on a phone held upright", () => {
  assert.ok(Math.abs(pitchFor(ZOOM_MIN) - 0.22) < 1e-12);
  assert.ok(Math.abs(pitchFor(ZOOM_MAX) - 1.02) < 1e-12);
  for (let d = ZOOM_MIN; d < ZOOM_MAX; d += 4) assert.ok(pitchFor(d + 4) >= pitchFor(d));
  assert.ok(Math.abs(lookLift(ZOOM_MIN) - 2.2) < 1e-12);
  assert.equal(lookLift(ZOOM_MAX), 0);
  assert.equal(fovFor(16 / 9), 50);
  assert.ok(fovFor(390 / 844) > 50 && fovFor(390 / 844) <= 66);
  assert.ok(fogRange(ZOOM_MAX).far > fogRange(ZOOM_MIN).far);
});

test("every control walks relative to the camera, diagonals no faster than straight", () => {
  const close = (a, b) => Math.abs(a - b) < 1e-9;
  // Camera south of the walker (yaw 0): forward walks north (-z), right walks east (+x).
  const north = cameraRelative(1, 0, 0);
  assert.ok(close(north.x, 0) && close(north.z, -1));
  const east = cameraRelative(0, 1, 0);
  assert.ok(close(east.x, 1) && close(east.z, 0));
  // Camera east of the walker (yaw 90°): forward walks west.
  const west = cameraRelative(1, 0, Math.PI / 2);
  assert.ok(close(west.x, -1) && close(west.z, 0));
  const diagonal = cameraRelative(1, 1, 0.7);
  assert.ok(close(Math.hypot(diagonal.x, diagonal.z), 1));
  assert.deepEqual(normalizeMovement(0, -1), { x: 0, z: -1 });
});

test("the follow camera sits behind the walker at its distance", () => {
  const place = cameraPlace({ x: 10, y: 2, z: 20 }, 0, Math.PI / 4, 10);
  assert.ok(Math.abs(place.x - 10) < 1e-9);
  assert.ok(place.z > 20, "yaw 0 puts the camera south (+z) of the walker");
  assert.ok(Math.abs(Math.hypot(place.x - 10, place.y - 2, place.z - 20) - 10) < 1e-9);
  assert.ok(Math.abs(traverseSeconds(90) - 10) < 1e-12);
  assert.ok(Math.abs(traverseSeconds(171, true) - 10) < 1e-12);
});

test("an explorer's look is the network's: deterministic, from the network's lists", () => {
  const a = specFor("abc123xyz");
  assert.deepEqual(specFor("abc123xyz"), a);
  assert.ok(BODY_COLORS.includes(a.body));
  assert.ok(ACCENT_COLORS.includes(a.accent) || a.accent === "#ffffff");
  assert.ok(SKIN_TONES.includes(a.skin));
  assert.ok(HATS.includes(a.hat));
  assert.ok(GEAR.includes(a.gear));
  assert.notEqual(a.accent, a.body);
  const looks = new Set(Array.from({ length: 40 }, (_, i) => JSON.stringify(specFor(`visitor-${i}`))));
  assert.ok(looks.size > 30, "different visitors look different");
});
