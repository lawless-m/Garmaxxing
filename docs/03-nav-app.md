# 03 — The Navigation App (spec)

The live app: a TypeScript application running fullscreen in kiosk Chromium.
It composes **MapLibre GL JS** (map), the **ferrostar** core (Rust→WASM; nav
state machine), **gpsd** (position), and a local **Valhalla** service (routing)
plus the **postcode SQLite** (destination lookup).

> This is a spec. Claude Code implements it. Core nav logic comes from the
> ferrostar Rust/WASM core (don't reimplement it); the app is the TypeScript
> shell, the UI, and the two bespoke glue pieces below.

## Input — destination set while parked

No touch. A compact keyboard, used at camp, not while driving. Two sources:

- **Favourites (primary).** A saved-places list, editable while parked
  (campsites, aires, fuel, LPG, home). Select with arrow keys + Enter. This is
  the main "where to" — campervan journeys are mostly known in advance.
- **Postcode (fallback).** Type postcode → Enter → look up in `postcodes.sqlite`
  → centroid coordinate. Show the resolved area on the map and require a confirm
  before routing (street-level precision — see `02`).

Favourites persistence: a small writeable store. Keep writes infrequent (only
when editing favourites) so the SD card is happy — bulk data stays read-only.

## Routing

On destination confirm: current position + destination → **Valhalla** (van
profile) over localhost → route + maneuvers → hand to ferrostar to begin a
nav session.

## Display behaviour (the heart of v1)

- **Track-up, top-down.** Map rotates so direction of travel is "up"; no tilt
  (top-down is the simpler camera — no pitch to manage). Feed MapLibre the
  smoothed GPS heading as bearing.
- **Approach-state junction zoom.** Two camera states:
  - *Cruise:* moderate zoom, smooth follow, while just driving.
  - *Junction:* within a few hundred yards of a turn, snap to a tight top-down
    view of the junction; ease back to cruise once through.
  This is how commercial units behave and keeps context while cruising. Driven
  by ferrostar's distance-to-turn.
- **Distance-to-turn readout.** Large, glanceable number, in **yards** close in
  and **miles** further out (UK convention).
- **Exit marked by the route line.** No separate exit-detection: Valhalla's
  route already threads through the junction and out the correct exit, so the
  route line drawn boldly at junction zoom *is* the marker. For roundabouts,
  also show "take the Nth exit" from Valhalla's maneuver data.
- **Heading smoothing.** Raw GPS heading jitters badly at low speed and makes
  the map wobble. Smooth it, and **freeze rotation below ~walking pace**.
- **Day/night themes.** Switch the MapLibre style by time of day (or a manual
  toggle on the keyboard).
- **Glanceable, period.** It's silent (below), so the screen carries everything.
  Big next-maneuver arrow, distance-to-turn, current road. Readable in under a
  second — that's all the attention available at the wheel.

## Audio

**Silent.** No TTS, no Piper, no speech synthesis. Optional later: a single
**chime** (one sound file played on the maneuver trigger) so you needn't keep
glancing to catch a turn coming. Trivial to add; not in the core v1.

## The two bespoke glue pieces

ferrostar's web target lacks these (its iOS/Android UIs have them). This is the
real engineering of the project.

### 1. Rerouting

- ferrostar core exposes **off-route detection**; the web target does **not**
  auto-recompute.
- App responsibility: on detected deviation → re-request **Valhalla** from
  current position to the same destination → restart the ferrostar session with
  the new route. Debounce so a single GPS glitch doesn't trigger a reroute;
  keep deviation-detection and the decision-to-reroute as separate concerns
  (ferrostar's model encourages this).

### 2. Follow-camera

- Drive the MapLibre camera from nav state: rotate to smoothed heading,
  auto-zoom by distance-to-turn, and manage the **cruise ↔ junction** transition
  (with the low-speed rotation freeze). This is the piece that makes it *feel*
  like nav rather than a map with a dot.

## Out of scope (v1)

Lane guidance, spoken directions, touch input, free-text/geocoded search,
tunnel dead-reckoning. See `00-overview.md` non-goals.
