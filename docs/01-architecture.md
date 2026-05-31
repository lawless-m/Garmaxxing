# 01 — Architecture

## The four jobs

Navigation breaks into four concerns. Keep them as separate, cleanly-bounded
components — that separation *is* the architecture.

1. **Routing** — turn a start+destination into a route with turn instructions.
   → **Valhalla**, running as a local HTTP service on the Orin.
2. **Map drawing** — render the moving map.
   → **MapLibre GL JS** reading an offline **PMTiles** file.
3. **Turn-by-turn** — track progress along the route, detect off-route, manage
   maneuver state.
   → **ferrostar** (Rust core compiled to **WASM**; UI in TypeScript).
4. **Position** — where the van is, and which way it's pointing.
   → **USB GPS dongle → gpsd → app**.

## Data flow (live navigation)

```
USB GPS ──NMEA──▶ gpsd ──▶ App (TypeScript)
                              │
                              ├─▶ ferrostar core (WASM): progress, maneuver,
                              │     distance-to-turn, off-route detection
                              │
                              ├─▶ MapLibre GL JS: track-up map from PMTiles,
                              │     camera driven by heading + distance-to-turn
                              │
                              └─▶ on off-route: re-request Valhalla ──▶ new route
                                    ──▶ restart ferrostar session

Destination (set while parked):
   favourites list ─┐
   postcode entry ──┴─▶ coordinate ─▶ Valhalla (van profile) ─▶ route ─▶ ferrostar
```

Everything in that diagram runs **on the Orin** and needs **no network**.

## What runs where

| Component | Where | Why |
|-----------|-------|-----|
| Map tile build (Planetiler → PMTiles) | **Xeon workstation** | Heavy one-time job; needs RAM/CPU. Never on the Orin. |
| Routing tile build (Valhalla tiles) | **Xeon workstation** | Same. |
| Postcode table build (Code-Point Open) | **Xeon workstation** | One-time prep. |
| Finished PMTiles + Valhalla tiles + postcode DB | **Orin (256GB SD)** | Read-only data; SD is fine for read-mostly. |
| Valhalla service | **Orin (Debian container)** | Local routing, offline. |
| The app (MapLibre + ferrostar + UI) | **Orin (kiosk Chromium)** | The live nav. |
| gpsd | **Orin (host or container)** | Feeds position. |

The split matters: the only heavy compute is the tile builds, and those are
exiled to the Xeon. The Orin only ever *reads* finished data and runs light
live services. This is why there's no "too demanding" cliff for the van box.

## Coverage

**Full Great Britain**, built to high zoom (z16+ — needed for slip roads and
roundabout geometry in the junction view). Earlier we considered a tight
corridor crop to save space; storage turned out free (256GB SD ≈ £13), so take
all of GB at full detail. No crop, no edge-effect routing failures at a
boundary, no surveyor-precise box-drawing. The clip step in the pipeline
becomes optional (build-time convenience only).

## OS & isolation

The Orin runs **JetPack 6** (Ubuntu 22.04-based "Linux for Tegra"). This is
**forced** by the CUDA requirement of the *other* project — real Debian on a
Jetson breaks the GPU stack. To keep our own environment Debian and isolated
from NVIDIA's base image, run the app stack in **Debian containers** via the
NVIDIA container runtime (which JetPack 6 includes). Host = Ubuntu (unavoidable);
everything we build = Debian containers. Details in `04-deployment.md`.

## The genuinely bespoke work

Almost everything above is integration of mature parts. Two pieces are real
engineering, because ferrostar's **web** target is its least-mature surface
(its iOS/Android UIs have these polished; web does not):

1. **Rerouting glue** — ferrostar core *detects* off-route, but the web target
   does not auto-recompute. The app must: detect deviation → re-request
   Valhalla → restart the nav session with the new route.
2. **Follow-camera** — rotate the map to (smoothed) heading, auto-zoom by
   distance-to-turn, and handle the approach-state transition into and out of
   the junction view.

These two are where the satisfaction (and the effort) live. See `03-nav-app.md`.
