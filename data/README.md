# Data pipelines

The three offline data artefacts the nav app reads, built **once on the Xeon**
workstation and copied read-only to the Orin's SD card. See
[`../docs/02-data-pipelines.md`](../docs/02-data-pipelines.md) for the full
intent. Nothing here runs on the Orin. **No Python** — shell, Java
(Planetiler), C++ (Valhalla via Docker) and a small Rust loader.

| Script | Tool | Output | Copy to Orin as |
|--------|------|--------|-----------------|
| `build-pmtiles.sh` | Planetiler (Java) | `out/gb.pmtiles` | `/maps/gb.pmtiles` |
| `build-valhalla.sh` | Valhalla (Docker) | `out/valhalla/` + `out/valhalla.json` | routing service data |
| `build-postcodes.sh` | Rust loader | `out/postcodes.sqlite` | postcode lookup DB |

All outputs land in `out/` and are git-ignored (tens of GB for the map).

## Map tiles — `build-pmtiles.sh`

```sh
./build-pmtiles.sh                 # GB, z0–16, downloads the extract itself
AREA=greater-london ./build-pmtiles.sh   # smaller test build
```

Built to **z16+** so slip-road and roundabout geometry exists for the junction
view. The app's styles ([`../app/style/day.json`](../app/style/day.json),
`night.json`) read this via the `pmtiles://` protocol — also bundle local
glyphs and sprites (no CDN) for true offline use.

## Routing tiles — `build-valhalla.sh`

```sh
./build-valhalla.sh                # downloads GB extract, builds tiles via Docker
```

**Van dimensions** are applied per route request as `costing_options`, not
baked into the tiles — see [`valhalla/van-costing.json`](valhalla/van-costing.json).
**Measure the real van** (roof box, vents, aerials). Dimension routing is only
as good as OSM `maxheight`/`maxweight` tags — a strong safety net, not a
guarantee. Obey the physical signs.

## Postcodes — `build-postcodes.sh` + `postcode-loader/`

```sh
CODEPOINT_DIR=data/codepo_gb/Data/CSV ./build-postcodes.sh
```

OS **Code-Point Open** (free OpenData) ships eastings/northings on the British
National Grid. The Rust loader (`postcode-loader/`) converts these to WGS84
(inverse Transverse Mercator on Airy 1830, then a Helmert datum shift — good to
a few metres, which is street-level, exactly the right granularity for a
postcode-unit centroid) and writes `postcodes.sqlite`:

```sql
CREATE TABLE postcode (pc TEXT PRIMARY KEY, lat REAL, lon REAL);
-- pc is normalised: upper-case, no spaces, e.g. "EH89YL"
```

Test the loader without any download:

```sh
cargo test --release --manifest-path postcode-loader/Cargo.toml
```

## GPS feed on the Orin — gpsd → WebSocket

Browsers can't open the raw TCP that gpsd serves on :2947, so the kiosk app
(`VITE_GPS_SOURCE=gpsd`) reads gpsd over a local WebSocket. A one-liner bridge:

```sh
# gpspipe streams gpsd's JSON (TPV) reports; websocat re-publishes them on ws://
gpspipe -w | websocat -s 127.0.0.1:2948
```

The app's `GpsdSource` parses the `TPV` reports (lat/lon/track/speed). On a
workstation with no GPS, leave `VITE_GPS_SOURCE` unset and it replays
`app/public/tracks/demo.geojson` through the identical `GpsSource` interface.
