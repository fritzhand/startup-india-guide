/* ============================================================
   portfolio-map-protocol.mjs — the Portfolio Map Network's
   protocol, version 1 (portfolio-map/1), as this map needs it.

   Ported from fritzhand/portfolio-map-3d (federation/protocol.ts
   and federation/validate.ts), which the Nexus at wearenexus.xyz
   runs on every manifest it reads. This build is plain Node with
   no dependencies, so the TypeScript is ported rather than
   imported: the constants, the links into the Nexus, and the
   manifest check, unchanged. If the protocol changes there, it
   changes here, deliberately (tests/network-manifest.test.mjs).
   ============================================================ */

/** The protocol id every manifest carries. */
export const PROTOCOL = "portfolio-map/1";

/** The Nexus: the network's landing page and shared world. */
export const NEXUS_URL = "https://wearenexus.xyz";
/** Nexus addresses a manifest's `nexus` may name and still count as linking back. */
export const ACCEPTED_NEXUS_URLS = [NEXUS_URL, "https://www.wearenexus.xyz"];

/** The manifest's file name, served next to the map's index.html. */
export const MANIFEST_FILE = "portfolio-map.json";

/** The meta tag the map's index.html carries, so a crawler sees the backlink without running anything. */
export const NEXUS_META = "portfolio-map:nexus";

/** The network's name, as the interface says it. */
export const NETWORK_NAME = "Portfolio Map Network";

/** Ids: lowercase letters, digits and single hyphens, 2 to 48 characters. Used for instance ids and slugs. */
export const ID_PATTERN = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,47}$/;
export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** Upper bounds that keep a manifest small enough for the Nexus to fetch hundreds of them. */
export const LIMITS = {
  name: 80,
  tagline: 160,
  label: 40,
  description: 400,
  keywords: 12,
  keyword: 40,
  districts: 40,
  companies: 2000,
};

/** A map's address without a trailing slash, query or hash ("https://x.org/map/?a#b" -> "https://x.org/map"). */
export function normalizeUrl(url) {
  const u = new URL(url);
  return `${u.origin}${u.pathname.replace(/\/+$/, "")}`;
}

/**
 * The link from this map into the Nexus. `from` is the map's id: the Nexus opens its world view
 * turned to this map. `via` says what the visitor used (the walk's portal or a link).
 */
export function nexusHref(from, via = "link", base = NEXUS_URL) {
  const params = ["world"];
  if (from && ID_PATTERN.test(from)) params.push(`from=${from}`);
  if (via === "portal") params.push("via=portal");
  return `${normalizeUrl(base)}/?${params.join("&")}`;
}

/* ---------------- the manifest check (federation/validate.ts) ---------------- */

const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Text that must never travel through the network: email addresses and phone numbers. */
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE = /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/;

const isObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v) => typeof v === "string";

/** An absolute https URL with no credentials. */
export function isHttpsUrl(v) {
  if (!isStr(v)) return false;
  try {
    const u = new URL(v);
    return u.protocol === "https:" && !u.username && !u.password && !/\s/.test(v);
  } catch {
    return false;
  }
}

function keysOnly(o, allowed, where, out) {
  for (const k of Object.keys(o)) if (!allowed.includes(k)) out.push(`${where}: unexpected field "${k}"`);
  for (const k of allowed) if (!(k in o)) out.push(`${where}: missing field "${k}"`);
}

function text(v, where, max, out, nullable = false) {
  if (v === null && nullable) return;
  if (!isStr(v) || !v.trim()) return void out.push(`${where}: expected ${nullable ? "text or null" : "text"}`);
  if (v.length > max) out.push(`${where}: longer than ${max} characters`);
  if (EMAIL.test(v)) out.push(`${where}: looks like it holds an email address`);
  if (PHONE.test(v)) out.push(`${where}: looks like it holds a phone number`);
}

/** Would this text pass as a manifest field (no email address, no phone number, within `max`)? */
export function shareable(v, max) {
  const out = [];
  text(v, "text", max, out);
  return out.length === 0;
}

function count(v, where, out) {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0) out.push(`${where}: expected a whole number`);
}

const MANIFEST_KEYS = ["protocol", "id", "name", "publisher", "url", "tagline", "logo", "accent", "nexus", "framework", "labels", "counts", "districts", "companies", "updated"];
const LABEL_KEYS = ["company", "companies", "district", "districts", "people"];
const COUNT_KEYS = ["companies", "people", "districts"];
const DISTRICT_KEYS = ["slug", "label", "color", "count"];
const COMPANY_KEYS = ["slug", "name", "district", "description", "website", "keywords"];

