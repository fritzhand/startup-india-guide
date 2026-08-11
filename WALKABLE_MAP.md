# Walkable 3D India map

## Product contract

`ecosystem-map.html` explains the available map experiences. It links to the
immersive 3D `walkable-map.html`, the incubator directory map, and the
state-scheme map. The conventional maps remain the fast, accessible route to
every record.

The walkable experience renders the existing state/UT geometry in
`data/india-map.json` as a three.js world: a small explorer walking a
painterly, displaced terrain in the spirit of *Summer Afternoon*. It uses the
topographic layer in `data/india-terrain.json`, all 224 records in
`data/incubators.json`, and policy context from `data/state-schemes.json`.
Incubator pins communicate state membership only. They deliberately do not
claim to show an exact address.

three.js is vendored in `site/vendor/` (MIT); the build stays
zero-npm-dependency and GitHub Pages keeps serving plain static files. If
WebGL is unavailable, the page swaps to a fallback panel linking to the
conventional maps — every record remains reachable without the 3D scene.

## Ground

The ground is one displaced plane with a canvas-painted texture, both derived
at load time from the same data the 2D map used:

1. **Texture** — painted in layers into a 2048-px canvas with `Path2D`:
   sea, a shallow-water shelf hugging the coastline, state fills (every third
   state takes the alternate tone, as the 2D stylesheet did), relief tints
   clipped to land, rivers, lakes, then state borders. All colours come from
   the `--walk-*` design tokens, so the aerial view still reads as the guide's
   map in both themes.
2. **Height field** — the land mask and relief kinds are rasterized to a
   300×334 grid and shaped by `buildHeightField` (`site/walkable-3d-core.js`):
   mountains rise ~30 world units, plateaus ~7, plains stay low, and a blurred
   coast falloff tapers every shoreline into the sea. Seeded value noise makes
   ranges undulate deterministically — same world, every load.
3. **Guaranteed ground** — every state anchor gets a stamped bump so each
   landmark stands on dry land. Lakshadweep's atolls sit far below the raster
   resolution; its islets are stamped explicitly. This is the 3D analogue of
   the build-time Lakshadweep warning in `build-india-map.mjs`.

## Terrain

`data/india-terrain.json` carries 20 relief regions, 43 rivers, 14 lakes and
14 named peaks. Relief kinds — `mtn`, `plateau`, `desert`, `wet`, `plain` —
drive both the hypsometric tint in the texture and the height of the land
itself, so the Himalaya reads as a wall on the horizon while the Gangetic
plain stays walkable flat.

Terrain names and peak markers are DOM labels projected over the canvas,
gated on zoom exactly as before: they appear at 100% and above, where they
no longer collide with incubator pins.

Terrain remains exclusive to the walkable map. The incubator and state-scheme
maps are choropleths that encode counts as fill colour, and a relief tint
underneath would corrupt that reading.

## Decor

`placeDecor` in `walkable-core.js` still scatters 760 props with the same
deterministic rejection sample — on land, spaced, and clear of everything
clickable. The eight 2D sprite names now map onto instanced low-poly
archetypes (`decorArchetype`): round trees, pines (`tree-simple-c`), shrubs
and rocks, coloured per terrain kind with seeded jitter. The scatter still
reads as geography: rock along the Ghats, scrub in the Thar, trees through
the Gangetic plain and the northeast. Four instanced meshes render all 760
props in four draw calls.

## Scale, movement, and camera

- Map space: `1000 × 1113` world units (1 unit = 1 SVG map unit)
- Walk speed: `20` units per second — the 2D contract (`WALK_SPEED / WORLD_SCALE`),
  so `estimateTraverseSeconds` still holds: Jammu and Kashmir–Tamil Nadu is
  about 45 seconds on foot
- Spawn: Madhya Pradesh, giving a central starting point
- Avatar: ~7 units tall, straw hat and all, with a walk cycle and idle breath

