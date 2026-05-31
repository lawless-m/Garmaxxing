import { normaliseDeg, shortestAngleDiff } from './geo';

export interface HeadingSmootherOptions {
  /**
   * Smoothing factor 0..1 applied per update along the shortest arc.
   * Lower = smoother but laggier. 0.25 is a calm but responsive default.
   */
  alpha?: number;
  /**
   * Below this ground speed (m/s) the bearing is frozen at its last value.
   * Raw GPS heading is meaningless at a standstill and makes the map spin,
   * so we hold steady below roughly walking pace (~1.4 m/s).
   */
  freezeBelowMps?: number;
}

/**
 * Turns jittery raw GPS course into a calm map bearing.
 *
 * Two behaviours from the spec (03-nav-app.md):
 *  - exponential smoothing along the shortest arc, so 350°→10° eases through
 *    north rather than spinning the long way round;
 *  - a low-speed freeze, so a stationary van doesn't make the map wander.
 */
export class HeadingSmoother {
  private readonly alpha: number;
  private readonly freezeBelowMps: number;
  private smoothed: number | null = null;

  constructor(options: HeadingSmootherOptions = {}) {
    this.alpha = options.alpha ?? 0.25;
    this.freezeBelowMps = options.freezeBelowMps ?? 1.4;
  }

  /** The current smoothed bearing, or null before the first valid sample. */
  get value(): number | null {
    return this.smoothed;
  }

  /**
   * Feed a new sample. Returns the bearing the map should use, or null while
   * we still have nothing trustworthy to show.
   *
   * @param headingDeg raw course over ground, or null if unknown
   * @param speedMps   ground speed, or null if unknown (treated as frozen)
   */
  update(headingDeg: number | null, speedMps: number | null): number | null {
    // Too slow (or no speed): hold the last good bearing steady.
    if (speedMps === null || speedMps < this.freezeBelowMps) {
      return this.smoothed;
    }
    if (headingDeg === null || Number.isNaN(headingDeg)) {
      return this.smoothed;
    }

    const target = normaliseDeg(headingDeg);
    if (this.smoothed === null) {
      this.smoothed = target;
    } else {
      const diff = shortestAngleDiff(this.smoothed, target);
      this.smoothed = normaliseDeg(this.smoothed + this.alpha * diff);
    }
    return this.smoothed;
  }

  /** Forget all history (e.g. after a GPS dropout). */
  reset(): void {
    this.smoothed = null;
  }
}