/** Problems with a manifest (any JSON value); empty when it keeps the protocol. */
export function validateManifest(m) {
  const out = [];
  if (!isObj(m)) return ["the manifest is not a JSON object"];
  keysOnly(m, MANIFEST_KEYS, "manifest", out);
  if (m.protocol !== PROTOCOL) out.push(`protocol: expected "${PROTOCOL}"`);
  if (!isStr(m.id) || !ID_PATTERN.test(m.id)) out.push("id: expected lowercase letters, digits and hyphens (2-48 characters)");
  text(m.name, "name", LIMITS.name, out);
  if (!isObj(m.publisher)) out.push("publisher: expected { name, website }");
  else {
    keysOnly(m.publisher, ["name", "website"], "publisher", out);
    text(m.publisher.name, "publisher.name", LIMITS.name, out);
    if (m.publisher.website !== null && !isHttpsUrl(m.publisher.website)) out.push("publisher.website: expected an https address or null");
  }
  if (!isHttpsUrl(m.url)) out.push("url: expected an https address");
  else if (normalizeUrl(m.url) !== m.url) out.push(`url: expected "${normalizeUrl(m.url)}" (no trailing slash, query or hash)`);
  text(m.tagline, "tagline", LIMITS.tagline, out, true);
  if (m.logo !== null && !isHttpsUrl(m.logo)) out.push("logo: expected an https address or null");
  if (!isStr(m.accent) || !HEX_COLOR.test(m.accent)) out.push('accent: expected a color like "#3366ff"');
  if (!isHttpsUrl(m.nexus)) out.push("nexus: expected the Nexus's https address");
  if (!isObj(m.framework) || !isStr(m.framework.name) || !isStr(m.framework.version)) out.push("framework: expected { name, version }");
  else keysOnly(m.framework, ["name", "version"], "framework", out);
  if (!isObj(m.labels)) out.push("labels: expected an object");
  else {
    keysOnly(m.labels, LABEL_KEYS, "labels", out);
    for (const k of LABEL_KEYS) text(m.labels[k], `labels.${k}`, LIMITS.label, out, k === "people");
  }
  if (!isObj(m.counts)) out.push("counts: expected an object");
  else {
    keysOnly(m.counts, COUNT_KEYS, "counts", out);
    for (const k of COUNT_KEYS) count(m.counts[k], `counts.${k}`, out);
  }
  if (!isStr(m.updated) || !DATE.test(m.updated)) out.push("updated: expected YYYY-MM-DD");

  const districtSlugs = new Set();
  if (!Array.isArray(m.districts) || !m.districts.length) out.push("districts: expected at least one district");
  else {
    if (m.districts.length > LIMITS.districts) out.push(`districts: more than ${LIMITS.districts}`);
    m.districts.forEach((d, i) => {
      const w = `districts[${i}]`;
      if (!isObj(d)) return void out.push(`${w}: expected an object`);
      keysOnly(d, DISTRICT_KEYS, w, out);
      if (!isStr(d.slug) || !ID_PATTERN.test(d.slug)) out.push(`${w}.slug: expected an id`);
      else if (districtSlugs.has(d.slug)) out.push(`${w}.slug: "${d.slug}" twice`);
      else districtSlugs.add(d.slug);
      text(d.label, `${w}.label`, LIMITS.label, out);
      if (!isStr(d.color) || !HEX_COLOR.test(d.color)) out.push(`${w}.color: expected "#rrggbb"`);
      count(d.count, `${w}.count`, out);
    });
  }

  if (!Array.isArray(m.companies)) out.push("companies: expected a list");
  else {
    if (m.companies.length > LIMITS.companies) out.push(`companies: more than ${LIMITS.companies}`);
    const slugs = new Set();
    const perDistrict = new Map();
    m.companies.forEach((c, i) => {
      const w = `companies[${i}]`;
      if (!isObj(c)) return void out.push(`${w}: expected an object`);
      keysOnly(c, COMPANY_KEYS, w, out);
      if (!isStr(c.slug) || !ID_PATTERN.test(c.slug)) out.push(`${w}.slug: expected an id`);
      else if (slugs.has(c.slug)) out.push(`${w}.slug: "${c.slug}" twice`);
      else slugs.add(c.slug);
      text(c.name, `${w}.name`, LIMITS.name, out);
      if (!isStr(c.district) || !districtSlugs.has(c.district)) out.push(`${w}.district: not one of the manifest's districts`);
      else perDistrict.set(c.district, (perDistrict.get(c.district) ?? 0) + 1);
      text(c.description, `${w}.description`, LIMITS.description, out, true);
      if (c.website !== null && !isHttpsUrl(c.website)) out.push(`${w}.website: expected an https address or null`);
      if (!Array.isArray(c.keywords) || c.keywords.length > LIMITS.keywords) out.push(`${w}.keywords: expected at most ${LIMITS.keywords} keywords`);
      else c.keywords.forEach((k, j) => text(k, `${w}.keywords[${j}]`, LIMITS.keyword, out));
    });
    if (isObj(m.counts) && m.counts.companies !== m.companies.length) out.push(`counts.companies: says ${String(m.counts.companies)}, the index lists ${m.companies.length}`);
    if (Array.isArray(m.districts)) {
      if (isObj(m.counts) && m.counts.districts !== m.districts.length) out.push(`counts.districts: says ${String(m.counts.districts)}, the manifest lists ${m.districts.length}`);
      for (const d of m.districts) if (isObj(d) && isStr(d.slug) && d.count !== (perDistrict.get(d.slug) ?? 0)) out.push(`districts "${d.slug}": count says ${String(d.count)}, the index lists ${perDistrict.get(d.slug) ?? 0}`);
    }
  }
  return out;
}
