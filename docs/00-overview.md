# 00 — Overview

## The name

**Garmaxxing** — maxxing out a homemade Garmin on hardware that's gloriously
overkill for the job, purely because you can. A 2015 Garmin did all this on a
microcontroller; this does it on a Jetson Orin Nano with a 256GB card. The name
owns the overkill rather than apologising for it.

## What this is

A bolted-in, fully-offline car/van navigation unit for a campervan, built on
hardware already living in the van (an NVIDIA Jetson Orin Nano that primarily
runs a separate voice-notes project). It shows a track-up moving map, computes
routes for the van's dimensions, and gives silent visual turn-by-turn guidance
with a zoomed junction view as each turn approaches.

## Honest framing

A £100 Garmin Camper does the *driving* job better than this, with no build
effort and better-curated van routing. This project is not the rational way to
avoid getting lost. It exists because building it is the point: a stack you
own, on hardware you already have, that you can bend to anything later.

Consequence for the build: optimise for **satisfaction and hackability**, not
for shipping fast or matching Garmin. A phone running OsmAnd is the genuine
nav at all times, so every slice can be half-finished and it doesn't matter.

## Goals (v1)

- Track-up, top-down moving map, fully offline, covering Great Britain.
- Routing for the van's real dimensions (avoid low bridges etc.).
- Destination set **while parked** (campervan reality — you plan tonight's
  site over breakfast, not at the wheel): favourites first, postcode fallback.
- Silent visual guidance: distance-to-turn + an approach-state junction zoom
  with the exit shown by the route line.
- Off-route detection and rerouting.

## Non-goals (explicitly out of v1)

- **Lane-level guidance** ("be in the left two lanes"). OSM lane tagging is
  inconsistent across the UK and a pain to render. Skip it.
- **Spoken directions / TTS.** Silent by design. A single chime before turns
  is noted as an easy later add, nothing more.
- **Touchscreen.** Input is a compact keyboard used while parked. No tap-to-route.
- **Free-text address search / a geocoder** (Nominatim, Pelias). Too heavy for
  the payoff. Favourites + postcode covers real journeys.
- **General-purpose nav reliability.** The phone is the backup; this need not
  be bet-your-trip dependable.

## The shared-hardware reality

The Orin also runs a voice-notes project (separate, not designed here). That
project is the reason an Orin (with GPU) is justified at all — nav itself never
touches the GPU. The only thing nav must respect: don't permanently hog RAM or
pin the GPU. In practice nav is light (render a 1080p-class map, read GPS), so
the two coexist comfortably. The one genuinely heavy task — building the map
and routing tiles — runs **off the van entirely**, on the Xeon workstation.
