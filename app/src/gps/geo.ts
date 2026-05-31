/** Geodesy helpers shared by the simulator and (later) map-matching glue. */

const EARTH_RADIUS_M = 6_371_000;
const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export interface LngLat {
  lng: number;
  lat: number;
}

/** Normalise any angle to the [0, 360) range. */
export function normaliseDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Smallest signed difference `target - from`, in the range (-180, 180].
 * Positive means clockwise. Used for shortest-arc heading interpolation.
 */
export function shortestAngleDiff(from: number, target: number): number {
  let diff = (target - from) % 360;
  if (diff > 180) diff -= 360;
  if (diff <= -180) diff += 360;
  return diff;
}

/** Great-circle distance between two points, in metres (haversine). */
export function haversineMetres(a: LngLat, b: LngLat): number {
  const dLat = (b.lat - a.lat) * DEG;
  const dLng = (b.lng - a.lng) * DEG;
  const lat1 = a.lat * DEG;
  const lat2 = b.lat * DEG;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from `a` to `b`, degrees clockwise from true north. */
export function bearingDeg(a: LngLat, b: LngLat): number {
  const lat1 = a.lat * DEG;
  const lat2 = b.lat * DEG;
  const dLng = (b.lng - a.lng) * DEG;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return normaliseDeg(Math.atan2(y, x) * RAD);
}

/**
 * Point a fraction `t` (0..1) of the way from `a` to `b`. Linear in lat/lng,
 * which is plenty accurate for the short hops between simulator samples.
 */
export function interpolate(a: LngLat, b: LngLat, t: number): LngLat {
  return {
    lng: a.lng + (b.lng - a.lng) * t,
    lat: a.lat + (b.lat - a.lat) * t,
  };
}
