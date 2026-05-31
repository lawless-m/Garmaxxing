import { describe, it, expect } from 'vitest';
import { parseValhallaResponse } from '../src/routing/valhalla';
import { RoutingError } from '../src/routing/types';

// A minimal two-leg Valhalla /route response (shapes are precision-6).
function sample() {
  return {
    trip: {
      legs: [
        {
          shape: '_p~iF~ps|U_ulLnnqC',
          maneuvers: [
            {
              begin_shape_index: 0,
              instruction: 'Drive north.',
              street_names: ['High Street'],
              type: 1,
              length: 0.5,
            },
            {
              begin_shape_index: 1,
              instruction: 'Turn left.',
              type: 15,
              roundabout_exit_count: 0,
              length: 0.2,
            },
          ],
          summary: { length: 0.7, time: 60 },
        },
      ],
      summary: { length: 0.7, time: 60 },
    },
  };
}

describe('parseValhallaResponse', () => {
  it('extracts geometry, maneuvers and totals', () => {
    const route = parseValhallaResponse(sample());
    expect(route.geometry.length).toBe(2);
    expect(route.maneuvers).toHaveLength(2);
    expect(route.maneuvers[0]!.streetName).toBe('High Street');
    expect(route.maneuvers[0]!.instruction).toBe('Drive north.');
    expect(route.maneuvers[1]!.type).toBe(15);
    // 0.7 km → 700 m, 60 s.
    expect(route.distanceMetres).toBeCloseTo(700, 5);
    expect(route.durationSeconds).toBe(60);
  });

  it('converts maneuver leg length from km to metres', () => {
    const route = parseValhallaResponse(sample());
    expect(route.maneuvers[0]!.lengthMetres).toBeCloseTo(500, 5);
  });

  it('defaults a missing street name to null', () => {
    const route = parseValhallaResponse(sample());
    expect(route.maneuvers[1]!.streetName).toBeNull();
  });

  it('throws RoutingError when there are no legs', () => {
    expect(() => parseValhallaResponse({ trip: { legs: [] } })).toThrow(RoutingError);
    expect(() => parseValhallaResponse({})).toThrow(RoutingError);
  });

  it('joins multiple legs without duplicating the shared vertex', () => {
    const json = sample();
    json.trip.legs.push({ ...json.trip.legs[0]! });
    const route = parseValhallaResponse(json);
    // Two legs of 2 points each, minus one shared join point = 3.
    expect(route.geometry.length).toBe(3);
  });
});
