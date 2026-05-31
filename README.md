# Garmaxxing

A self-hosted, fully-offline turn-by-turn navigation system for a campervan,
running on an NVIDIA Jetson Orin Nano. It shows a **track-up moving map**,
routes for the **van's real dimensions** (low bridges etc.), and gives **silent
visual** turn-by-turn guidance with a zoomed junction view as each turn nears.

> A want, not a need: a phone running OsmAnd is the real nav throughout. The
> point is to build it, own the whole stack, and have something hackable.
> Maxxing out a homemade Garmin on hardware that's gloriously overkill. 🚐

Full design brief in [`docs/`](docs/) — start with
[`docs/CONTENTS.md`](docs/CONTENTS.md).

## Repository layout

| Path | What |
|------|------|
| [`docs/`](docs/) | The design & build specification (read this first) |
| [`app/`](app/) | The navigation app (TypeScript + MapLibre + ferrostar) |
| [`data/`](data/) | Data-pipeline build scripts (map tiles, routing tiles, postcodes) |

## The stack

- **Map:** MapLibre GL JS over an offline **PMTiles** basemap (`gb.pmtiles`).
- **Routing:** **Valhalla** as a local HTTP service, van-dimension costing.
- **Turn-by-turn:** the **ferrostar** Rust core (→ WASM) — from Slice 3.
- **Position:** USB GPS → **gpsd** → app.
- **Destination:** favourites + postcode lookup (`postcodes.sqlite`), no geocoder.

Everything runs on the Orin and needs **no network**. The only heavy compute —
building the tiles and postcode DB — happens off the van, on a Xeon workstation
(see [`data/`](data/)). Toolchain is Rust / TypeScript / Java / C++ — **no
Python**. Units are metric except miles/yards for road distance (UK).

## Build progress

Built in slices ([`docs/05-build-plan.md`](docs/05-build-plan.md)); each slice
is a working artefact on its own.

- [x] **Slice 1 — Track-up moving map.** MapLibre + PMTiles + GPS spine,
      track-up follow camera, heading smoothing with low-speed freeze, day/night
      themes. Runs against a GPS simulator on a workstation or real gpsd in the
      van. → [`app/`](app/)
- [x] **Slice 2 — Route line.** Keyboard destination chooser (favourites +
      postcode lookup), Valhalla van-profile routing (or a demo router), the
      route line drawn over the map with a distance/ETA banner. → [`app/`](app/)
- [ ] Slice 3 — Distance-to-turn + approach-state junction zoom (ferrostar)
- [ ] Slice 4 — Auto-rerouting on off-route
- [ ] Slice 5 — Polish

## Quick start (workstation)

```sh
cd app
npm install
VITE_USE_DEMO_RASTER=1 npm run dev   # moving map driven by the GPS simulator
npm test                              # logic unit tests
```

Building the offline data (Xeon): see [`data/README.md`](data/README.md).

## Licence

MIT — see [`LICENSE`](LICENSE).
