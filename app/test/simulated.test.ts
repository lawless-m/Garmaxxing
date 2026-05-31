import { describe, it, expect } from 'vitest';
import { SimulatedGps, pathFromGeoJson } from '../src/gps/simulated';
import { haversineMetres, type LngLat } from '../src/gps/geo';

// A simple right-angle path: north then east.
const path: LngLat[] = [
  { lng: 0, lat: 53.0 },
  { lng: 0, lat: 53.02 },
  { lng: 0.03, lat: 53.02 },
];

describe('SimulatedGps.sampleAt', () => {
  it('starts at the path origin', () => {
    const sim = new SimulatedGps(path, { loop: false });
    const fix = sim.sampleAt(0)!;
    expect(fix.lat).toBeCloseTo(53.0, 6);
    expect(fix.lng).toBeCloseTo(0, 6);
    expect(fix.headingDeg).toBeCloseTo(0, 0); // heading north
  });

  it('reports an easterly heading on the second leg', () => {
    const sim = new SimulatedGps(path, { loop: false });
    const firstLeg = haversineMetres(path[0]!, path[1]!);
    const fix = sim.sampleAt(firstLeg + 10)!;
    expect(fix.headingDeg).toBeCloseTo(90, 0);
  });

  it('returns null past the end when not looping', () => {
    const sim = new SimulatedGps(path, { loop: false });
    const total =
      haversineMetres(path[0]!, path[1]!) + haversineMetres(path[1]!, path[2]!);
    expect(sim.sampleAt(total + 1000)).toBeNull();
  });

  it('wraps around when looping', () => {
    const sim = new SimulatedGps(path, { loop: true });
    const total =
      haversineMetres(path[0]!, path[1]!) + haversineMetres(path[1]!, path[2]!);
    const fix = sim.sampleAt(total + 5)!;
    expect(fix).not.toBeNull();
    expect(fix.lng).toBeCloseTo(0, 4); // back near the origin leg
  });

  it('carries the configured speed onto each fix', () => {
    const sim = new SimulatedGps(path, { speedMps: 20, loop: true });
    expect(sim.sampleAt(50)!.speedMps).toBe(20);
  });
});

describe('SimulatedGps.tick + subscriptions', () => {
  it('emits advancing fixes to subscribers', () => {
    const sim = new SimulatedGps(path, { speedMps: 10, hz: 1, loop: false });
    const fixes: number[] = [];
    sim.onFix((f) => fixes.push(f.lat));
    sim.tick();
    sim.tick();
    expect(fixes).toHaveLength(2);
    expect(fixes[1]!).toBeGreaterThan(fixes[0]!); // moving north
  });

  it('unsubscribe stops delivery', () => {
    const sim = new SimulatedGps(path, { hz: 1, loop: false });
    let count = 0;
    const off = sim.onFix(() => count++);
    sim.tick();
    off();
    sim.tick();
    expect(count).toBe(1);
  });

  it('rejects a too-short path', () => {
    expect(() => new SimulatedGps([{ lng: 0, lat: 0 }])).toThrow();
  });
});

describe('pathFromGeoJson', () => {
  it('reads a LineString Feature', () => {
    const fc = {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[0, 1], [2, 3]] },
    };
    expect(pathFromGeoJson(fc)).toEqual([
      { lng: 0, lat: 1 },
      { lng: 2, lat: 3 },
    ]);
  });

  it('reads a bare LineString geometry', () => {
    const geom = { type: 'LineString', coordinates: [[4, 5], [6, 7]] };
    expect(pathFromGeoJson(geom)).toEqual([
      { lng: 4, lat: 5 },
      { lng: 6, lat: 7 },
    ]);
  });

  it('rejects non-LineString input', () => {
    expect(() => pathFromGeoJson({ type: 'Point', coordinates: [0, 0] })).toThrow();
  });
});
