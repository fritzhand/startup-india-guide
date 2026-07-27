export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 1113;
export const WORLD_SCALE = 18;
export const WALK_SPEED = 360;
export const DEFAULT_ZOOM = 0.65;
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 1.65;
export const ZOOM_STEP = 0.2;

export function hashString(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededRandom(seed) {
  let state = hashString(seed) || 1;
  return () => {
    state += 0x6d2b79f5;
    let n = state;
    n = Math.imul(n ^ (n >>> 15), n | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalizeMovement(x, y) {
  const length = Math.hypot(x, y);
  return length > 1 ? { x: x / length, y: y / length } : { x, y };
}

export function clampZoom(value, minimum = MIN_ZOOM, maximum = MAX_ZOOM) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function clampCamera(position, viewport, world) {
  const maxX = Math.max(0, world.width - viewport.width);
  const maxY = Math.max(0, world.height - viewport.height);
  return {
    x: Math.max(0, Math.min(maxX, position.x - viewport.width / 2)),
    y: Math.max(0, Math.min(maxY, position.y - viewport.height / 2)),
  };
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function estimateTraverseSeconds(points, scale = WORLD_SCALE, speed = WALK_SPEED) {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += distance(points[index - 1], points[index]);
  }
  return length * scale / speed;
}

export function placeOrganizations({
  organizations,
  regionBounds,
  regionAnchors,
  contains,
  minimumDistance = 4,
}) {
  const placed = [];
  const byRegion = new Map();

  for (const organization of [...organizations].sort((a, b) => a.slug.localeCompare(b.slug))) {
    const region = organization.region;
    const bounds = regionBounds[region];
    const anchor = regionAnchors[region];
    if (!bounds || !anchor) continue;

    const regionPlaced = byRegion.get(region) || [];
    const random = seededRandom(`${region}:${organization.slug}`);
    let point = null;
    let lastInside = null;

    for (let pass = 0; pass < 5 && !point; pass += 1) {
      const spacing = minimumDistance * (1 - pass * 0.2);
      for (let attempt = 0; attempt < 800; attempt += 1) {
        const candidate = {
          x: bounds.x + random() * bounds.width,
          y: bounds.y + random() * bounds.height,
        };
        if (!contains(region, candidate)) continue;
        lastInside = candidate;
        if (regionPlaced.every((other) => distance(candidate, other) >= spacing)) {
          point = candidate;
          break;
        }
      }
    }

    point ||= lastInside || anchor;
    regionPlaced.push(point);
    byRegion.set(region, regionPlaced);
    placed.push({ ...organization, x: point.x, y: point.y });
  }

  return placed;
}
