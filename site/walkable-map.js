import {
  MAX_ZOOM,
  MAP_HEIGHT,
  MAP_WIDTH,
  MIN_ZOOM,
  WALK_SPEED,
  WORLD_SCALE,
  ZOOM_STEP,
  clampCamera,
  clampZoom,
  distance,
  normalizeMovement,
  placeOrganizations,
} from "./walkable-core.js";

const root = document.querySelector("#walkable-map");

if (root) {
  const readJSON = (id) => JSON.parse(document.getElementById(id)?.textContent || "null");
  const incubators = readJSON("walkable-incubators") || [];
  const map = readJSON("india-map-data");
  const stateRecords = readJSON("walkable-states") || [];
  const stateMeta = Object.fromEntries(stateRecords.map((state) => [state.state, state]));
  const mapStates = map?.states || {};
  if (!mapStates.Lakshadweep?.d) {
    mapStates.Lakshadweep = {
      cx: 163.3,
      cy: 964.4,
      d: [
        "M148,952a2,2 0 1,0 0,4a2,2 0 1,0 0,-4",
        "M156,961.5a1.75,1.75 0 1,0 0,3.5a1.75,1.75 0 1,0 0,-3.5",
        "M163,962a2.25,2.25 0 1,0 0,4.5a2.25,2.25 0 1,0 0,-4.5",
        "M169,975.5a1.75,1.75 0 1,0 0,3.5a1.75,1.75 0 1,0 0,-3.5",
        "M174,988a2,2 0 1,0 0,4a2,2 0 1,0 0,-4",
        "M178,1031.5a2.5,2.5 0 1,0 0,5a2.5,2.5 0 1,0 0,-5",
      ].join(""),
    };
  }
  const world = root.querySelector(".walkable-world");
  const viewport = root.querySelector(".walkable-viewport");
  const ground = root.querySelector(".walkable-ground");
  const orgLayer = root.querySelector(".walkable-orgs");
  const landmarkLayer = root.querySelector(".walkable-landmarks");
  const wayfinderLayer = root.querySelector(".walkable-wayfinders");
  const avatar = root.querySelector(".walkable-avatar");
  const minimapDot = root.querySelector(".walkable-minimap-dot");
  const nearbyButton = root.querySelector("#walkable-nearby");
  const zoomIn = root.querySelector("#walkable-zoom-in");
  const zoomOut = root.querySelector("#walkable-zoom-out");
  const zoomReset = root.querySelector("#walkable-zoom-reset");
  const zoomLevel = root.querySelector("#walkable-zoom-level");
  const recenter = root.querySelector("#walkable-recenter");
  const help = root.querySelector("#walkable-help");
  const drawer = root.querySelector("#state-drawer");
  const drawerBackdrop = root.querySelector(".walkable-drawer-backdrop");
  const drawerPanel = root.querySelector(".walkable-drawer-panel");
  const drawerBody = root.querySelector(".walkable-drawer-body");
  const drawerTitle = root.querySelector("#state-drawer-title");
  const drawerClose = root.querySelector("#state-drawer-close");
  const motionOK = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const worldSize = { width: MAP_WIDTH * WORLD_SCALE, height: MAP_HEIGHT * WORLD_SCALE };
  const typeLabels = {
    Academic: "Academic incubator",
    TBI: "Technology Business Incubator",
    AIC: "Atal Incubation Centre",
    Government: "Government incubator",
    "Sector-specific": "Sector-specific incubator",
    Private: "Private incubator",
  };
  const typeKeys = {
    Academic: "academic",
    TBI: "tbi",
    AIC: "aic",
    Government: "government",
    "Sector-specific": "sector",
    Private: "private",
  };
  const iconPaths = {
    academic: '<path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',
    tbi: '<path d="M12 21v-9"/><path d="M12 14c-5 0-7-3-7-7 4 0 7 2 7 7Zm0-3c4 0 6-3 6-6-4 0-6 2-6 6Z"/>',
    aic: '<path d="M14.5 4.5C17 2 20 2 20 2s0 3-2.5 5.5l-7 7-4-4 8-6Z"/><circle cx="15.5" cy="6.5" r="1.5"/><path d="M10.5 7H6L3 10l4 1.5M14 14l-1.5 4.5L9.5 21 9 15.5"/><path d="M7 17c-2 0-3 1-3 3 2 0 3-1 3-3Z"/>',
    government: '<path d="m3 9 9-5 9 5"/><path d="M5 10h14M6 10v8m4-8v8m4-8v8m4-8v8M3 20h18"/>',
    sector: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 3v4m0 10v4M3 12h4m10 0h4"/>',
    private: '<path d="M9 7V5h6v2"/><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 12h18m-11 0v2h4v-2"/>',
  };
  const icon = (type) => {
    const key = typeKeys[type] || type;
    return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${iconPaths[key] || iconPaths.private}</svg>`;
  };
  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[char]));
  const toWorld = (point) => ({ x: point.x * WORLD_SCALE, y: point.y * WORLD_SCALE });

  ground.innerHTML = Object.entries(mapStates).map(([name, shape]) =>
    `<path data-state="${escapeHTML(name)}" d="${shape.d}"></path>`).join("");

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const paths = Object.fromEntries(Object.entries(mapStates).map(([name, shape]) => [name, new Path2D(shape.d)]));
  const landPaths = Object.values(paths);
  const containsLand = (point) => landPaths.some((path) => context.isPointInPath(path, point.x, point.y));
  const containsState = (name, point) => Boolean(paths[name] && context.isPointInPath(paths[name], point.x, point.y));
  const safeAnchor = (name) => {
    const shape = mapStates[name];
    const origin = { x: shape?.cx || MAP_WIDTH / 2, y: shape?.cy || MAP_HEIGHT / 2 };
    if (containsState(name, origin)) return origin;
    for (let radius = 2; radius <= 80; radius += 2) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
        const point = { x: origin.x + Math.cos(angle) * radius, y: origin.y + Math.sin(angle) * radius };
        if (containsState(name, point)) return point;
      }
    }
    return origin;
  };

  const stateAnchors = {};
  const stateBounds = {};
  for (const name of Object.keys(mapStates)) {
    stateAnchors[name] = safeAnchor(name);
    const shape = ground.querySelector(`[data-state="${CSS.escape(name)}"]`);
    const box = shape.getBBox();
    stateBounds[name] = { x: box.x, y: box.y, width: box.width, height: box.height };
  }

  const placedIncubators = placeOrganizations({
    organizations: incubators,
    regionBounds: stateBounds,
    regionAnchors: stateAnchors,
    contains: containsState,
  });

  for (const incubator of placedIncubators) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "walkable-org";
    button.dataset.type = typeKeys[incubator.type] || "private";
    button.dataset.state = incubator.region;
    button.dataset.slug = incubator.slug;
    button.style.left = `${incubator.x * WORLD_SCALE}px`;
    button.style.top = `${incubator.y * WORLD_SCALE}px`;
    button.setAttribute("aria-label", `${incubator.name}, ${typeLabels[incubator.type] || incubator.type}`);
    button.innerHTML = `${icon(incubator.type)}<span>${escapeHTML(incubator.shortName || incubator.name)}</span>`;
    button.addEventListener("click", () => openState(incubator.region, button, incubator.slug));
    orgLayer.append(button);
  }

  for (const state of stateRecords) {
    const anchor = stateAnchors[state.state];
    if (!anchor) continue;
    const count = incubators.filter((incubator) => incubator.region === state.state).length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `walkable-landmark${count ? "" : " is-empty"}`;
    button.style.left = `${anchor.x * WORLD_SCALE}px`;
    button.style.top = `${anchor.y * WORLD_SCALE}px`;
    button.innerHTML = `<span class="walkable-landmark-pin" aria-hidden="true"></span><strong>${escapeHTML(state.state)}</strong><small>${count} incubator${count === 1 ? "" : "s"} · ${state.schemes.length} schemes</small>`;
    button.setAttribute("aria-label", `Open ${state.state}`);
    button.addEventListener("click", () => openState(state.state, button));
    landmarkLayer.append(button);
  }

  const signs = [
    { x: 277, y: 205, targets: ["Jammu and Kashmir", "Himachal Pradesh", "Punjab"] },
    { x: 319, y: 323, targets: ["Delhi", "Haryana", "Uttarakhand", "Uttar Pradesh"] },
    { x: 188, y: 493, targets: ["Rajasthan", "Gujarat", "Maharashtra"] },
    { x: 388, y: 505, targets: ["Madhya Pradesh", "Chhattisgarh", "Odisha"] },
    { x: 570, y: 506, targets: ["Bihar", "Jharkhand", "West Bengal", "Odisha"] },
    { x: 747, y: 409, targets: ["Sikkim", "Assam", "Meghalaya", "Arunachal Pradesh"] },
    { x: 872, y: 443, targets: ["Nagaland", "Manipur", "Mizoram", "Tripura"] },
    { x: 363, y: 694, targets: ["Maharashtra", "Telangana", "Andhra Pradesh", "Karnataka"] },
    { x: 335, y: 844, targets: ["Karnataka", "Tamil Nadu", "Kerala", "Puducherry"] },
  ];
  for (const sign of signs) {
    const signpost = document.createElement("div");
    signpost.className = "walkable-wayfinder";
    signpost.style.left = `${sign.x * WORLD_SCALE}px`;
    signpost.style.top = `${sign.y * WORLD_SCALE}px`;
    signpost.innerHTML = sign.targets.map((name) => {
      const target = stateAnchors[name];
      const angle = Math.atan2(target.y - sign.y, target.x - sign.x) * 180 / Math.PI;
      return `<button type="button" data-state="${escapeHTML(name)}"><span class="walkable-wayfinder-arrow" style="transform:rotate(${angle}deg)" aria-hidden="true">→</span>${escapeHTML(name)}</button>`;
    }).join("");
    signpost.querySelectorAll("button").forEach((button) =>
      button.addEventListener("click", () => openState(button.dataset.state, button)));
    wayfinderLayer.append(signpost);
  }

  const transfers = [
    { x: 286, y: 974, label: "Ferry to Lakshadweep", destination: "Lakshadweep" },
    { x: 163.3, y: 982, label: "Return to Kerala", destination: "Kerala" },
    { x: 410, y: 895, label: "Sail to Andaman & Nicobar", destination: "Andaman and Nicobar Islands" },
    { x: 840, y: 950, label: "Return to Tamil Nadu", destination: "Tamil Nadu" },
  ];
  for (const transfer of transfers) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "walkable-transfer";
    button.style.left = `${transfer.x * WORLD_SCALE}px`;
    button.style.top = `${transfer.y * WORLD_SCALE}px`;
    button.innerHTML = `<span aria-hidden="true">⛴</span><strong>${escapeHTML(transfer.label)}</strong>`;
    button.setAttribute("aria-label", `${transfer.label}. Move avatar to ${transfer.destination}.`);
    button.addEventListener("click", () => travelTo(transfer.destination));
    wayfinderLayer.append(button);
  }

  root.querySelector(".walkable-minimap-map").innerHTML = Object.entries(mapStates).map(([name, shape]) =>
    `<path data-state="${escapeHTML(name)}" d="${shape.d}"></path>`).join("");
  root.querySelectorAll(".walkable-minimap-states button").forEach((button) => {
    const anchor = stateAnchors[button.dataset.state];
    if (!anchor) return;
    button.style.left = `${anchor.x / MAP_WIDTH * 100}%`;
    button.style.top = `${anchor.y / MAP_HEIGHT * 100}%`;
    button.addEventListener("click", () => openState(button.dataset.state, button));
  });

  let position = toWorld(stateAnchors["Madhya Pradesh"]);
  let zoom = 1;
  const cameraViewport = () => ({ width: viewport.clientWidth / zoom, height: viewport.clientHeight / zoom });
  let camera = clampCamera(position, cameraViewport(), worldSize);
  let lastFrame = 0;
  let frame = 0;
  let nearbyState = "";
  let nearbyIncubator = null;
  let lastTrigger = null;
  const pressed = new Set();
  avatar.style.left = `${position.x}px`;
  avatar.style.top = `${position.y}px`;

  function renderCamera() {
    const target = clampCamera(position, cameraViewport(), worldSize);
    camera = motionOK
      ? { x: camera.x + (target.x - camera.x) * 0.2, y: camera.y + (target.y - camera.y) * 0.2 }
      : target;
    world.style.transform = `translate3d(${-camera.x * zoom}px, ${-camera.y * zoom}px, 0) scale(${zoom})`;
    avatar.style.left = `${position.x}px`;
    avatar.style.top = `${position.y}px`;
    minimapDot.style.left = `${position.x / worldSize.width * 100}%`;
    minimapDot.style.top = `${position.y / worldSize.height * 100}%`;
  }

  function updateNearby() {
    const mapPoint = { x: position.x / WORLD_SCALE, y: position.y / WORLD_SCALE };
    const currentState = stateRecords.find((state) => containsState(state.state, mapPoint))?.state || "";
    nearbyState = currentState;

    let nearestIncubator = null;
    for (const incubator of placedIncubators) {
      if (incubator.region !== currentState) continue;
      const candidate = {
        incubator,
        distance: distance(position, toWorld(incubator)),
      };
      if (!nearestIncubator || candidate.distance < nearestIncubator.distance) nearestIncubator = candidate;
    }
    const nextIncubator = nearestIncubator && nearestIncubator.distance < 620 ? nearestIncubator.incubator : null;
    if (nextIncubator?.slug !== nearbyIncubator?.slug) {
      nearbyIncubator = nextIncubator;
      root.querySelectorAll(".walkable-org.is-nearby").forEach((button) => button.classList.remove("is-nearby"));
      if (nearbyIncubator) {
        root.querySelector(`.walkable-org[data-slug="${CSS.escape(nearbyIncubator.slug)}"]`)?.classList.add("is-nearby");
      }
    }
    if (nearbyIncubator) {
      nearbyButton.hidden = false;
      nearbyButton.dataset.kind = "incubator";
      nearbyButton.dataset.state = currentState;
      nearbyButton.innerHTML = `Learn about <strong>${escapeHTML(nearbyIncubator.shortName || nearbyIncubator.name)}</strong><span>Enter</span>`;
      return;
    }

    if (currentState) {
      nearbyButton.hidden = false;
      nearbyButton.dataset.kind = "state";
      nearbyButton.dataset.state = currentState;
      nearbyButton.innerHTML = `Explore <strong>${escapeHTML(currentState)}</strong><span>Enter</span>`;
    } else {
      nearbyButton.hidden = true;
      delete nearbyButton.dataset.kind;
      delete nearbyButton.dataset.state;
    }
  }

  function tick(timestamp) {
    const elapsed = Math.min(0.05, (timestamp - lastFrame) / 1000 || 0);
    lastFrame = timestamp;
    const horizontal = (pressed.has("right") ? 1 : 0) - (pressed.has("left") ? 1 : 0);
    const vertical = (pressed.has("down") ? 1 : 0) - (pressed.has("up") ? 1 : 0);
    const movement = normalizeMovement(horizontal, vertical);
    if ((movement.x || movement.y) && drawer.hidden) {
      const next = {
        x: position.x + movement.x * WALK_SPEED * elapsed,
        y: position.y + movement.y * WALK_SPEED * elapsed,
      };
      if (containsLand({ x: next.x / WORLD_SCALE, y: next.y / WORLD_SCALE })) position = next;
      avatar.dataset.walking = "true";
      avatar.style.setProperty("--walk-angle", `${Math.atan2(movement.y, movement.x) * 180 / Math.PI}deg`);
    } else {
      delete avatar.dataset.walking;
    }
    renderCamera();
    updateNearby();
    const target = clampCamera(position, cameraViewport(), worldSize);
    frame = (movement.x || movement.y || Math.abs(camera.x - target.x) > 0.4 || Math.abs(camera.y - target.y) > 0.4)
      ? requestAnimationFrame(tick)
      : 0;
  }

  function requestTick() {
    if (!frame) {
      lastFrame = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }
  function travelTo(stateName) {
    const destination = stateAnchors[stateName];
    if (!destination) return;
    pressed.clear();
    position = toWorld(destination);
    camera = clampCamera(position, cameraViewport(), worldSize);
    renderCamera();
    updateNearby();
    requestTick();
  }
  function setDirection(direction, on) {
    on ? pressed.add(direction) : pressed.delete(direction);
    requestTick();
  }
  function recenterAvatar() {
    pressed.clear();
    camera = clampCamera(position, cameraViewport(), worldSize);
    renderCamera();
    requestTick();
  }
  function setZoom(nextZoom) {
    zoom = clampZoom(nextZoom);
    zoomLevel.value = `${Math.round(zoom * 100)}%`;
    zoomLevel.textContent = zoomLevel.value;
    zoomIn.disabled = zoom >= MAX_ZOOM;
    zoomOut.disabled = zoom <= MIN_ZOOM;
    zoomReset.disabled = zoom === 1;
    requestTick();
  }
  zoomIn.addEventListener("click", () => setZoom(zoom + ZOOM_STEP));
  zoomOut.addEventListener("click", () => setZoom(zoom - ZOOM_STEP));
  zoomReset.addEventListener("click", () => setZoom(1));
  recenter.addEventListener("click", recenterAvatar);

  const touchPoints = new Map();
  let pinchDistance = 0;
  let pinchZoom = 1;
  viewport.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch") return;
    touchPoints.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (touchPoints.size === 2) {
      const [first, second] = [...touchPoints.values()];
      pinchDistance = Math.hypot(second.x - first.x, second.y - first.y);
      pinchZoom = zoom;
    }
  });
  viewport.addEventListener("pointermove", (event) => {
    if (!touchPoints.has(event.pointerId)) return;
    touchPoints.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (touchPoints.size !== 2 || !pinchDistance) return;
    event.preventDefault();
    const [first, second] = [...touchPoints.values()];
    setZoom(pinchZoom * Math.hypot(second.x - first.x, second.y - first.y) / pinchDistance);
  });
  const endTouch = (event) => {
    touchPoints.delete(event.pointerId);
    if (touchPoints.size < 2) pinchDistance = 0;
  };
  viewport.addEventListener("pointerup", endTouch);
  viewport.addEventListener("pointercancel", endTouch);
  viewport.addEventListener("wheel", (event) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    setZoom(zoom - event.deltaY * 0.004);
  }, { passive: false });

  const keyDirection = {
    ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down",
    ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right",
  };
  window.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && nearbyState && drawer.hidden && !/^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test(document.activeElement?.tagName || "")) {
      event.preventDefault();
      openState(nearbyState, nearbyButton, nearbyIncubator?.region === nearbyState ? nearbyIncubator.slug : "");
      return;
    }
    const direction = keyDirection[event.key];
    if (!direction || !drawer.hidden || /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName || "")) return;
    event.preventDefault();
    setDirection(direction, true);
  });
  window.addEventListener("keyup", (event) => {
    const direction = keyDirection[event.key];
    if (direction) setDirection(direction, false);
  });
  window.addEventListener("blur", () => pressed.clear());
  document.addEventListener("visibilitychange", () => { if (document.hidden) pressed.clear(); });
  window.addEventListener("resize", requestTick);
  root.querySelectorAll(".walkable-dpad button").forEach((button) => {
    const release = () => setDirection(button.dataset.direction, false);
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      setDirection(button.dataset.direction, true);
    });
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
  });

  function incubatorRow(incubator, focused) {
    const key = typeKeys[incubator.type] || "private";
    const content = `<span class="walkable-drawer-icon">${icon(incubator.type)}</span>
      <span><strong>${escapeHTML(incubator.name)}</strong><small>${escapeHTML(typeLabels[incubator.type] || incubator.type)}${incubator.city ? ` · ${escapeHTML(incubator.city)}` : ""}</small></span>
      <span aria-hidden="true">${incubator.website ? "↗" : ""}</span>`;
    return incubator.website
      ? `<a class="walkable-drawer-org${focused ? " is-focused" : ""}" href="${escapeHTML(incubator.website)}" target="_blank" rel="noopener" data-type="${key}">${content}</a>`
      : `<div class="walkable-drawer-org${focused ? " is-focused" : ""}" data-type="${key}">${content}</div>`;
  }

  function renderDrawer(stateName, focusedSlug = "") {
    const state = stateMeta[stateName];
    const local = incubators.filter((incubator) => incubator.region === stateName);
    const counts = Object.entries(local.reduce((all, incubator) => {
      all[incubator.type] = (all[incubator.type] || 0) + 1;
      return all;
    }, {})).sort((a, b) => b[1] - a[1]);
    drawerTitle.textContent = stateName;
    drawerBody.innerHTML = `
      ${state?.policy ? `<p class="walkable-drawer-policy">${escapeHTML(state.policy)}${state.period ? ` · ${escapeHTML(state.period)}` : ""}</p>` : ""}
      <p class="walkable-drawer-description">${escapeHTML(state?.summary || "Explore this state or union territory’s incubators and startup support.")}</p>
      <div class="walkable-drawer-stats">
        <span>${local.length} incubator${local.length === 1 ? "" : "s"}</span>
        <span>${state?.schemes?.length || 0} state scheme${state?.schemes?.length === 1 ? "" : "s"}</span>
        ${counts.map(([type, count]) => `<span data-type="${typeKeys[type]}">${icon(type)}${escapeHTML(typeLabels[type] || type)} · ${count}</span>`).join("")}
      </div>
      <div class="walkable-drawer-filters">
        <label><span>Search this state</span><input id="walkable-state-search" type="search" placeholder="Incubator name or city…"></label>
        <label><span>Incubator type</span><select id="walkable-state-type"><option value="">All types</option>${counts.map(([type]) => `<option value="${escapeHTML(type)}">${escapeHTML(typeLabels[type] || type)}</option>`).join("")}</select></label>
      </div>
      <div class="walkable-drawer-list" id="walkable-state-list">${local.length ? local.map((incubator) => incubatorRow(incubator, incubator.slug === focusedSlug)).join("") : `<p class="walkable-drawer-empty">No incubators are currently listed for this state or UT.</p>`}</div>
      <div class="walkable-drawer-links">
        <a class="btn btn-primary" href="incubators.html?state=${encodeURIComponent(stateName)}&view=map">Open incubator map</a>
        <a class="btn btn-ghost" href="state-schemes.html?state=${encodeURIComponent(stateName)}&view=map">View state schemes</a>
      </div>`;
    const search = drawerBody.querySelector("#walkable-state-search");
    const type = drawerBody.querySelector("#walkable-state-type");
    const list = drawerBody.querySelector("#walkable-state-list");
    const filter = () => {
      const query = search.value.trim().toLowerCase();
      const filtered = local.filter((incubator) =>
        (!type.value || incubator.type === type.value) &&
        (!query || `${incubator.name} ${incubator.host || ""} ${incubator.city || ""}`.toLowerCase().includes(query)));
      list.innerHTML = filtered.length
        ? filtered.map((incubator) => incubatorRow(incubator, incubator.slug === focusedSlug)).join("")
        : `<p class="walkable-drawer-empty">No incubators match those filters.</p>`;
    };
    search.addEventListener("input", filter);
    type.addEventListener("change", filter);
  }

  function openState(stateName, trigger, focusedSlug = "") {
    if (!stateMeta[stateName]) return;
    lastTrigger = trigger || document.activeElement;
    pressed.clear();
    renderDrawer(stateName, focusedSlug);
    drawer.hidden = false;
    document.body.classList.add("walkable-drawer-open");
    root.querySelectorAll(".walkable-minimap-states button").forEach((button) =>
      button.classList.toggle("is-active", button.dataset.state === stateName));
    drawerClose.focus();
    if (focusedSlug) requestAnimationFrame(() => drawerBody.querySelector(".is-focused")?.scrollIntoView({ block: "center" }));
  }
  function closeDrawer() {
    if (drawer.hidden) return;
    drawer.hidden = true;
    document.body.classList.remove("walkable-drawer-open");
    root.querySelectorAll(".walkable-minimap-states button").forEach((button) => button.classList.remove("is-active"));
    lastTrigger?.focus?.();
    requestTick();
  }
  nearbyButton.addEventListener("click", () => {
    if (nearbyState) openState(nearbyState, nearbyButton, nearbyIncubator?.region === nearbyState ? nearbyIncubator.slug : "");
  });
  drawerClose.addEventListener("click", closeDrawer);
  drawerBackdrop.addEventListener("click", closeDrawer);
  drawer.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDrawer();
      return;
    }
    if (event.key !== "Tab") return;
    const focusables = [...drawerPanel.querySelectorAll('button, a, input, select, [tabindex]:not([tabindex="-1"])')].filter((element) => !element.disabled);
    const first = focusables[0];
    const last = focusables.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  help.addEventListener("click", () => root.querySelector(".walkable-intro").classList.toggle("is-open"));
  root.querySelector("#walkable-intro-close").addEventListener("click", () => root.querySelector(".walkable-intro").classList.remove("is-open"));
  renderCamera();
  updateNearby();
  setZoom(1);
  requestTick();
}
