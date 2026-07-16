# Startup India Guide

**A searchable, filterable documentation site for the Government of India's _Playbook of Government Schemes and Initiatives for Startups_ (June 2026).**

69 central government schemes — grants, equity, loans, credit guarantees, incubation and market access — extracted from the official playbook PDF, machine-verified against the source, and organised the way a founder actually looks for money: by need, by stage, by sector.

## What's on the site

| Page | What it does |
| --- | --- |
| **Overview** (`index.html`) | Stats, browse-by-support / stage / sector, flagship schemes |
| **Scheme Finder** (`finder.html`) | The playbook's official 5-question decision tree as an interactive wizard, plus the full static tree |
| **All schemes** (`directory.html`) | Filter all 69 schemes by part, support type, lifecycle stage, sector and audience — card or table view, deep-linkable filters (`?support=grant&stage=ideation`) |
| **Scheme pages** (`schemes/<slug>.html`) | One page per scheme: plain-English summary, objectives, eligibility checklist, benefits, how to apply, verified official links, related schemes, source page citation |
| **Compare** (`compare.html`) | Up to three schemes side by side |
| **Lifecycle Map** (`lifecycle.html`) | Which schemes fit ideation → prototype → seed → growth → market access |
| **What do you need?** (`needs.html`) | Jump from a need (grant / loan / lab / buyers / IP) to the schemes that provide it |
| **PSU & regulators** (`psu.html`) | 17 startup programs run by PSUs and regulators |
| **States & UTs** (`states.html`) | Every state/UT startup portal |
| **Glossary** (`glossary.html`) | The playbook's definitions and abbreviations |

Site-wide: **⌘K / `/` search** across schemes, glossary, states and PSU programs · **light/dark theme** with system default · mobile-first responsive layout · print-friendly scheme pages · zero runtime dependencies.

## Enable GitHub Pages

The generated site lives in `docs/`. To publish it:

1. Repo **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: your default branch, folder **`/docs`**
4. Save — the site appears at `https://<user>.github.io/startup-india-guide/`

## Repo tour

```
startup-india-guide/
├── Startup-Schemes-Playbook-June-2026.pdf   # the source document (also served by the site)
├── data/                    # the extracted, verified content — the single source of truth
│   ├── schemes.json         # 69 schemes: verbatim eligibility/benefits/links + tags
│   ├── decision-tree.json   # the 5-question finder
│   ├── lifecycle.json       # stage → schemes map
│   ├── needs-index.json     # need → schemes map
│   ├── master? — master-table columns (howMuch, category) are merged into schemes.json
│   ├── psu.json, states.json, glossary.json, about.json
│   └── aliases.json         # printed-name → slug overrides for cross-reference resolution
├── site/                    # the engine — consumed by build.mjs
│   ├── tokens.css           # the brand skin (palette sampled from the PDF) — light + dark
│   ├── site.css             # layout & component vocabulary; reads only tokens
│   └── site.js              # search, filters, wizard, compare, theme toggle
├── build.mjs                # data + site → docs/  (zero dependencies, Node ≥ 18)
└── docs/                    # GENERATED — never hand-edit; this is what GitHub Pages serves
```

## Working on the site

```bash
node build.mjs        # regenerate docs/ from data/ + site/
npx serve docs        # or: python3 -m http.server -d docs 8000
```

- **Content change** (a scheme's amount, a new link)? Edit `data/*.json`, rebuild.
- **Design change**? Edit `site/tokens.css` (colours/fonts) or `site/site.css` (components), rebuild.
- **Never edit `docs/`** — it is overwritten on every build.

The build **fails loudly** on duplicate slugs, missing required fields, malformed URLs, or any scheme name referenced in the decision tree / lifecycle / needs index that doesn't resolve to a scheme page (fix those by adding an entry to `data/aliases.json`).

## How the data was made

Each of the playbook's 107 pages was extracted to text and rendered to an image; every scheme one-pager was parsed into structured JSON and then **independently re-verified against the source page** (amounts, eligibility bullets, benefits, URLs). Hyperlinks come from the PDF's link annotations — never reconstructed by hand. Each scheme page cites the playbook page it came from.

This is an independent reference, not a government website. Scheme details change — always verify on the linked official portals before applying.
