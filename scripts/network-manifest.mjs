/* ============================================================
   network-manifest.mjs — this map's manifest for the Portfolio
   Map Network (/portfolio-map.json).

   The manifest is the map's public index in the Nexus: who it is,
   who publishes it, India's states and union territories (the
   network's "districts"), and every incubator the 3D map places,
   with its name, state, website and keywords from its own fields
   (type, host institution, city, sectors). Incubators have no
   description here, so none is sent. Never sent: email addresses,
   phone numbers, contacts or anything else the data holds.

   Each incubator's network id is its name as a slug (the 3D map's
   ?incubator= link uses the same id), cut at a hyphen when longer
   than the network's 48 characters. A name longer than the
   network's 80 characters that ends with ", <its host>" drops that
   ending, the host staying a keyword; any other is left out.

   States are listed north to south (by their place on the map), so
   the world's bands in the Nexus run like India, top to bottom; each
   takes the next color of a checked ring (tokens.css
   --network-ring-*), counting only states that have incubators, so
   neighboring bands always differ.

   Pure: build.mjs passes the data in and writes the file;
   tests/network-manifest.test.mjs checks the result against the
   protocol (scripts/portfolio-map-protocol.mjs).
   ============================================================ */
import { ID_PATTERN, LIMITS, NEXUS_URL, PROTOCOL, isHttpsUrl, normalizeUrl, shareable, validateManifest } from "./portfolio-map-protocol.mjs";

export const slugify = (s) => s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** An id for `slug` within the network's 48 characters (cut at its last hyphen), numbered if taken. */
export function networkSlug(slug, taken) {
  let id = slug;
  if (!ID_PATTERN.test(id)) {
    id = slug.slice(0, 48);
    if (slug[48] !== "-" && id.includes("-")) id = id.slice(0, id.lastIndexOf("-"));
    id = id.replace(/-+$/, "");
  }
  for (let n = 2; taken.has(id); n += 1) id = `${id.slice(0, 48 - String(n).length - 1).replace(/-+$/, "")}-${n}`;
  return id;
}

/** Network ids for the incubators, in their order. */
export function incubatorIds(incubators) {
  const taken = new Set();
  return incubators.map((incubator) => {
    const id = networkSlug(slugify(incubator.name), taken);
    taken.add(id);
    return id;
  });
}

/** The name the network can carry: as is, or without a trailing ", <host>" when too long; null when neither fits. */
export function networkName(incubator) {
  if (shareable(incubator.name, LIMITS.name)) return incubator.name;
  const host = (incubator.host || "").trim();
  if (host && incubator.name.endsWith(`, ${host}`)) {
    const short = incubator.name.slice(0, -(host.length + 2)).trim();
    if (shareable(short, LIMITS.name)) return short;
  }
  return null;
}

/**
 * The manifest.
 * - network: { id, name, url, tagline, publisher: { name, website }, framework }
 * - incubators: data/incubators.json's list; ids: incubatorIds(incubators)
 * - states: [{ name, cy }] (cy: the state's place on the map, north is smaller)
 * - ring: the colors districts take in turn
 * - typeLabels: { type: label }
 */
export function buildManifest({ network, incubators, ids, states, ring, typeLabels, accent, logo, updated }) {
  const stateSlug = new Map(states.map((s) => [s.name, slugify(s.name)]));
  const left = [];
  const companies = [];
  incubators.forEach((incubator, index) => {
    const name = networkName(incubator);
    const district = stateSlug.get(incubator.state);
    if (!name || !district) return void left.push(incubator.name);
    const keywords = [typeLabels[incubator.type] || incubator.type, incubator.host, incubator.city, ...(incubator.sectors || [])]
      .map((k) => (typeof k === "string" ? k.trim() : ""))
      .filter((k, i, all) => k && all.indexOf(k) === i && shareable(k, LIMITS.keyword))
      .slice(0, LIMITS.keywords);
    companies.push({
      slug: ids[index],
      name,
      district,
      description: null,
      website: isHttpsUrl(incubator.website) ? incubator.website : null,
      keywords,
    });
  });
  companies.sort((a, b) => a.name.localeCompare(b.name, "en"));

  const perState = new Map();
  for (const c of companies) perState.set(c.district, (perState.get(c.district) ?? 0) + 1);
  const ordered = [...states].sort((a, b) => a.cy - b.cy || a.name.localeCompare(b.name));
  let turn = 0;
  const districts = ordered.map((s) => {
    const slug = stateSlug.get(s.name);
    const count = perState.get(slug) ?? 0;
    const color = ring[turn % ring.length];
    if (count) turn += 1;
    return { slug, label: s.name, color, count };
  });

  const manifest = {
    protocol: PROTOCOL,
    id: network.id,
    name: network.name,
    publisher: { name: network.publisher.name, website: network.publisher.website },
    url: normalizeUrl(network.url),
    tagline: network.tagline,
    logo,
    accent,
    nexus: NEXUS_URL,
    framework: { name: network.framework.name, version: network.framework.version },
    labels: { company: "incubator", companies: "incubators", district: "state", districts: "states and UTs", people: null },
    counts: { companies: companies.length, people: 0, districts: districts.length },
    districts,
    companies,
    updated,
  };
  return { manifest, left, problems: validateManifest(manifest) };
}
