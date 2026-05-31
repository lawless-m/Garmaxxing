import { describe, it, expect } from 'vitest';
import { formatDistance, speedMph, YARDS_MILES_THRESHOLD_M } from '../src/units';

describe('formatDistance', () => {
  it('uses yards below the threshold', () => {
    const d = formatDistance(90); // ~98 yd
    expect(d.unit).toBe('yd');
    expect(d.value).toBe(100);
    expect(d.text).toBe('100 yd');
  });

  it('rounds near yards to a glanceable step of 10', () => {
    expect(formatDistance(20).value).toBe(20); // ~22 yd -> 20
  });

  it('uses miles above the threshold', () => {
    const d = formatDistance(YARDS_MILES_THRESHOLD_M + 1);
    expect(d.unit).toBe('mi');
  });

  it('shows one decimal mile under 10 miles', () => {
    const d = formatDistance(3862.5); // ~2.4 mi
    expect(d.unit).toBe('mi');
    expect(d.value).toBeCloseTo(2.4, 1);
  });

  it('shows whole miles at distance', () => {
    const d = formatDistance(40233.6); // ~25 mi
    expect(d.value).toBe(25);
    expect(d.text).toBe('25 mi');
  });
});

describe('speedMph', () => {
  it('converts m/s to mph', () => {
    expect(speedMph(13.4)).toBe(30); // ~29.98
    expect(speedMph(0)).toBe(0);
  });
});
