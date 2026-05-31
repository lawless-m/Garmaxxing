# Garmaxxing — Design & Build Documents

A self-hosted, fully-offline turn-by-turn navigation system for a campervan,
running on an NVIDIA Jetson Orin Nano. This is a **want, not a need** project:
a phone running OsmAnd is the real nav throughout, so nothing here has to be
trustworthy before it's ready. The point is to build it, own the whole stack,
and have something hackable.

## How to use these documents

These are **design specifications and build notes**, not source code.
The intended workflow:

1. A human and Claude (chat) designed the system — that's what these docs capture.
2. **Claude Code implements it**, reading these docs as the brief.

So: Claude Code, treat this as the spec. Build in the staged order in
`05-build-plan.md` — each slice is a working artefact on its own.

## Constraints worth knowing before you start

- **No Python.** Toolchain is Rust (ferrostar core + any small loaders),
  TypeScript (the app UI), Java (Planetiler), C++ (Valhalla, osmium). If a
  step tempts you toward Python, find another way.
- **Debian, not Ubuntu**, for anything we control. The Jetson *host* is forced
  onto Ubuntu-based JetPack for CUDA — unavoidable — so the app runs in
  **Debian containers** on top. See `04-deployment.md`.
- **Units:** metric throughout, **except miles** for road distance and
  **yards** for short turn distances (UK convention). Van dimensions in metres.
- The Orin is **shared** with a separate voice-notes project (out of scope
  here). Nav must be a well-behaved citizen — it doesn't touch the GPU anyway.

## Where to start

Read in this order:

| # | File | What it covers |
|---|------|----------------|
| 0 | `00-overview.md` | The project, honest framing, goals & non-goals |
| 1 | `01-architecture.md` | Component stack, data flow, the shared-box context |
| 2 | `02-data-pipelines.md` | Map tiles + routing tiles + postcode table (built on the Xeon) |
| 3 | `03-nav-app.md` | The TypeScript app: ferrostar, MapLibre, display behaviour, input |
| 4 | `04-deployment.md` | Orin Nano, JetPack host, Debian containers, GPS, screen |
| 5 | `05-build-plan.md` | **Start building here** — staged slices, each independently working |

**Claude Code: begin with Slice 1 in `05-build-plan.md`** (a track-up moving
map that follows the GPS dot). It proves the entire map + GPS spine end to end
and is a satisfying standalone result.
