import type { LngLat } from '../gps/geo';

/**
 * Decode a Google/Valhalla encoded polyline into points.
 *
 * Valhalla encodes route shape at **precision 6** (1e6), not the Google
 * default of 5 — passing the wrong precision silently yields coordinates off
 * by 10×, so the factor is explicit here.
 */
export function decodePolyline(encoded: string, precision = 6): LngLat[] {
  const factor = 10 ** precision;
  const points: LngLat[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    lat += decodeSigned(encoded, index, (next) => (index = next));
    lng += decodeSigned(encoded, index, (next) => (index = next));
    points.push({ lat: lat / factor, lng: lng / factor });
  }
  return points;
}

/** Decode one zig-zag varint starting at `start`; report the next index back. */
function decodeSigned(
  encoded: string,
  start: number,
  setIndex: (next: number) => void,
): number {
  let index = start;
  let result = 0;
  let shift = 0;
  let byte: number;
  do {
    byte = encoded.charCodeAt(index++) - 63;
    result |= (byte & 0x1f) << shift;
    shift += 5;
  } while (byte >= 0x20);
  setIndex(index);
  // Undo the zig-zag encoding (LSB is the sign bit).
  return result & 1 ? ~(result >> 1) : result >> 1;
}
