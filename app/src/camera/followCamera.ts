import type { Map as MapLibreMap } from 'maplibre-gl';
import type { GpsFix } from '../gps/types';
import { HeadingSmoother, type HeadingSmootherOptions } from '../gps/smoothing';

export interface FollowCameraOptions {
  /** Cruise zoom while just driving (Slice 1 has only this state). */
  cruiseZoom?: number;
  /** Camera ease duration in ms; should track the fix interval. */
  easeMs?: number;
  smoothing?: HeadingSmootherOptions;
}

/**
 * Drives the MapLibre camera from GPS fixes: centres on the van and rotates
 * the map track-up (direction of travel = "up"), top-down with no pitch.
 *
 * Slice 1 is cruise-only. The cruise↔junction zoom (bespoke piece #2) layers
 * on top of this in Slice 3, reusing the same smoothed bearing.
 */
export class FollowCamera {
  private readonly map: MapLibreMap;
  private readonly cruiseZoom: number;
  private readonly easeMs: number;
  private readonly smoother: HeadingSmoother;

  constructor(map: MapLibreMap, options: FollowCameraOptions = {}) {
    this.map = map;
    this.cruiseZoom = options.cruiseZoom ?? 15.5;
    this.easeMs = options.easeMs ?? 200;
    this.smoother = new HeadingSmoother(options.smoothing);
  }

  /** Apply a fix: recentre, and rotate to the smoothed (or frozen) bearing. */
  update(fix: GpsFix): void {
    const bearing = this.smoother.update(fix.headingDeg, fix.speedMps);
    this.map.easeTo({
      center: [fix.lng, fix.lat],
      bearing: bearing ?? this.map.getBearing(),
      zoom: this.cruiseZoom,
      pitch: 0,
      duration: this.easeMs,
      // Camera moves are programmatic; don't fire user-interaction events.
      animate: true,
    });
  }

  /** Current smoothed bearing in degrees, or null before first valid sample. */
  get bearing(): number | null {
    return this.smoother.value;
  }

  reset(): void {
    this.smoother.reset();
  }
}
