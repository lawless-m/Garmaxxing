#!/usr/bin/env bash
#
# Build postcodes.sqlite from OS Code-Point Open (02-data-pipelines.md).
# Runs on the Xeon. No Python — a small Rust loader does the conversion.
#
# Output: out/postcodes.sqlite  (postcode → WGS84 lat/lon)
#
# Code-Point Open is OS OpenData (free). Download the CSV release and point
# CODEPOINT_DIR at the unzipped "Data/CSV" directory, or let this script fetch
# the data.gov.uk package when CODEPOINT_ZIP_URL is set.

set -euo pipefail
cd "$(dirname "$0")"

CODEPOINT_DIR="${CODEPOINT_DIR:-data/codepo_gb/Data/CSV}"
CODEPOINT_ZIP_URL="${CODEPOINT_ZIP_URL:-}"
OUT="out/postcodes.sqlite"

mkdir -p out data

if [[ ! -d "$CODEPOINT_DIR" && -n "$CODEPOINT_ZIP_URL" ]]; then
  echo "[postcodes] downloading Code-Point Open…"
  curl -fL --retry 4 --retry-delay 2 -o data/codepo_gb.zip "$CODEPOINT_ZIP_URL"
  unzip -q -o data/codepo_gb.zip -d data/codepo_gb
fi

if [[ ! -d "$CODEPOINT_DIR" ]]; then
  echo "[postcodes] ERROR: $CODEPOINT_DIR not found." >&2
  echo "  Get Code-Point Open from OS OpenData / data.gov.uk, unzip it, and" >&2
  echo "  set CODEPOINT_DIR to its Data/CSV folder (or set CODEPOINT_ZIP_URL)." >&2
  exit 1
fi

echo "[postcodes] building loader…"
cargo build --release --manifest-path postcode-loader/Cargo.toml

echo "[postcodes] converting CSVs → ${OUT}"
rm -f "$OUT"
./postcode-loader/target/release/postcode-loader "$CODEPOINT_DIR" "$OUT"

echo "[postcodes] done: ${OUT}"
echo "[postcodes] copy to the Orin (read-only) alongside gb.pmtiles."
