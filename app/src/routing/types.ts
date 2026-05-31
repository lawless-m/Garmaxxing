import type { LngLat } from '../gps/geo';

/** A maneuver from the router. Slice 2 only draws the line; Slice 3 uses these
 * for distance-to-turn and the junction view, so keep the shape now. */
export interface RouteManeuver {
  /** Index into the route geometry where this maneuver begins. */
  beginShapeIndex: number;
  /** Human instruction text, e.g. "Turn left onto High Street". */
  instruction: string;
  /** Road name the maneuver leads onto, if any. */
  streetName: string | null;
  /** Valhalla maneuver type code (0..36), kept for the junction view later. */
  type: number;
  /** Roundabout exit number ("take the Nth exit"), if applicable. */
  roundaboutExitCount: number | null;
  /** Length of this maneuver leg, metres. */
  lengthMetres: number;
}

/** A computed route: the line to draw plus the maneuvers along it. */
export interface Route {
  /** Ordered WGS84 points forming the route line. */
  geometry: LngLat[];
  /** Maneuvers in order. */
  maneuvers: RouteManeuver[];
  /** Total distance, metres. */
  distanceMetres: number;
  /** Estimated duration, seconds. */
  durationSeconds: number;
}

export interface RouteRequest {
  from: LngLat;
  to: LngLat;
}

/**
 * Something that turns a start+destination into a route. Valhalla in the van;
 * a straight-line demo router on a workstation with no routing tiles. The app
 * never knows which it is talking to (mirrors the GpsSource pattern).
 */
export interface Router {
  route(request: RouteRequest): Promise<Route>;
}

/** Raised when the router cannot produce a route (no path, service down). */
export class RoutingError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'RoutingError';
  }
}
