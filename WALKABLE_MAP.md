# Walkable India map

## Product contract

`ecosystem-map.html` explains the available map experiences. It links to the
immersive `walkable-map.html`, the incubator directory map, and the state-scheme
map. The conventional maps remain the fast, accessible route to every record.

The walkable experience uses the existing state/UT SVG in
`data/india-map.json`, the topographic layer in `data/india-terrain.json`, all
224 records in `data/incubators.json`, and policy context from
`data/state-schemes.json`. Incubator icons communicate state membership only.
They deliberately do not claim to show an exact address.

## Ground layers

The ground is painted in ordered layers inside one SVG, not as one path per
state:

1. `clipPath#walkable-land` — every state/UT shape, used to clip the two
   layers below so nothing bleeds into the sea
2. `.wg-fill` — land, alternating between the two land tones. Carries
   `data-state`; the map reads its bounding box for incubator placement
3. `.wg-terrain` — relief tints, then rivers, then lakes
4. `.wg-decor` — watercolour sprites
5. `.wg-border` — state and UT outlines. **The only stroked land layer**
6. `.wg-labels` — terrain names and peak markers, gated on zoom

Only the border layer is stroked, and that is deliberate: a state made of
several sub-paths — islands, or a regression to district geometry — can then
only ever fill. District ("county") lines used to cover the map for exactly
that reason, because `data/india-map.json` was built by concatenating district
rings into one stroked path per state. Uttar Pradesh alone carried 76.

## Terrain

`data/india-terrain.json` carries 20 relief regions, 43 rivers, 14 lakes and
14 named peaks, projected with the same descriptor as the state outlines and
clipped to Indian land at build time. Relief kinds — `mtn`, `plateau`,
`desert`, `wet`, `plain` — map to hypsometric tints a step away from the base
land colour, tuned separately for light and dark.

Terrain names and peak markers appear only at 100% zoom and above; below that
they would collide with each other and with incubator pins. A region is named
only when a meaningful share of it lies inside India, so the Plateau of Tibet
and the Hindu Kush are tinted but never labelled.

Terrain is exclusive to the walkable map. The incubator and state-scheme maps
are choropleths that encode counts as fill colour, and a relief tint underneath
would corrupt that reading.

## Decor glyphs

`site/forest/` holds eight watercolour sprites ported from the Startup Forest
kit. 760 of them are scattered by `placeDecor` in `walkable-core.js`: a
deterministic rejection sample that keeps every sprite on land, spaced from its
neighbours, and clear of incubator icons, landmarks, signposts and ferries —
decor must never sit under something the player needs to click.

The terrain under a point picks the sprite, so the scatter reads as geography:
rock along the Ghats, scrub in the Thar, trees through the Gangetic plain and
the northeast. Sprites render as SVG `<image>` inside the ground layer rather
than HTML elements, which keeps them in the same composited layer as the map —
measured at no frame cost, even under 6× CPU throttling on a 390px viewport.

## Scale and movement

- SVG source space: `1000 × 1113`
- World scale: `18` CSS pixels per SVG unit
- World size: `18,000 × 20,034` CSS pixels
- Walk speed: `360` CSS pixels per second
- Representative Jammu and Kashmir–Tamil Nadu land route: about 45 seconds
- Spawn: Madhya Pradesh, giving a central starting point

Movement supports arrow keys, WASD, and a touch D-pad. The avatar is constrained
to India’s state/UT land geometry. Enter always opens the state or union
territory polygon currently under the avatar. Zoom supports buttons, reset,
trackpad control-wheel, and two-finger pinch. It defaults to `0.65×` and is
clamped from `0.5×` to `1.65×`.
A persistent Recenter control snaps the camera back to the avatar if it leaves
the viewport.

## States, incubators, and wayfinding

Every state/UT has a landmark and inset-map control. All incubators have
focusable icons based on their type. Placement is deterministic, constrained to
the incubator’s state, and collision-spaced where the available polygon allows.
When the avatar approaches an incubator, its icon and label highlight and the
proximity prompt opens that incubator’s focused record with Enter or a click.

Lakshadweep uses a small fallback island-chain path: its islands are far below
the build's minimum-area floor, so `build-india-map.mjs` emits an empty path and
warns. Its landmark is anchored on the islands rather than at a zero-coordinate
centroid. It is the one state or UT whose geometry is hand-authored — the
build-time warning exists so that cannot rot silently.

Wayfinders cover northern, western, central, eastern, northeastern, Deccan, and
southern junctions. State arms open information without teleporting. Explicitly
labelled ferry controls connect Kerala with Lakshadweep and Tamil Nadu with the
Andaman and Nicobar Islands; return controls make both island groups traversable
without allowing the avatar to walk over open water.

## State drawer

The desktop drawer becomes a mobile bottom sheet. It includes the state policy
summary, scheme count, incubator-type counts, local search and filtering,
official incubator links, and deep links into both conventional map views.

## Accessibility and performance

- One self-suspending animation loop updates movement, camera, position, and
  proximity state.
- Interactive landmarks, incubators, inset markers, and signposts are native
  buttons or links with accessible names.
- Terrain, decor and the inset map are `aria-hidden` decoration. Every peak and
  range they show is atmosphere; nothing in the guide is reachable only there.
- Reduced-motion mode removes decorative movement and camera easing.
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
