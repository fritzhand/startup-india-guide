import test from "node:test";
import assert from "node:assert/strict";
import { PORTAL_PLACE, PORTAL_SIZE, portalAt, portalFootprint, portalPosts, portalStateAt } from "../site/network-portal.js";
import { INDIA_UNITS_PER_KM, MEET_RANGE, networkUnitsPerMapUnit } from "../site/network-walk.js";

/* The Nexus portal is the network's (fritzhand/portfolio-map-3d; Embarc Collective's and Ambition
   Accelerated's maps): the same ring and the same rule for "beside it" and "through it". */
const NU = 1 / networkUnitsPerMapUnit(35.917286940741604, INDIA_UNITS_PER_KM);
const SPAWN = { x: 351.6, y: 498 }; // Madhya Pradesh's anchor, where the walk begins
const portal = portalAt(SPAWN, NU);

test("the portal is the network's size", () => {
  assert.deepEqual(PORTAL_SIZE, { r: 3.4, depth: 0.9, near: 7.5 });
  assert.ok(Math.abs(portal.r - 3.4 * NU) < 1e-9);
  assert.ok(Math.abs(portal.near - 7.5 * NU) < 1e-9);
});

test("it stands ahead of the arrival, to the left, facing it", () => {
  const dx = portal.x - SPAWN.x;
  const dy = portal.y - SPAWN.y;
  assert.ok(Math.abs(Math.hypot(dx, dy) - PORTAL_PLACE.ahead * NU) < 1e-9);
  assert.ok(dy < 0, "north of the arrival (the camera starts looking north)");
  assert.ok(dx < 0, "to the west, the left of the arrival's view");
  assert.ok(Math.abs(Math.atan2(-dx, -dy) - PORTAL_PLACE.left) < 1e-9);
  // Its face points at the spawn: (sin, cos) of `facing` is the direction to it.
  const toSpawn = Math.atan2(SPAWN.x - portal.x, SPAWN.y - portal.y);
  assert.ok(Math.abs(portal.facing - toSpawn) < 1e-9);
  // Out of reach on arrival: the walker starts away from it, not beside it.
  assert.equal(portalStateAt(portal, SPAWN.x, SPAWN.y), "far");
});

test("beside it, through it, away from it", () => {
  const front = (d) => ({ x: portal.x + Math.sin(portal.facing) * d * NU, y: portal.y + Math.cos(portal.facing) * d * NU });
  assert.equal(portalStateAt(portal, front(5).x, front(5).y), "near");
  assert.equal(portalStateAt(portal, front(0.5).x, front(0.5).y), "inside");
  assert.equal(portalStateAt(portal, front(-0.5).x, front(-0.5).y), "inside");
  assert.equal(portalStateAt(portal, front(9).x, front(9).y), "far");
  // In the ring's plane but past the opening (at a post) is beside it, not through it.
  const [post] = portalPosts(portal);
  assert.equal(portalStateAt(portal, post.x, post.y), "near");
  // The prompt never competes with a pin's: the near range is wider than meeting range.
  assert.ok(PORTAL_SIZE.near > MEET_RANGE);
});

test("the posts flank the opening, and decor keeps clear of the whole plinth", () => {
  const posts = portalPosts(portal);
  assert.equal(posts.length, 2);
  const gap = Math.hypot(posts[0].x - posts[1].x, posts[0].y - posts[1].y);
  assert.ok(Math.abs(gap - 2 * (3.4 + 0.1) * NU) < 1e-9);
  for (const p of posts) assert.ok(Math.abs(Math.hypot(p.x - portal.x, p.y - portal.y) - (3.4 + 0.1) * NU) < 1e-9);
  const foot = portalFootprint(portal);
  assert.ok(foot.length >= 7);
  for (const p of posts) assert.ok(foot.some((f) => Math.hypot(f.x - p.x, f.y - p.y) < 1.2 * NU), "a footprint point at each post");
});
