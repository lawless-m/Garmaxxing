#!/usr/bin/env bash
#
# Build gb.pmtiles — the offline vector basemap — with Planetiler (Java).
# Runs on the Xeon (02-data-pipelines.md), never on the Orin. No Python.
#
# Output: out/gb.pmtiles  (OpenMapTiles schema, z0–16 for junction geometry)
#
# Requirements: Java 17+, ~10 GB RAM free, tens of GB disk. Planetiler
# downloads the Great Britain extract from Geofabrik on first run.

set -euo pipefail
cd "$(dirname "$0")"

PLANETILER_VERSION="${PLANETILER_VERSION:-0.8.3}"
PLANETILER_JAR="vendor/planetiler-${PLANETILER_VERSION}.jar"
AREA="${AREA:-great-britain}"
MAXZOOM="${MAXZOOM:-16}"
JAVA_XMX="${JAVA_XMX:-8g}"
OUT="out/gb.pmtiles"

mkdir -p vendor out data

if [[ ! -f "$PLANETILER_JAR" ]]; then
  echo "[pmtiles] downloading Planetiler ${PLANETILER_VERSION}…"
  curl -fL --retry 4 --retry-delay 2 -o "$PLANETILER_JAR" \
    "https://github.com/onthegomap/planetiler/releases/download/v${PLANETILER_VERSION}/planetiler.jar"
fi

echo "[pmtiles] building ${AREA} to z${MAXZOOM} → ${OUT}"
# --download fetches the Geofabrik extract; --maxzoom 16 keeps slip-road and
# roundabout geometry for the junction view. PMTiles output is a single file
# MapLibre reads directly off disk, fully offline.
java "-Xmx${JAVA_XMX}" -jar "$PLANETILER_JAR" \
  --download \
  --area="${AREA}" \
  --maxzoom="${MAXZOOM}" \
  --render-maxzoom="${MAXZOOM}" \
  --output="${OUT}" \
  --force

echo "[pmtiles] done: ${OUT}"
echo "[pmtiles] copy to the Orin at /maps/gb.pmtiles (see app style sources)."
