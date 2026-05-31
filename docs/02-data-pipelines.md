# 02 — Data Pipelines (built on the Xeon, copied to the Orin)

All three data artefacts are built **once** on the Xeon workstation
(dual-Xeon, 64GB RAM — ample), then the finished read-only outputs are copied
to the Orin's SD card. Nothing here runs on the Orin. Rebuild only when you
want fresher OSM data.

Source data: a Great Britain OSM extract (`.osm.pbf`), e.g. the
Geofabrik "Great Britain" extract. One source feeds both the map and the
routing builds, so they never drift apart.

> Implementation note for Claude Code: the commands below are reference/intent.
> Produce proper build scripts (shell is fine; **no Python**). A small Rust
> loader is the preferred choice for any data munging that needs real logic.

## A. Map tiles → PMTiles (Planetiler, Java)

- Tool: **Planetiler**. Fast, single-machine, Java — no Python.
- Input: the GB `.osm.pbf`. Output: **one `gb.pmtiles` file**.
- Build to **z16+** so junction geometry (slip roads, roundabouts) is present;
  the approach-state junction view is only as detailed as the tiles beneath it.
- PMTiles is a single-file format MapLibre reads directly off disk, fully
  offline — no tile server needed.
- Full-GB at high zoom is in the tens of GB. On a 256GB SD that's a rounding
  error. (The clip-to-bounding-box step we discussed is optional now that space
  is free; skip unless you want faster rebuilds.)

You'll also need, bundled for offline use:
- A **map style** (MapLibre style JSON) — design a clear **day** and **night**
  theme; the van drives in both.
- **Glyphs (fonts)** and **sprites (icons)** hosted locally, not from a CDN —
  the whole point is offline.

## B. Routing tiles (Valhalla, C++) — with VAN dimensions

- Tool: **Valhalla**. Tile-based (kind to RAM), emits turn-by-turn instructions
  natively, supports map-matching (snap GPS to road).
- Input: the same GB `.osm.pbf`. Output: a Valhalla tile set + config.
- **Van profile is the important bit.** Use the truck/`auto` costing with the
  van's real dimensions so it avoids low bridges and restricted roads:
  - `height` (metres) — measure the **true top** including roof box, vents,
    aerials. Not the brochure figure.
  - `weight`, `length`, `width` — for weight/width-limited roads.
- **Caveat to bake into expectations:** dimension routing is only as good as
  OSM's `maxheight`/`maxweight` tags. UK bridge coverage is decent but not
  total. Treat it as a strong safety net, **not** a guarantee — obey the
  physical height signs regardless.
- Valhalla also produces roundabout exit numbering ("take the 3rd exit") in its
  maneuver data — feeds the display directly, no custom logic.

Run Valhalla as a **local HTTP service** on the Orin (Debian container) against
the copied tiles. The app talks to it over localhost.

## C. Postcode → coordinate table (OS Code-Point Open)

- Destination input is **favourites + postcode** (no geocoder). Postcode lookup
  is the only "search" and it's trivial offline.
- Dataset: **OS Code-Point Open** — free, open, the definitive GB postcode-unit
  centroid set. (British National Grid eastings/northings — convert to
  lat/lon / WGS84 during the build.)
- Output: a small lookup table. **SQLite** is ideal — single read-only file,
  zero services, queried directly by the app. Build it on the Xeon (Rust loader
  or shell + the SQLite CLI; no Python).
- **Precision caveat:** a postcode unit covers ~15 addresses, so lookup is
  **street-level**, not a specific door. For driving that's the right
  granularity anyway. (Set this expectation in the UI — show the resolved
  area on the map before routing so the driver confirms.)

## Output checklist (copied to the Orin SD)

- [ ] `gb.pmtiles` (map, z16+)
- [ ] MapLibre style JSON (day + night) + local glyphs + local sprites
- [ ] Valhalla tile set + config (van dimensions baked in)
- [ ] `postcodes.sqlite` (Code-Point Open, WGS84)

All four are read-only in normal use — safe and appropriate on the SD card.