Movement supports arrow keys, WASD, a touch D-pad, and a floating thumbstick:
touching the canvas spawns the stick under the finger, and its deflection
(75 px for full throw, length-clamped) walks the avatar at analog speed.
Stick movement is camera-relative — pushing up walks away from the camera —
while keys and the D-pad stay compass-locked, so "up walks north" holds for
discrete controls no matter where the camera points. The avatar is constrained
to India's state/UT land geometry, with coast-sliding so shorelines don't
snag. Enter opens the state or union territory under the avatar. The stick is
decorative feedback only (`aria-hidden`); the D-pad remains the accessible
touch control.

The zoom control keeps its 2D contract (50%–165%, default 65%) and maps onto
the follow camera's distance (150 down to 26 units). Pulled out, the camera
pitches down and reads like a map; zoomed in, it hugs the horizon like a
third-person game. Dragging the canvas (or Q/E) orbits the camera; pinch and
wheel zoom; Recenter swings the camera back behind the avatar and resets the
orbit. The camera never clips into a mountainside.

## States, incubators, and wayfinding

Everything interactive is real DOM projected over the canvas each frame, so
buttons and links keep their accessible names exactly as in 2D:

- Every state/UT has a landmark card and an inset-map control.
- All incubators have colour-coded 3D pins (instanced, two draw calls,
  clickable by raycast) plus focusable icon buttons that appear as you
  approach. Placement is deterministic via `placeOrganizations` — unchanged.
- Clicking open terrain opens the state under the cursor.
- Wayfinder signposts cover the same nine junctions; ferry controls still
  connect Kerala with Lakshadweep and Tamil Nadu with the Andaman and Nicobar
  Islands, and remain the only way across open water.
- When the avatar approaches an incubator, its pin's button highlights and
  the proximity prompt opens that incubator's focused record with Enter.

## State drawer

Unchanged from the 2D map: the desktop drawer becomes a mobile bottom sheet,
with the state policy summary, scheme count, incubator-type counts, local
search and filtering, official incubator links, and deep links into both
conventional map views.

## Atmosphere

Gradient sky dome, drifting billboard clouds, a translucent sea with a
scrolling generated normal map (sun glints, shallow shelves at every coast),
distance fog, and a shadow-casting sun that follows the avatar. Light and
dark themes are read from the `--walk3d-*` tokens: a warm afternoon by day, a
moonlit dusk in dark mode, repainted live when the theme toggles.

## Accessibility and performance

- Interactive landmarks, incubators, inset markers, signposts and ferries are
  native buttons or links with accessible names, projected over the canvas.
- Terrain, decor, sea, sky and the inset map are decoration (`aria-hidden`
  canvas); nothing in the guide is reachable only in 3D.
- Reduced-motion mode removes the walk cycle, idle bob, cloud drift, sea
  animation and camera easing; movement itself still works.
- Overlay elements are distance- and frustum-culled, so only a handful of the
  224 incubator buttons lay out on any given frame.
- Persistent links lead back to the incubator directory and choice page.
- Every incubator and state scheme remains reachable without walking.

## Future: live explorers

The current release is deliberately single-player. A future multiplayer layer
may give each browser an anonymous, locally persisted avatar, show an
approximate explorer count, and render nearby visitors in real time.

GitHub Pages will continue to serve the map itself. Ephemeral presence would use
an external managed WebSocket service and transmit only in-map coordinates,
avatar appearance, and the current state/UT at a throttled rate. Remote movement
should be interpolated, stale sessions should expire within 20–30 seconds, and
large crowds should be aggregated rather than rendered as overlapping avatars.

The first version must work as a progressive enhancement: map exploration
continues normally if realtime presence fails or is disabled. It must also
offer a persistent **Hide other explorers** control and avoid accounts, chat,
real names, GPS, permanent profiles, and location history. See
[`TODOS.md`](TODOS.md#future-feature-live-explorers) for scope and acceptance
criteria.
