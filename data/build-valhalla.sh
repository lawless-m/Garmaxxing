#!/usr/bin/env bash
#
# Build Valhalla routing tiles for Great Britain (C++ via the official Docker
# image). Runs on the Xeon (02-data-pipelines.md). No Python.
#
# Outputs:
#   out/valhalla/            tile set
#   out/valhalla.json        service config (points at the tiles)
#
# Van dimensions are applied per-request as costing_options (see
# valhalla/van-costing.json), which the app merges into every route request.
# OSM maxheight/maxweight coverage is a strong safety net, NOT a guarantee —
# obey the physical signs.

set -euo pipefail
cd "$(dirname "$0")"

PBF_URL="${PBF_URL:-https://download.geofabrik.de/europe/great-britain-latest.osm.pbf}"
PBF="data/great-britain-latest.osm.pbf"
VALHALLA_IMAGE="${VALHALLA_IMAGE:-ghcr.io/valhalla/valhalla:latest}"
OUT="out/valhalla"

mkdir -p data "$OUT"

if [[ ! -f "$PBF" ]]; then
  echo "[valhalla] downloading GB extract…"
  curl -fL --retry 4 --retry-delay 2 -o "$PBF" "$PBF_URL"
fi

# Generate config, then build tiles. Mount this directory into the container.
echo "[valhalla] generating config + building tiles (this is the long part)…"
docker run --rm -v "$PWD:/work" -w /work "$VALHALLA_IMAGE" bash -lc '
  set -euo pipefail
  valhalla_build_config \
    --mjolnir-tile-dir /work/out/valhalla/tiles \
    --mjolnir-tile-extract /work/out/valhalla/tiles.tar \
    --mjolnir-timezone /work/out/valhalla/timezones.sqlite \
    --mjolnir-admin /work/out/valhalla/admins.sqlite \
    > /work/out/valhalla.json
  valhalla_build_timezones > /work/out/valhalla/timezones.sqlite || true
  valhalla_build_tiles -c /work/out/valhalla.json /work/data/great-britain-latest.osm.pbf
  # Pack into a single extract for faster, read-only serving on the Orin.
  find /work/out/valhalla/tiles | sort -n | tar -cf /work/out/valhalla/tiles.tar --no-recursion -T -
'

echo "[valhalla] done."
echo "[valhalla] run the service on the Orin:"
echo "    docker run --rm -p 8002:8002 -v <out>/valhalla:/data ${VALHALLA_IMAGE} \\"
echo "      valhalla_service /data/../valhalla.json 1"
echo "[valhalla] van costing template: valhalla/van-costing.json"
