import { describe, it, expect } from 'vitest';
import { DemoRouter } from '../src/routing/demoRouter';
import { RoutingError } from '../src/routing/types';
import { haversineMetres } from '../src/gps/geo';

describe('DemoRouter', () => {
  const from = { lng: -1.4699, lat: 53.3811 };
  const to = { lng: -1.4746, lat: 52.9226 };

  it('produces a route from start to destination', async () => {
    const route = await new DemoRouter().route({ from, to });
    expect(route.geometry.length).toBeGreaterThan(2);
    expect(route.geometry[0]).toEqual(from);
    const last = route.geometry[route.geometry.length - 1]!;
    expect(last.lat).toBeCloseTo(to.lat, 6);
    expect(last.lng).toBeCloseTo(to.lng, 6);
  });

  it('reports a sensible distance and duration', async () => {
    const route = await new DemoRouter({ speedMps: 10 }).route({ from, to });
    const straight = haversineMetres(from, to);
    expect(route.distanceMetres).toBeCloseTo(straight, 0);
    expect(route.durationSeconds).toBeCloseTo(straight / 10, 0);
  });

  it('always has a start and arrival maneuver', async () => {
    const route = await new DemoRouter().route({ from, to });
    expect(route.maneuvers[0]!.type).toBe(1);
    expect(route.maneuvers[route.maneuvers.length - 1]!.type).toBe(4);
    expect(route.maneuvers[0]!.instruction).toMatch(/toward destination/);
  });

  it('rejects a zero-length route', async () => {
    await expect(new DemoRouter().route({ from, to: from })).rejects.toBeInstanceOf(
      RoutingError,
    );
  });
});
