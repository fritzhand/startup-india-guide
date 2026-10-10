import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildManifest, incubatorIds, networkName, networkSlug } from "../scripts/network-manifest.mjs";
import { ID_PATTERN, NEXUS_URL, PROTOCOL, nexusHref, validateManifest } from "../scripts/portfolio-map-protocol.mjs";

/* The manifest this map publishes for the Portfolio Map Network (fritzhand/portfolio-map-3d,
   protocol portfolio-map/1), built from the real data. */
const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));
const incubators = read("data/incubators.json").incubators;
const map = read("data/india-map.json");
const config = read("site.config.json").network;
const tokens = readFileSync(new URL("../site/tokens.css", import.meta.url), "utf8");
const ring = [...tokens.matchAll(/--network-ring-\d+:\s*(#[0-9a-fA-F]{6})/g)].map((m) => m[1]);
const ids = incubatorIds(incubators);
const { manifest, left, problems } = buildManifest({
  network: { ...config, framework: { name: "startup-india-guide", version: "1.0.0" } },
  incubators,
  ids,
  states: Object.entries(map.states).map(([name, shape]) => ({ name, cy: shape.d ? shape.cy : 964.4 })),
  ring,
  typeLabels: {},
  accent: "#e2621b",
  logo: `${config.url}/assets/favicon.svg`,
  updated: "2026-10-10",
});

test("the manifest keeps the protocol", () => {
  assert.deepEqual(problems, []);
  assert.deepEqual(validateManifest(manifest), []);
  assert.equal(manifest.protocol, PROTOCOL);
  assert.equal(manifest.nexus, NEXUS_URL);
  assert.equal(manifest.url, "https://fritzhand.github.io/startup-india-guide");
  // On its publisher's own host: the network verifies it by domain.
  assert.equal(new URL(manifest.publisher.website).host, new URL(manifest.url).host);
});

test("every incubator the 3D map places is listed, with a network id the walk understands", () => {
  assert.deepEqual(left, []);
  assert.equal(manifest.companies.length, incubators.length);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, ID_PATTERN);
  assert.deepEqual(new Set(manifest.companies.map((c) => c.slug)), new Set(ids));
});

test("every state and UT is a district, north to south, and neighboring bands differ", () => {
  assert.equal(manifest.districts.length, Object.keys(map.states).length);
  assert.equal(manifest.districts[0].slug, "ladakh");
  const drawn = manifest.districts.filter((d) => d.count > 0);
  for (let i = 1; i < drawn.length; i += 1) assert.notEqual(drawn[i].color, drawn[i - 1].color, `${drawn[i - 1].slug} / ${drawn[i].slug}`);
  assert.ok(ring.length >= 12);
});

test("it carries only the public index: no emails, phones or contacts", () => {
  const keys = new Set(manifest.companies.flatMap((c) => Object.keys(c)));
  assert.deepEqual([...keys].sort(), ["description", "district", "keywords", "name", "slug", "website"]);
  const text = JSON.stringify(manifest);
  for (const incubator of incubators) {
    for (const field of ["email", "phone", "contact"]) {
      const value = (incubator[field] || "").trim();
      if (value.length > 4) assert.ok(!text.includes(value), `${incubator.name}: ${field}`);
    }
  }
  assert.ok(manifest.companies.every((c) => c.description === null));
});

test("a name over the network's 80 characters drops its trailing host, which stays a keyword", () => {
  const long = { name: "Centre for Innovation, Incubation and Entrepreneurship (CIIE), University of Kashmir", host: "University of Kashmir" };
  assert.equal(networkName(long), "Centre for Innovation, Incubation and Entrepreneurship (CIIE)");
  assert.equal(networkName({ name: "x".repeat(90), host: "" }), null);
  const listed = manifest.companies.find((c) => c.name.startsWith("Centre for Innovation, Incubation and Entrepreneurship (CIIE)"));
  assert.ok(listed && listed.keywords.includes("University of Kashmir"));
});

test("a slug longer than the network's ids is cut at a hyphen, and numbered when taken", () => {
  const long = "malaviya-centre-for-innovation-incubation-and-entrepreneurship-mciie";
  const id = networkSlug(long, new Set());
  assert.match(id, ID_PATTERN);
  assert.ok(long.startsWith(id) && long[id.length] === "-");
  assert.notEqual(networkSlug(long, new Set([id])), id);
});

test("links into the Nexus open this map's world", () => {
  assert.equal(nexusHref("india-ecosystem-map"), "https://wearenexus.xyz/?world&from=india-ecosystem-map");
  assert.equal(nexusHref("india-ecosystem-map", "portal"), "https://wearenexus.xyz/?world&from=india-ecosystem-map&via=portal");
});
