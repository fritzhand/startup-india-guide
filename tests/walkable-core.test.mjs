import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_ZOOM,
  WALK_SPEED,
  WORLD_SCALE,
  clampCamera,
  clampZoom,
  estimateTraverseSeconds,
  normalizeMovement,
  placeOrganizations,
} from "../site/walkable-core.js";

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

test("diagonal movement is normalized to axial speed", () => {
  const diagonal = normalizeMovement(1, 1);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-12);
  assert.deepEqual(normalizeMovement(0, -1), { x: 0, y: -1 });
});

test("camera centers and clamps at the world edges", () => {
  assert.deepEqual(clampCamera({ x: 500, y: 400 }, { width: 200, height: 100 }, { width: 1000, height: 800 }), { x: 400, y: 350 });
  assert.deepEqual(clampCamera({ x: 10, y: 20 }, { width: 200, height: 100 }, { width: 1000, height: 800 }), { x: 0, y: 0 });
  assert.deepEqual(clampCamera({ x: 990, y: 790 }, { width: 200, height: 100 }, { width: 1000, height: 800 }), { x: 800, y: 700 });
});

test("zoom stays inside the supported range", () => {
  assert.equal(DEFAULT_ZOOM, 0.65);
  assert.equal(clampZoom(0.2), 0.65);
  assert.equal(clampZoom(1), 1);
  assert.equal(clampZoom(2), 1.65);
});

test("a representative north-to-south India route is fast to traverse", () => {
  const route = [
    { x: 241.4, y: 134 },
    { x: 311.8, y: 315.3 },
    { x: 354, y: 490.3 },
    { x: 380, y: 702.9 },
    { x: 353.5, y: 951.7 },
  ];
  const seconds = estimateTraverseSeconds(route, WORLD_SCALE, WALK_SPEED);
  assert.ok(seconds >= 40 && seconds <= 58, `expected 40–58 seconds, received ${seconds}`);
});
