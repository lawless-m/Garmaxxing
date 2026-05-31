import { describe, it, expect } from 'vitest';
import {
  normaliseDeg,
  shortestAngleDiff,
  haversineMetres,
  bearingDeg,
  interpolate,
} from '../src/gps/geo';

describe('normaliseDeg', () => {
  it('wraps into [0, 360)', () => {
    expect(normaliseDeg(0)).toBe(0);
    expect(normaliseDeg(360)).toBe(0);
    expect(normaliseDeg(-10)).toBe(350);
    expect(normaliseDeg(730)).toBe(10);
  });
});

describe('shortestAngleDiff', () => {
  it('takes the short way across north', () => {
    expect(shortestAngleDiff(350, 10)).toBe(20);
    expect(shortestAngleDiff(10, 350)).toBe(-20);
  });
  it('handles the 180° boundary', () => {
    expect(shortestAngleDiff(0, 180)).toBe(180);
    expect(Math.abs(shortestAngleDiff(0, 181))).toBe(179);
  });
});

describe('haversineMetres', () => {
  it('is zero for identical points', () => {
    expect(haversineMetres({ lng: -1.5, lat: 53 }, { lng: -1.5, lat: 53 })).toBe(0);
  });
  it('matches a known one-degree-latitude distance (~111 km)', () => {
    const d = haversineMetres({ lng: 0, lat: 53 }, { lng: 0, lat: 54 });
    expect(d).toBeGreaterThan(111_000);
    expect(d).toBeLessThan(111_400);
  });
});

describe('bearingDeg', () => {
  it('reads due north', () => {
    const b = bearingDeg({ lng: 0, lat: 53 }, { lng: 0, lat: 53.01 });
    expect(b).toBeCloseTo(0, 1);
  });
  it('reads due east', () => {
    const b = bearingDeg({ lng: 0, lat: 53 }, { lng: 0.01, lat: 53 });
    expect(b).toBeCloseTo(90, 0);
  });
});

describe('interpolate', () => {
  it('returns the midpoint at t=0.5', () => {
    const mid = interpolate({ lng: 0, lat: 0 }, { lng: 10, lat: 20 }, 0.5);
    expect(mid).toEqual({ lng: 5, lat: 10 });
  });
});
