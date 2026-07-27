# TODOs

## Future feature: live explorers

**Status:** Backlog — not part of the current walkable-map release.

Give each visitor to the walkable India map an anonymous avatar and show the
other people exploring at the same time. The existing map remains a static
GitHub Pages application; live presence would come from a small external
realtime service.

### MVP

- Create a random explorer ID and avatar style in the browser, saved to
  `localStorage`; no account is required.
- Broadcast map coordinates, current state/UT, and avatar style at a throttled
  rate of roughly 4–6 updates per second.
- Show an approximate **Explorers online** count.
- Render nearby explorers individually with client-side interpolation, while
  aggregating larger crowds into state/UT counts to keep the map legible.
- Remove disconnected explorers automatically after a 20–30 second presence
  timeout.
- Add **Hide other explorers** and respect reduced-motion preferences.
- Keep the map usable when the realtime service is unavailable.

### Privacy and product guardrails

- Do not collect or expose physical GPS location, IP address, email, or a
  visitor's real-world identity.
- Send only the in-map position, anonymous avatar appearance, and current
  state/UT.
- Do not add public names, chat, friend lists, permanent profiles, or location
  history in the MVP.
- Treat the online count as approximate and label it accordingly.
- Cap the number of remote avatars rendered at once; favor nearby explorers and
  aggregate the rest.

### Acceptance criteria

- Every browser receives a stable local avatar for repeat visits.
- Two visitors can see each other's movement smoothly without affecting local
  movement or camera responsiveness.
- The explorer count and remote avatars clear after disconnect or timeout.
- Hiding other explorers takes effect immediately and persists locally.
- Offline, slow, or failed realtime connections do not block the single-player
  map.
- No visitor data is retained beyond the short presence window.

### Delivery estimate

- Personal avatar and local persistence: hours.
- Presence service and approximate count: about 1 day.
- Smooth live avatars and crowd aggregation: 2–4 days.
- Production hardening, abuse controls, privacy review, and load testing:
  1–2 weeks.
