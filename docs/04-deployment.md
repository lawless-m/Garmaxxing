# 04 — Deployment

## Hardware

| Part | Spec / note |
|------|-------------|
| Compute | **NVIDIA Jetson Orin Nano 8GB** (2023, Ampere). Shared with a separate voice-notes project. Nav doesn't use the GPU. |
| Screen | **10" IPS**, ~1080p class. IPS matters — viewed off-axis from the driver's seat, IPS holds contrast where TN washes out. |
| Input | **Compact keyboard** (wireless, stowed in a door pocket; used while parked). No touch. |
| GPS | **USB GPS dongle** → gpsd. Prefer 5–10 Hz update for smooth nav if available; 1 Hz works. |
| Storage | **256GB SD** (~£13). Read-mostly map/routing data lives here happily. |
| Power | Leisure battery + solar — always-on, no ignition cycling to design around. |
| Backup nav | A **phone running OsmAnd**, fully offline. The real nav at all times. Set this up first, independent of everything else. |

### Screen — the one spec left to verify

Resolution is settled enough (10" panels are typically 1280×800 or 1920×1200;
either is past eye-resolution at ~70cm, so design against whatever the real
panel reports). The spec that actually decides usability is **brightness
(nits)** + anti-glare: many cheap panels sit ~300 nits and wash out in direct
sun. **Check the nits before buying** — it's the difference between usable and
useless on a sunny drive. Build a clear day/night theme regardless.

## Operating system & containers

- Host: **JetPack 6** (Ubuntu 22.04-based L4T). **Forced** by the CUDA needs of
  the voice-notes project — real Debian on a Jetson breaks the GPU stack.
- Our stack runs in **Debian containers** via the NVIDIA container runtime
  (included in JetPack 6), keeping our environment Debian and isolated from
  NVIDIA's base image. Nav containers don't even need GPU passthrough.
- Suggested containers:
  - **valhalla** — the routing service, mounting the copied Valhalla tiles
    (read-only) and config, exposed on localhost.
  - **app** — the TypeScript app served locally + kiosk Chromium, or Chromium on
    the host pointing at the app. Mounts `gb.pmtiles`, the style/glyphs/sprites,
    and `postcodes.sqlite` (read-only) + a small writeable favourites store.
  - **gpsd** — on the host or a container with device access to the USB GPS.

## Kiosk

Chromium in **kiosk fullscreen**, autostarting on boot, pointed at the local
app. Disable screen blanking. Map canvas at native panel resolution is fine at
1080p-class — no half-res trick needed (that was only a concern at 4K).

## In-van realities to design for

- **Power:** solved by the leisure battery + solar. No graceful-shutdown-on-
  ignition logic needed. Still: a clean read-mostly SD layout means a hard
  power cut won't corrupt map data (keep continuous writes off the SD, or on
  NVMe if you add one).
- **Heat:** a Jetson in a parked van in summer (especially with solar on the
  roof) gets hot. Ensure airflow/heatsink. Thermal, not power, is the realistic
  stress here.
- **GPS cold start:** first fix after a while parked can take tens of seconds.
  Show an honest "acquiring GPS" state rather than a frozen map.
- **Tunnels / GPS dropout:** v1 just pauses/coasts; dead-reckoning is out of scope.

## Build vs run, restated

The Xeon builds the tiles and the postcode DB (`02-data-pipelines.md`). The Orin
only ever **reads** those and runs the **light live services**. There is no
heavy compute on the van box — that's why the modest Orin (shared with another
project) is comfortably enough.
