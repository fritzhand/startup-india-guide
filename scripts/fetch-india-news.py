#!/usr/bin/env python3
"""
Fetch VETTED external news coverage of India's startup ecosystem, for the News
feed (news.html + the overview ticker).

The trust model is an ALLOWLIST: we query Google News (India edition) RSS for
relevance, then keep ONLY items whose source is a hand-picked, reputable outlet
covering Indian startups / tech / business / policy. Google provides discovery;
the allowlist provides vetting; anything off-list is dropped. Every headline
links to a named, vetted publisher.

Pipeline:
  1. Query Google News RSS (hl=en-IN, gl=IN) for each topic.
  2. Keep only items whose <source> matches the allowlist (vetting).
  3. Dedupe across queries by guid + normalized title.
  4. Resolve each Google-News redirect to its clean PUBLISHER url via the
     batchexecute endpoint — INCREMENTALLY: urls already resolved in a prior
     run are reused from the existing JSON, so re-runs stay fast and gentle on
     Google. Best-effort og:description is grabbed at the same time.
  5. Sort by date desc, cap, and write data/news.json.

Stdlib only (urllib + xml) so it runs in CI with no pip install.
Re-run:  python3 scripts/fetch-india-news.py
"""
import json
import re
import time
import html
import urllib.request
import urllib.parse
import hashlib
from pathlib import Path
from datetime import datetime, timezone
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "news.json"

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
GN = "https://news.google.com/rss/search?hl=en-IN&gl=IN&ceid=IN:en&q="
MAX_ITEMS = 40          # final cap written to JSON
PER_QUERY_CAP = 20      # keep at most this many (most recent) per query
RECENCY = "when:90d"    # Google News recency window appended to each query

# ── Topic queries (relevance) ────────────────────────────────────────────────
# Anchored on India's startup ecosystem: funding, government schemes/policy,
# the major startup hubs, and sector signal.
QUERIES = [
    '"India" (startup OR "venture capital") (funding OR raises OR investment OR "seed round" OR "Series A" OR "Series B")',
    '"Indian startup" (funding OR acquisition OR IPO OR unicorn OR merger OR layoffs)',
    '(DPIIT OR "Startup India" OR SISFS OR "Fund of Funds" OR MeitY OR BIRAC OR "Atal Innovation") (startup OR scheme OR grant OR fund OR recognition)',
    '(Bengaluru OR Bangalore OR Mumbai OR "New Delhi" OR Gurugram OR Hyderabad OR Pune OR Chennai OR Noida) startup (funding OR raises OR "venture capital")',
    '"India" (fintech OR SaaS OR "deep tech" OR "artificial intelligence" OR spacetech OR agritech OR healthtech OR "electric vehicle") startup (funding OR raises OR launch)',
    'India (incubator OR accelerator OR "angel investor" OR "angel network" OR "seed fund") startup',
    'India startup (policy OR regulation OR "angel tax" OR ESOP OR "IPO filing" OR DRHP)',
]

# ── Allowlist (VETTING) ───────────────────────────────────────────────────────
# canonical label -> {match: substrings that appear in GN <source>, tier, tags}
# Match is case-insensitive "contains". Order matters: first match wins.
# (Seed list — adding a reputable Indian outlet = one row here.)
ALLOWLIST = [
    # ── Startup / tech trade press ──
    ("Entrackr",              ["entrackr"],                                        "Startup trade",     ["Startups"]),
    ("Inc42",                 ["inc42"],                                           "Startup trade",     ["Startups"]),
    ("YourStory",             ["yourstory"],                                       "Startup trade",     ["Startups"]),
    ("StartupTalky",          ["startuptalky"],                                    "Startup trade",     ["Startups"]),
    ("TICE News",             ["tice news", "tice.news"],                          "Startup trade",     ["Startups"]),
    ("VCCircle",              ["vccircle"],                                        "Startup trade",     ["Funding"]),
    ("MediaNama",             ["medianama"],                                       "Tech policy",       ["Policy"]),
    ("The Ken",               ["the ken"],                                         "Startup trade",     ["Startups"]),
    ("Moneycontrol",          ["moneycontrol"],                                    "Business",          ["Business"]),
    # ── Business dailies / wires ──
    ("The Economic Times",    ["economic times", "economictimes"],                 "Business daily",    ["Business"]),
    ("Mint",                  ["livemint", "mint"],                                "Business daily",    ["Business"]),
    ("Business Standard",     ["business standard"],                               "Business daily",    ["Business"]),
    ("The Financial Express", ["financial express"],                               "Business daily",    ["Business"]),
    ("BusinessLine",          ["businessline", "hindu businessline"],              "Business daily",    ["Business"]),
    ("Business Today",        ["business today"],                                  "Business",          ["Business"]),
    ("Forbes India",          ["forbes india"],                                    "Business",          ["Business"]),
    ("CNBC-TV18",             ["cnbc-tv18", "cnbctv18", "cnbc tv18"],              "Business",          ["Business"]),
    ("Reuters",               ["reuters"],                                         "Wire",              ["Business"]),
    ("Bloomberg",             ["bloomberg"],                                       "Wire",              ["Business"]),
    # ── Official ──
    ("Press Information Bureau", ["press information bureau", "pib"],              "Government",        ["Policy"]),
]


def fetch(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "ignore")


def match_source(source_text):
    """Return (label, tier, tags) if source is allowlisted, else None."""
    s = (source_text or "").lower()
    for label, needles, tier, tags in ALLOWLIST:
        if any(n in s for n in needles):
            return label, tier, tags
    return None


