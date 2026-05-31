import type { Router, Route, RouteRequest } from './types';
import { RoutingError } from './types';
import { bearingDeg, haversineMetres, interpolate, type LngLat } from '../gps/geo';

export interface DemoRouterOptions {
  /** Assumed average speed (m/s) for the duration estimate. */
  speedMps?: number;
  /** Approximate spacing between generated shape points, metres. */
  pointSpacingMetres?: number;
}

/**
 * A stand-in router for a workstation with no Valhalla tiles: it returns a
 * straight great-circle line from start to destination, sampled into a shape,
 * with a single "head toward destination" maneuver. Enough to exercise the
 * Slice 2 plumbing (request → route → draw) end to end without the service.
 *
 * Same Router contract as ValhallaRouter, so the app is identical either way.
 */
export class DemoRouter implements Router {
  private readonly speedMps: number;
  private readonly spacing: number;

  constructor(options: DemoRouterOptions = {}) {
    this.speedMps = options.speedMps ?? 13.4;
    this.spacing = options.pointSpacingMetres ?? 100;
  }

  async route(request: RouteRequest): Promise<Route> {
    const { from, to } = request;
    const distance = haversineMetres(from, to);
    if (distance === 0) {
      throw new RoutingError('Start and destination are the same point');
    }

    const steps = Math.max(1, Math.round(distance / this.spacing));
    const geometry: LngLat[] = [];
    for (let i = 0; i <= steps; i++) {
      geometry.push(interpolate(from, to, i / steps));
    }

    return {
      geometry,
      maneuvers: [
        {
          beginShapeIndex: 0,
          instruction: `Head ${compass(bearingDeg(from, to))} toward destination`,
          streetName: null,
          type: 1, // "start"
          roundaboutExitCount: null,
          lengthMetres: distance,
        },
        {
          beginShapeIndex: geometry.length - 1,
          instruction: 'Arrive at destination',
          streetName: null,
          type: 4, // "destination"
          roundaboutExitCount: null,
          lengthMetres: 0,
        },
      ],
      distanceMetres: distance,
      durationSeconds: distance / this.speedMps,
    };
  }
}

/** Eight-point compass label for a bearing in degrees. */
function compass(deg: number): string {
  const names = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
  return names[Math.round(deg / 45) % 8]!;
}
