/* ============================================================
   site.js — client runtime for the playbook site.
   Zero dependencies. Page-specific features initialise only when
   their root element exists. Data arrives either via
   <script type="application/json"> islands (per-page data) or
   window.SEARCH_INDEX (search-index.js, loaded on every page).
   ============================================================ */
(() => {
  "use strict";

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const readJSON = (id) => { const el = document.getElementById(id); return el ? JSON.parse(el.textContent) : null; };
  const ROOT = document.documentElement.getAttribute("data-root") || "";

  const CAT_LABEL = { grant: "Grant", equity: "Equity", "loan-credit": "Loan / Credit", incubation: "Incubation", "market-access": "Market Access", mixed: "Mixed", other: "Other" };
  const STAGE_LABEL = { ideation: "Ideation", prototype: "Prototype / PoC", "early-stage": "Seed / Early-Stage", growth: "Growth / Scaling", "market-access": "Market Access & IP" };
  const badge = (cat) => `<span class="badge b-${esc(cat)}">${esc(CAT_LABEL[cat] || cat)}</span>`;

  const motionOK = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scrollBehavior = motionOK ? "smooth" : "auto";

  /* ---------- theme ---------- */
  const themeBtn = $("#theme-toggle");
  if (themeBtn) {
    const syncLabel = () => {
      const dark = document.documentElement.getAttribute("data-theme") === "dark";
      themeBtn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    };
    syncLabel();
    themeBtn.addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("playbook-theme", next); } catch {}
      syncLabel();
    });
  }

  /* ---------- mobile nav ---------- */
  const navToggle = $("#nav-toggle");
  const scrim = $("#scrim");
  const closeNav = () => {
    document.body.classList.remove("nav-open");
    navToggle && navToggle.setAttribute("aria-expanded", "false");
  };
  if (navToggle) {
    navToggle.addEventListener("click", () => {
      const open = document.body.classList.toggle("nav-open");
      navToggle.setAttribute("aria-expanded", String(open));
    });
    scrim && scrim.addEventListener("click", closeNav);
    window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeNav(); });
  }

  /* ---------- sidebar: open group containing current page ---------- */
  const current = $('.sidebar a[aria-current="page"]');
  if (current) {
    let el = current.parentElement;
    while (el && !el.classList.contains("sidebar")) {
      if (el.tagName === "DETAILS") el.open = true;
      el = el.parentElement;
    }
    current.scrollIntoView({ block: "nearest" });
  }

  /* ---------- back to top ---------- */
  const toTop = $("#to-top");
  if (toTop) {
    const onScroll = () => toTop.classList.toggle("show", window.scrollY > 700);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: scrollBehavior }));
  }

  /* ---------- toc scroll-spy ---------- */
  const tocLinks = $$(".toc a");
  if (tocLinks.length) {
    const map = new Map();
    tocLinks.forEach((a) => {
      const id = decodeURIComponent(a.getAttribute("href").slice(1));
      const target = document.getElementById(id);
      if (target) map.set(target, a);
    });
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          tocLinks.forEach((a) => a.classList.remove("active"));
          const link = map.get(en.target);
          link && link.classList.add("active");
        }
      });
    }, { rootMargin: "-70px 0px -70% 0px" });
    map.forEach((_, target) => spy.observe(target));
  }

  /* ---------- search modal ---------- */
  const modal = $("#search-modal");
  if (modal) {
    const input = $("#search-input");
    const results = $("#search-results");
    const status = $("#search-status");
    let sel = -1;
    let lastTrigger = null;

    input.setAttribute("role", "combobox");
    input.setAttribute("aria-controls", "search-results");
    input.setAttribute("aria-expanded", "true");
    input.setAttribute("aria-autocomplete", "list");
    results.setAttribute("role", "listbox");

    const open = () => {
      lastTrigger = document.activeElement;
      modal.classList.add("open");
      document.body.style.overflow = "hidden";
      input.value = ""; render(""); input.focus();
    };
    const close = () => {
      modal.classList.remove("open"); sel = -1;
      document.body.style.overflow = "";
      if (lastTrigger && lastTrigger.focus) lastTrigger.focus();
    };

    // keep Tab inside the dialog while open
    modal.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const focusables = [input, ...$$(".hit", results)];
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    $$("[data-search-open]").forEach((b) => b.addEventListener("click", open));
    $(".backdrop", modal).addEventListener("click", close);
    window.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); modal.classList.contains("open") ? close() : open(); }
      else if (e.key === "/" && !modal.classList.contains("open") && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) { e.preventDefault(); open(); }
      else if (e.key === "Escape" && modal.classList.contains("open")) close();
    });

    const score = (item, q) => {
      const hay = `${item.t} ${item.s || ""} ${item.g || ""} ${item.m || ""}`.toLowerCase();
      if (!hay.includes(q)) return -1;
      let sc = 0;
      const tl = item.t.toLowerCase(), sn = (item.s || "").toLowerCase();
      if (sn === q || tl === q) sc += 100;
      if (sn.startsWith(q)) sc += 60;
      if (tl.startsWith(q)) sc += 40;
      if (tl.includes(q)) sc += 20;
      if (item.k === "scheme") sc += 10;
      return sc;
    };

    const mark = (text, q) => {
      if (!q) return esc(text);
      const i = text.toLowerCase().indexOf(q);
      if (i < 0) return esc(text);
      return `${esc(text.slice(0, i))}<mark>${esc(text.slice(i, i + q.length))}</mark>${esc(text.slice(i + q.length))}`;
    };

    const render = (qRaw) => {
      const q = qRaw.trim().toLowerCase();
      const index = window.SEARCH_INDEX || [];
      let hits;
      if (!q) {
        hits = index.filter((x) => x.k === "page").slice(0, 8);
      } else {
        hits = index.map((x) => [score(x, q), x]).filter(([s]) => s >= 0)
          .sort((a, b) => b[0] - a[0]).slice(0, 12).map(([, x]) => x);
      }
      sel = -1;
      input.removeAttribute("aria-activedescendant");
      if (status) status.textContent = q ? `${hits.length} result${hits.length === 1 ? "" : "s"}` : "";
      if (!hits.length) { results.innerHTML = `<div class="none">No matches for “${esc(qRaw)}”. Try a scheme abbreviation like “SISFS”.</div>`; return; }
      results.innerHTML = hits.map((h, i) => `
        <a class="hit" role="option" id="hit-${i}" href="${ROOT}${esc(h.u)}">
          <div class="h-name">${mark(h.t, q)}${h.s ? ` <span class="abbr muted">· ${mark(h.s, q)}</span>` : ""}${h.c ? " " + badge(h.c) : ""}</div>
          ${h.d ? `<div class="h-sub">${mark(h.d, q)}</div>` : ""}
        </a>`).join("");
    };

    input.addEventListener("input", () => render(input.value));
    input.addEventListener("keydown", (e) => {
      const hits = $$(".hit", results);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        sel = e.key === "ArrowDown" ? Math.min(sel + 1, hits.length - 1) : Math.max(sel - 1, 0);
        hits.forEach((h, i) => h.classList.toggle("sel", i === sel));
        if (hits[sel]) {
          hits[sel].scrollIntoView({ block: "nearest" });
          input.setAttribute("aria-activedescendant", hits[sel].id);
        }
      } else if (e.key === "Enter" && sel >= 0 && hits[sel]) {
        window.location.href = hits[sel].href;
      }
    });
  }

  /* ================= DIRECTORY ================= */
  const dirRoot = $("#directory");
  if (dirRoot) {
    const DATA = readJSON("directory-data") || [];
    const state = { q: "", part: "", support: "", stage: "", sector: "", audience: "", view: "cards" };

    const els = {
      q: $("#f-q"), part: $("#f-part"), support: $("#f-support"), stage: $("#f-stage"),
      sector: $("#f-sector"), audience: $("#f-audience"),
      count: $("#f-count"), out: $("#dir-out"),
      viewBtns: $$("#view-toggle button"), reset: $("#f-reset"),
    };

    const matches = (s) =>
      (!state.part || s.part === state.part) &&
      (!state.support || s.category === state.support || s.supportTypes.includes(state.support)) &&
      (!state.stage || s.stages.includes(state.stage)) &&
      (!state.sector || s.sectors.includes(state.sector)) &&
      (!state.audience || s.audience.includes(state.audience)) &&
      (!state.q || `${s.name} ${s.shortName} ${s.ministry} ${s.tagline} ${s.maxFunding}`.toLowerCase().includes(state.q));

    const cardHTML = (s) => `
      <a class="scheme-card" href="${ROOT}schemes/${esc(s.slug)}.html">
        <div class="top">
          <span class="abbr">${s.shortName ? `${esc(s.shortName)} · ` : ""}Part ${esc(s.part)}</span>
          ${badge(s.category)}
        </div>
        <h3>${esc(s.name)}</h3>
        <div class="ministry">${esc(s.ministry)}</div>
        <p class="tagline">${esc(s.tagline)}</p>
        <div class="meta">
          ${s.stages.map((st) => `<span class="badge b-plain b-part">${esc(STAGE_LABEL[st] || st)}</span>`).join("")}
          ${state.support && s.category !== state.support && s.supportTypes.includes(state.support) ? `<span class="badge b-${esc(state.support)}">Also: ${esc(CAT_LABEL[state.support])}</span>` : ""}
          ${s.maxFunding ? `<span class="amount">${esc(s.maxFunding)}</span>` : ""}
        </div>
      </a>`;

    const rowHTML = (s) => `
      <tr>
        <td class="cell-scheme"><a href="${ROOT}schemes/${esc(s.slug)}.html"><strong>${esc(s.shortName || s.name)}</strong></a><span class="sub">${esc(s.name)}</span></td>
        <td class="cell-ministry">${esc(s.ministry)}</td>
        <td>${badge(s.category)}</td>
        <td class="cell-stages">${s.stages.map((st) => `<span class="badge b-plain b-part">${esc(STAGE_LABEL[st] || st)}</span>`).join("")}</td>
        <td class="num cell-amount">${esc(s.maxFunding || "—")}</td>
      </tr>`;

    const render = () => {
      const found = DATA.filter(matches);
      els.count.innerHTML = `Showing <b>${found.length}</b> of ${DATA.length} schemes`;
      if (!found.length) {
        els.out.innerHTML = `<div class="empty-state"><div class="big">🔍</div><p>No schemes match those filters.</p><p class="small">Try clearing a filter or two — or <button class="btn-ghost btn" id="f-reset2">reset all filters</button></p></div>`;
        const r2 = $("#f-reset2"); r2 && r2.addEventListener("click", reset);
        return;
      }
      if (state.view === "cards") {
        els.out.innerHTML = `<div class="grid grid-2">${found.map(cardHTML).join("")}</div>`;
      } else {
        els.out.innerHTML = `<div class="table-wrap"><table class="data">
          <thead><tr><th>Scheme</th><th>Ministry</th><th>Support</th><th>Stage</th><th>Headline amount</th></tr></thead>
          <tbody>${found.map(rowHTML).join("")}</tbody></table></div>`;
      }
    };

    const reset = () => {
      state.q = state.part = state.support = state.stage = state.sector = state.audience = "";
      els.q.value = ""; [els.part, els.support, els.stage, els.sector, els.audience].forEach((el) => el && (el.value = ""));
      render();
    };

    els.q.addEventListener("input", () => { state.q = els.q.value.trim().toLowerCase(); render(); });
    ["part", "support", "stage", "sector", "audience"].forEach((k) => {
      els[k] && els[k].addEventListener("change", () => { state[k] = els[k].value; render(); });
    });
    els.reset && els.reset.addEventListener("click", reset);
    els.viewBtns.forEach((b) => b.addEventListener("click", () => {
      state.view = b.dataset.view;
      els.viewBtns.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      render();
    }));

    // deep-link filters: directory.html?support=grant&stage=ideation&q=seed
    const params = new URLSearchParams(location.search);
    ["part", "support", "stage", "sector", "audience"].forEach((k) => {
      const v = params.get(k);
      if (v && els[k] && [...els[k].options].some((o) => o.value === v)) { state[k] = v; els[k].value = v; }
    });
    if (params.get("q")) { state.q = params.get("q").toLowerCase(); els.q.value = params.get("q"); }
    render();
  }

  /* ================= FINDER WIZARD ================= */
  const wizRoot = $("#wizard");
  if (wizRoot) {
    const TREE = readJSON("tree-data"); // {intro, questions:[{id,question,branches:[{label,note,tone,schemes:[{name,qual,slug,category}]}]}]}
    const picks = []; // {q, label, schemes}
    let step = 0;

    const BRANCH_TONE = ["var(--brand-saffron)", "var(--brand-green)", "var(--brand-navy)", "var(--cat-incubation)", "var(--cat-equity)", "var(--warning)"];

    const progress = () => `
      <div class="wizard-progress" aria-hidden="true">
        ${TREE.questions.map((_, i) => `<span class="seg ${i < step ? "done" : ""}"><span class="fill"></span></span>`).join("")}
      </div>`;

    const resultCards = (schemes) => `
      <div class="related" style="margin-top:12px">${schemes.map((s) => s.slug
        ? `<a href="${ROOT}schemes/${esc(s.slug)}.html"><span class="rn">${esc(s.name)}${s.qual ? ` <span class="qual">${esc(s.qual)}</span>` : ""}</span>${s.full && s.full !== s.name ? `<span class="rm">${esc(s.full)}</span>` : s.tagline ? `<span class="rm">${esc(s.tagline)}</span>` : ""}</a>`
        : `<span class="dead">${esc(s.name)}</span>`).join("")}
      </div>`;

    const focusHeading = () => {
      const h = $("h2", wizRoot);
      if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
    };

    const renderStep = () => {
      const q = TREE.questions[step];
      wizRoot.innerHTML = `
        ${progress()}
        <div class="qcard" role="group" aria-labelledby="wq">
          <div class="qnum">Question ${q.id} of ${TREE.questions.length}</div>
          <h2 id="wq">${esc(q.question)}</h2>
          <div class="answers ${q.branches.length > 2 ? "answers-many" : ""}">
            ${q.branches.map((b, i) => `
              <button class="answer" data-i="${i}">
                <span class="a-label"><span class="a-dot" style="background:${BRANCH_TONE[i % BRANCH_TONE.length]}"></span>${esc(b.label)}</span>
                ${b.note ? `<span class="a-note">${esc(b.note)}</span>` : b.schemes.length ? `<span class="a-note">${b.schemes.length} scheme${b.schemes.length > 1 ? "s" : ""}</span>` : ""}
              </button>`).join("")}
            <button class="answer" data-skip="1">
              <span class="a-label"><span class="a-dot" style="background:var(--border-strong)"></span>Skip this question</span>
              <span class="a-note">Not relevant to me</span>
            </button>
          </div>
          ${step > 0 ? `<button class="btn btn-ghost wizard-back" data-back="1">← Back</button>` : ""}
        </div>`;
      $$(".answer", wizRoot).forEach((btn) => btn.addEventListener("click", () => {
        if (btn.dataset.skip) { picks[step] = null; }
        else {
          const b = TREE.questions[step].branches[Number(btn.dataset.i)];
          picks[step] = { q: TREE.questions[step].question, label: b.label, note: b.note, schemes: b.schemes };
        }
        step += 1;
        step < TREE.questions.length ? renderStep() : renderResults();
        wizRoot.scrollIntoView({ behavior: scrollBehavior, block: "start" });
        focusHeading();
      }));
      const back = $("[data-back]", wizRoot);
      back && back.addEventListener("click", () => { step -= 1; renderStep(); focusHeading(); });
    };

    const renderResults = () => {
      const answered = picks.filter(Boolean).filter((p) => p.schemes.length);
      wizRoot.innerHTML = `
        ${progress()}
        <div class="wizard-results">
          <h2>Your matched schemes</h2>
          ${answered.length ? "" : `<p class="muted" style="margin-top:10px">You skipped every question — here's the full playbook instead.</p>`}
          ${answered.map((p) => `
            <div class="r-group">
              <h3>${esc(p.q)}</h3>
              <p class="r-note">You answered: <strong>${esc(p.label)}</strong>${p.schemes.length ? ` — ${p.schemes.length} matching scheme${p.schemes.length > 1 ? "s" : ""}` : ""}</p>
              ${resultCards(p.schemes)}
            </div>`).join("")}
          <div class="restart-row">
            <button class="btn btn-secondary" id="wiz-restart">↺ Start over</button>
            <a class="btn btn-primary" href="${ROOT}directory.html">Browse all schemes</a>
            <a class="btn btn-ghost" href="${ROOT}compare.html">Compare schemes</a>
          </div>
        </div>`;
      $("#wiz-restart").addEventListener("click", () => { picks.length = 0; step = 0; renderStep(); focusHeading(); });
    };

    renderStep();
  }

  /* ================= COMPARE ================= */
  const cmpRoot = $("#compare");
  if (cmpRoot) {
    const DATA = readJSON("compare-data") || []; // full scheme objects (lean fields)
    const bySlug = new Map(DATA.map((s) => [s.slug, s]));
    const selects = $$(".compare-pickers select");
    const out = $("#compare-out");

    const opt = (sel) => `<option value="">— Choose a scheme —</option>` +
      DATA.map((s) => `<option value="${esc(s.slug)}" ${sel === s.slug ? "selected" : ""}>${esc(s.shortName ? `${s.shortName} — ${s.name}` : s.name)}</option>`).join("");

    const rowsSpec = [
      ["Support type", (s) => badge(s.category)],
      ["Ministry", (s) => esc(s.ministry)],
      ["Best suited for", (s) => esc(s.bestSuitedFor)],
      ["What is it?", (s) => esc(s.tagline)],
      ["Who can apply", (s) => `<ul>${s.eligibility.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>`],
      ["What you get", (s) => `<ul>${s.benefits.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`],
      ["Headline amount", (s) => s.maxFunding ? `<strong>${esc(s.maxFunding)}</strong>` : "—"],
      ["How to apply", (s) => esc(s.howToApply)],
    ];

    const render = () => {
      const chosen = selects.map((s) => bySlug.get(s.value)).filter(Boolean);
      const params = new URLSearchParams();
      selects.forEach((s, i) => s.value && params.set(`s${i + 1}`, s.value));
      history.replaceState(null, "", params.toString() ? `?${params}` : location.pathname);
      const statusEl = $("#compare-status");
      if (statusEl) statusEl.textContent = chosen.length >= 2 ? `Comparing ${chosen.map((s) => s.shortName || s.name).join(" and ")}` : "";
      if (chosen.length < 2) {
        out.innerHTML = `<div class="empty-state"><div class="big">⚖️</div><p>Pick at least two schemes above to compare them side by side.</p></div>`;
        return;
      }
      out.innerHTML = `<div class="compare-table-wrap"><table class="compare">
        <thead><tr><td></td>${chosen.map((s) => `<th scope="col" class="col-head"><a href="${ROOT}schemes/${esc(s.slug)}.html">${esc(s.shortName || s.name)}</a><span class="m">${esc(s.name)}</span></th>`).join("")}</tr></thead>
        <tbody>${rowsSpec.map(([label, fn]) => `<tr><th scope="row">${label}</th>${chosen.map((s) => `<td>${fn(s)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table></div>`;
    };

    const params = new URLSearchParams(location.search);
    selects.forEach((sel, i) => {
      sel.innerHTML = opt(params.get(`s${i + 1}`) || "");
      sel.addEventListener("change", render);
    });
    render();
  }
})();
