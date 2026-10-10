import test from "node:test";
import assert from "node:assert/strict";
import {
  placeDecor,
  placeOrganizations,
  routeLength,
} from "../site/walkable-core.js";
import { INDIA_UNITS_PER_KM, networkUnitsPerMapUnit, traverseSeconds } from "../site/network-walk.js";

test("incubator placement is deterministic, contained, and collision-spaced", () => {
  const organizations = Array.from({ length: 20 }, (_, index) => ({
    slug: `incubator-${index}`,
    region: "test-state",
  }));
  const options = {
    organizations,
    regionBounds: { "test-state": { x: 0, y: 0, width: 100, height: 100 } },
    regionAnchors: { "test-state": { x: 50, y: 50 } },
    contains: (_region, point) => point.x >= 0 && point.x <= 100 && point.y >= 0 && point.y <= 100,
    minimumDistance: 4,
  };
  const first = placeOrganizations(options);
  const second = placeOrganizations(options);
  assert.deepEqual(first, second);
  assert.equal(first.length, organizations.length);
  for (let index = 0; index < first.length; index += 1) {
    assert.ok(options.contains("test-state", first[index]));
    for (let other = index + 1; other < first.length; other += 1) {
      assert.ok(Math.hypot(first[index].x - first[other].x, first[index].y - first[other].y) >= 4);
    }
  }
});

test("decor is deterministic, on land, spaced, and clear of interactive targets", () => {
  const options = {
    count: 60,
    width: 200,
    height: 200,
    // A land square with a water margin, so "outside" is reachable by the sampler.
    contains: (p) => p.x >= 20 && p.x <= 180 && p.y >= 20 && p.y <= 180,
    kindAt: (p) => (p.x < 100 ? "desert" : "mtn"),
    avoid: [{ x: 60, y: 60 }, { x: 140, y: 140 }],
    spacing: 6,
    clearance: 18,
  };
  const first = placeDecor(options);
  assert.deepEqual(first, placeDecor(options), "same inputs must give the same scatter");
  assert.ok(first.length > 0);

  for (let i = 0; i < first.length; i += 1) {
    const item = first[i];
    assert.ok(options.contains(item), "every sprite sits on land");
    for (const target of options.avoid) {
      assert.ok(Math.hypot(item.x - target.x, item.y - target.y) >= 18, "sprites keep clear of interactive targets");
    }
    for (let j = i + 1; j < first.length; j += 1) {
      assert.ok(Math.hypot(item.x - first[j].x, item.y - first[j].y) >= 6, "sprites keep apart");
    }
    // The terrain under a sprite chooses its kit — that is what makes the
    // scatter read as geography rather than noise.
    const kit = item.x < 100 ? ["shrub-2", "rock-3"] : ["rock-1", "rock-2", "rock-3", "tree-simple-c"];
    assert.ok(kit.includes(item.sprite), `${item.sprite} belongs to the terrain it stands on`);
  }

  assert.deepEqual([...first].sort((a, b) => a.y - b.y), first, "painted back to front");
  assert.notDeepEqual(placeDecor({ ...options, seed: "other" }), first, "the seed actually varies the scatter");
});

test("at the network's pace, the walk from Jammu and Kashmir to Tamil Nadu takes about 2.4 minutes", () => {
  // Jammu and Kashmir, Delhi, Madhya Pradesh, Telangana, Tamil Nadu (state anchors).
  const route = [
    { x: 241.4, y: 134 },
    { x: 311.8, y: 315.3 },
    { x: 354, y: 490.3 },
    { x: 380, y: 702.9 },
    { x: 353.5, y: 951.7 },
  ];
  // data/india-map.json's projection: 35.92 map units to the degree, so 3.1 km to the unit,
  // drawn at INDIA_UNITS_PER_KM (about 2,600 km of route).
  const length = routeLength(route) * networkUnitsPerMapUnit(35.917286940741604, INDIA_UNITS_PER_KM);
  const walk = traverseSeconds(length);
  const run = traverseSeconds(length, true);
  assert.ok(walk >= 135 && walk <= 155, `expected 135–155 seconds walking, received ${walk}`);
  assert.ok(run >= 70 && run <= 82, `expected 70–82 seconds running, received ${run}`);
});
