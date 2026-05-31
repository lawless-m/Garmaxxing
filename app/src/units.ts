/**
 * UK driving units (00-overview.md): metric throughout, EXCEPT miles for road
 * distance and yards for short turn distances. Speed in mph.
 */

const METRES_PER_YARD = 0.9144;
const METRES_PER_MILE = 1609.344;
const MPS_TO_MPH = 2.236936;

/** Below this distance we count in yards; above it, miles. */
export const YARDS_MILES_THRESHOLD_M = 0.5 * METRES_PER_MILE; // 804.67 m

export interface FormattedDistance {
  value: number;
  unit: 'yd' | 'mi';
  /** Ready-to-render string, e.g. "300 yd" or "2.4 mi". */
  text: string;
}

/**
 * Format a distance the way a UK sat-nav speaks turns: yards rounded to a
 * glanceable step when close in, miles to one decimal further out.
 */
export function formatDistance(metres: number): FormattedDistance {
  if (metres < YARDS_MILES_THRESHOLD_M) {
    const yards = metres / METRES_PER_YARD;
    const value = roundYards(yards);
    return { value, unit: 'yd', text: `${value} yd` };
  }
  const miles = metres / METRES_PER_MILE;
  // One decimal under 10 miles, whole miles beyond — less noise at distance.
  const value = miles < 10 ? Math.round(miles * 10) / 10 : Math.round(miles);
  return { value, unit: 'mi', text: `${value} mi` };
}

/** Round yards to a coarse, glance-friendly step (10/25/50 by magnitude). */
function roundYards(yards: number): number {
  if (yards < 100) return Math.max(0, Math.round(yards / 10) * 10);
  if (yards < 300) return Math.round(yards / 25) * 25;
  return Math.round(yards / 50) * 50;
}

/** Convert m/s to mph, rounded to a whole number for the HUD. */
export function speedMph(mps: number): number {
  return Math.round(mps * MPS_TO_MPH);
}
