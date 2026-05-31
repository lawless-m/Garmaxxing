# 05 — Build Plan (start here)

Build in **slices**. Each slice is a real, working thing you can sit in the van
and play with — never a half-thing that does nothing. If interest runs out at
slice 2, you still have a track-up moving map, which is already worth having.
The OsmAnd phone is the real nav throughout, so no slice has to be trustworthy.

Recommended: get the **data pipelines** (`02`) producing `gb.pmtiles`, the
Valhalla tiles, and `postcodes.sqlite` early, since every slice needs some of
them. Build those on the Xeon, copy to the Orin.

---

## Slice 1 — Track-up moving map

**Goal:** a map on the screen that follows the GPS dot, rotated to direction of
travel. No routing yet.

- MapLibre GL JS rendering `gb.pmtiles` offline, with the local style/glyphs/sprites.
- gpsd → app: plot position, rotate map to **smoothed** heading, freeze
  rotation below walking pace.
- Day/night theme switch.

**Proves:** the entire map + PMTiles + MapLibre + GPS spine, end to end. A
satisfying standalone result.

---

## Slice 2 — Route line

**Goal:** pick a destination, see the route drawn on the map.

- Favourites list (keyboard nav) + postcode entry → coordinate
  (`postcodes.sqlite`).
- Call local **Valhalla** (van profile) → draw the route line over the map.
- Still no turn-by-turn — but now it routes.

**Proves:** Valhalla service, van-dimension profile, destination input,
postcode lookup.

---

## Slice 3 — It feels like nav

**Goal:** distance-to-turn + the approach-state junction zoom.

- Wire the **ferrostar** core (WASM): feed it the route + live position; read
  back maneuver + distance-to-turn.
- Distance-to-turn readout (yards close in, miles further out).
- **Follow-camera (bespoke piece #2):** cruise view ↔ tight junction view by
  distance-to-turn; route line marks the exit; roundabout "take Nth exit" text.

**Proves:** the core nav loop and the camera that makes it feel real.

---

## Slice 4 — Rerouting (the bespoke bit)

**Goal:** miss a turn, get a new route automatically.

- **Rerouting glue (bespoke piece #1):** ferrostar off-route detection →
  re-request Valhalla from current position → restart the nav session.
- Debounce so a single GPS glitch doesn't trigger a reroute; keep
  deviation-detection separate from the reroute decision.

**Proves:** the one piece ferrostar's web target doesn't give you for free —
the real engineering payoff.

---

## Slice 5 — Polish

Pick and choose; none are load-bearing.

- Confirm van **height/weight/length** are dialled into the Valhalla profile
  and test against a known low bridge.
- Postcode-entry UX: show resolved area + confirm before routing.
- Optional **turn chime** (one sound file on maneuver trigger).
- Favourites editing UI, day/night auto-switch refinements, "acquiring GPS"
  state, thermal/airflow check in a hot parked van.

---

## A note on order and mood

This sequence front-loads the satisfying, visible wins (a moving map, then a
route, then guidance) and saves the hard glue (rerouting) for when you're
invested. That's deliberate — it's a want-not-need project, so the order is
chosen to keep it rewarding, not just efficient.