def norm_title(t):
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", "", (t or "").lower())).strip()


def parse_pubdate(s):
    for fmt in ("%a, %d %b %Y %H:%M:%S %Z", "%a, %d %b %Y %H:%M:%S %z"):
        try:
            dt = datetime.strptime(s.strip(), fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except (ValueError, AttributeError):
            continue
    return None


def gn_article_id(link):
    """Extract the encoded article id from a Google News rss/articles link."""
    m = re.search(r"/articles/([^?]+)", link or "")
    return m.group(1) if m else None


def resolve_url(article_id, timeout=15):
    """Resolve a Google News article id to its clean publisher URL via
    batchexecute. Returns (url, og_description) — best effort, ('', '') on failure."""
    try:
        page = fetch(f"https://news.google.com/rss/articles/{article_id}", timeout)
        sig = re.search(r'data-n-a-sg="([^"]+)"', page)
        ts = re.search(r'data-n-a-ts="([^"]+)"', page)
        if not (sig and ts):
            return "", ""
        inner = json.dumps([
            "garturlreq",
            [["X", "X", ["X", "X"], None, None, 1, 1, "US:en", None, 1, None, None, None, None, None, 0, 1],
             "X", "X", 1, [1, 1, 1], 1, 1, None, 0, 0, None, 0],
            article_id, ts.group(1), sig.group(1),
        ])
        payload = [[["Fbv4je", inner, None, "generic"]]]
        body = "f.req=" + urllib.parse.quote(json.dumps(payload))
        req = urllib.request.Request(
            "https://news.google.com/_/DotsSplashUi/data/batchexecute",
            data=body.encode(),
            headers={"User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"},
        )
        with urllib.request.urlopen(req, timeout=timeout) as r:
            resp = r.read().decode("utf-8", "ignore")
        m = re.search(r'(https?://(?!news\.google)[^"\\]+)', resp)
        url = m.group(1) if m else ""
        og = ""
        if url:
            try:
                doc = fetch(url, timeout)
                ogm = (re.search(r'<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']+)', doc)
                       or re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)', doc))
                if ogm:
                    og = html.unescape(ogm.group(1)).strip()[:280]
            except Exception:
                pass
        return url, og
    except Exception:
        return "", ""


def main():
    # Load prior run as a resolve-cache keyed by Google News article id.
    cache = {}
    if OUT.exists():
        try:
            for it in json.loads(OUT.read_text()):
                if it.get("gnId"):
                    cache[it["gnId"]] = it
        except Exception:
            pass

    seen, picked = set(), {}
    for q in QUERIES:
        url = GN + urllib.parse.quote(f"{q} {RECENCY}")
        try:
            xml = fetch(url)
        except Exception as e:
            print(f"  ! query failed ({e}): {q[:50]}")
            continue
        try:
            root = ET.fromstring(xml)
        except ET.ParseError:
            continue
        items = root.findall(".//item")
        kept = 0
        for it in items:
            if kept >= PER_QUERY_CAP:
                break
            src_el = it.find("source")
            allowed = match_source(src_el.text if src_el is not None else "")
            if not allowed:
                continue
            label, tier, base_tags = allowed
            title_raw = (it.findtext("title") or "").strip()
            # GN appends " - Source Name" to titles; strip it.
            title = re.sub(r"\s*[-–]\s*" + re.escape(label) + r"\s*$", "", title_raw).strip()
            title = re.sub(r"\s*[-–]\s*[^-–]{1,40}$", "", title) if title == title_raw else title
            link = (it.findtext("link") or "").strip()
            gn_id = gn_article_id(link)
            nt = norm_title(title)
            if not title or not gn_id or nt in seen:
                continue
            seen.add(nt)
            dt = parse_pubdate(it.findtext("pubDate") or "")
            picked[gn_id] = {
                "gnId": gn_id, "gnLink": link, "title": title, "source": label,
                "sourceTier": tier, "tags": base_tags,
                "date": dt.date().isoformat() if dt else "",
                "year": dt.year if dt else None,
                "_sortkey": dt.timestamp() if dt else 0,
            }
            kept += 1
        print(f"  · {kept:>2} kept  | {q[:58]}")

    # Most-recent first, then cap before the (rate-limited) resolve step.
    ordered = sorted(picked.values(), key=lambda x: x["_sortkey"], reverse=True)[:MAX_ITEMS]

    out, resolved_new = [], 0
    for it in ordered:
        cached = cache.get(it["gnId"])
        if cached and cached.get("url"):
            url, summary = cached["url"], cached.get("summary", "")
        else:
            url, summary = resolve_url(it["gnId"])
            resolved_new += 1
            time.sleep(1.2)  # be gentle on Google
        final_url = url or it["gnLink"]   # graceful fallback to GN link
        slug = hashlib.sha1((url or it["gnId"]).encode()).hexdigest()[:12]
        out.append({
            "id": f"ext-{slug}",
            "type": "external",
            "title": it["title"],
            "date": it["date"],
            "year": it["year"],
            "summary": summary,
            "url": final_url,
            "source": it["source"],
            "sourceTier": it["sourceTier"],
            "tags": it["tags"],
            "gnId": it["gnId"],     # kept for the incremental resolve-cache
        })

    out.sort(key=lambda x: x["date"] or "", reverse=True)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=2) + "\n")
    print(f"\n✓ {len(out)} vetted items "
          f"({resolved_new} newly resolved, {len(out) - resolved_new} cached) → {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
