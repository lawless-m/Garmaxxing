import { describe, it, expect } from 'vitest';
import { GpsdSource } from '../src/gps/gpsd';

// parseTpv is pure, so we can exercise the gpsd wire format without a socket.
describe('GpsdSource.parseTpv', () => {
  const src = new GpsdSource();

  it('parses a valid TPV report', () => {
    const fix = src.parseTpv(
      JSON.stringify({
        class: 'TPV',
        mode: 3,
        lat: 53.1,
        lon: -1.5,
        track: 87.5,
        speed: 12.3,
        time: '2026-05-31T12:00:00.000Z',
      }),
    )!;
    expect(fix.lat).toBe(53.1);
    expect(fix.lng).toBe(-1.5);
    expect(fix.headingDeg).toBeCloseTo(87.5, 3);
    expect(fix.speedMps).toBe(12.3);
    expect(fix.timestamp).toBe(Date.parse('2026-05-31T12:00:00.000Z'));
  });

  it('ignores non-TPV classes', () => {
    expect(src.parseTpv(JSON.stringify({ class: 'SKY' }))).toBeNull();
  });

  it('ignores reports with no fix (mode < 2)', () => {
    expect(
      src.parseTpv(JSON.stringify({ class: 'TPV', mode: 1, lat: 1, lon: 2 })),
    ).toBeNull();
  });

  it('requires lat and lon', () => {
    expect(src.parseTpv(JSON.stringify({ class: 'TPV', mode: 3 }))).toBeNull();
  });

  it('tolerates missing track/speed', () => {
    const fix = src.parseTpv(
      JSON.stringify({ class: 'TPV', mode: 2, lat: 1, lon: 2 }),
    )!;
    expect(fix.headingDeg).toBeNull();
    expect(fix.speedMps).toBeNull();
  });

  it('returns null on malformed JSON', () => {
    expect(src.parseTpv('{not json')).toBeNull();
  });
});
