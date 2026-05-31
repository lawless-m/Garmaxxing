import { describe, it, expect } from 'vitest';
import { decodePolyline } from '../src/routing/polyline';

describe('decodePolyline', () => {
  it('decodes the classic precision-5 example', () => {
    // Google's reference string `_p~iF~ps|U_ulLnnqC_mqNvxq`@` at precision 5.
    const pts = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@', 5);
    expect(pts).toHaveLength(3);
    expect(pts[0]!.lat).toBeCloseTo(38.5, 5);
    expect(pts[0]!.lng).toBeCloseTo(-120.2, 5);
    expect(pts[1]!.lat).toBeCloseTo(40.7, 5);
    expect(pts[1]!.lng).toBeCloseTo(-120.95, 5);
    expect(pts[2]!.lat).toBeCloseTo(43.252, 5);
    expect(pts[2]!.lng).toBeCloseTo(-126.453, 5);
  });

  it('uses precision 6 by default (Valhalla)', () => {
    // The same deltas at precision 6 are 10x smaller in degrees.
    const p5 = decodePolyline('_p~iF~ps|U', 5);
    const p6 = decodePolyline('_p~iF~ps|U', 6);
    expect(p6[0]!.lat).toBeCloseTo(p5[0]!.lat / 10, 6);
    expect(p6[0]!.lng).toBeCloseTo(p5[0]!.lng / 10, 6);
  });

  it('returns an empty array for an empty string', () => {
    expect(decodePolyline('')).toEqual([]);
  });
});
