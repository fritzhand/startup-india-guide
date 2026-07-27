# Walkable India map

## Product contract

`ecosystem-map.html` explains the available map experiences. It links to the
immersive `walkable-map.html`, the incubator directory map, and the state-scheme
map. The conventional maps remain the fast, accessible route to every record.

The walkable experience uses the existing state/UT SVG in
`data/india-map.json`, all 224 records in `data/incubators.json`, and policy
context from `data/state-schemes.json`. Incubator icons communicate state
membership only. They deliberately do not claim to show an exact address.

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

Lakshadweep uses a small fallback island-chain path because the upstream
district geometry contains an empty state path. Its landmark is anchored on the
islands rather than at a zero-coordinate centroid.

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
