import type { GpsFix, GpsSource, GpsStatus } from './types';
import { bearingDeg, haversineMetres, interpolate, type LngLat } from './geo';

export interface SimulatedGpsOptions {
  /** Driving speed in m/s (default ~13.4 m/s ≈ 30 mph). */
  speedMps?: number;
  /** Fix rate in Hz (default 5, matching a decent USB dongle). */
  hz?: number;
  /** Loop back to the start when the track ends (default true). */
  loop?: boolean;
}

/**
 * Replays a polyline as a stream of GpsFix samples. This is the development
 * stand-in for gpsd: same GpsSource contract, so the app is identical whether
 * it is driven by a real dongle in the van or a saved track on a desk.
 */
export class SimulatedGps implements GpsSource {
  private readonly path: LngLat[];
  private readonly speedMps: number;
  private readonly hz: number;
  private readonly intervalMs: number;
  private readonly loop: boolean;

  private readonly fixHandlers = new Set<(fix: GpsFix) => void>();
  private readonly statusHandlers = new Set<(status: GpsStatus) => void>();

  private timer: ReturnType<typeof setInterval> | null = null;
  /** Distance travelled along the path, in metres. */
  private distance = 0;

  constructor(path: LngLat[], options: SimulatedGpsOptions = {}) {
    if (path.length < 2) {
      throw new Error('SimulatedGps needs a path of at least two points');
    }
    this.path = path;
    this.speedMps = options.speedMps ?? 13.4;
    this.hz = options.hz ?? 5;
    this.intervalMs = 1000 / this.hz;
    this.loop = options.loop ?? true;
  }

  onFix(handler: (fix: GpsFix) => void): () => void {
    this.fixHandlers.add(handler);
    return () => this.fixHandlers.delete(handler);
  }

  onStatus(handler: (status: GpsStatus) => void): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  start(): void {
    if (this.timer !== null) return;
    this.emitStatus({ state: 'acquiring' });
    // Simulate a brief cold start before the first fix lands.
    setTimeout(() => {
      this.emitStatus({ state: 'fix' });
      this.timer = setInterval(() => this.tick(), this.intervalMs);
    }, 400);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.emitStatus({ state: 'lost' });
  }

  /** Advance one interval and emit a fix. Exposed for deterministic tests. */
  tick(): GpsFix | null {
    const step = this.speedMps * (this.intervalMs / 1000);
    const fix = this.sampleAt(this.distance + step);
    if (fix === null) return null;
    this.distance += step;
    for (const handler of this.fixHandlers) handler(fix);
    return fix;
  }

  /**
   * Compute a fix at a given cumulative distance along the path. Handles
   * looping and end-of-track. Pure given the path; used directly by tests.
   */
  sampleAt(distanceM: number): GpsFix | null {
    const total = this.totalLength();
    let d = distanceM;
    if (d > total) {
      if (!this.loop) return null;
      d %= total;
    }

    let acc = 0;
    for (let i = 0; i < this.path.length - 1; i++) {
      const a = this.path[i]!;
      const b = this.path[i + 1]!;
      const segLen = haversineMetres(a, b);
      if (segLen === 0) continue;
      if (acc + segLen >= d) {
        const t = (d - acc) / segLen;
        const pos = interpolate(a, b, t);
        return {
          lat: pos.lat,
          lng: pos.lng,
          headingDeg: bearingDeg(a, b),
          speedMps: this.speedMps,
          timestamp: Date.now(),
        };
      }
      acc += segLen;
    }
    // Floating-point overshoot: snap to the final vertex.
    const last = this.path[this.path.length - 1]!;
    const prev = this.path[this.path.length - 2]!;
    return {
      lat: last.lat,
      lng: last.lng,
      headingDeg: bearingDeg(prev, last),
      speedMps: this.speedMps,
      timestamp: Date.now(),
    };
  }

  private totalLength(): number {
    let total = 0;
    for (let i = 0; i < this.path.length - 1; i++) {
      total += haversineMetres(this.path[i]!, this.path[i + 1]!);
    }
    return total;
  }

  private emitStatus(status: GpsStatus): void {
    for (const handler of this.statusHandlers) handler(status);
  }
}

/** Load a GeoJSON LineString Feature/geometry into a path of LngLat. */
export function pathFromGeoJson(geojson: unknown): LngLat[] {
  const obj = geojson as {
    type?: string;
    geometry?: { type?: string; coordinates?: number[][] };
    coordinates?: number[][];
  };
  const geometry = obj.type === 'Feature' ? obj.geometry : obj;
  if (!geometry || geometry.type !== 'LineString' || !geometry.coordinates) {
    throw new Error('Expected a GeoJSON LineString');
  }
  return geometry.coordinates.map(([lng, lat]) => ({ lng: lng!, lat: lat! }));
}
