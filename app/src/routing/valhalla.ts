import type { Router, Route, RouteRequest, RouteManeuver } from './types';
import { RoutingError } from './types';
import { decodePolyline } from './polyline';
import vanCosting from '../../../data/valhalla/van-costing.json';

export interface ValhallaRouterOptions {
  /** Base URL of the local Valhalla service (Debian container on the Orin). */
  baseUrl?: string;
  /** Per-request timeout, ms. */
  timeoutMs?: number;
  /** Override the van costing options (defaults to the shared template). */
  costingOptions?: Record<string, unknown>;
}

/** Shape of the bits of a Valhalla /route response we consume. */
interface ValhallaResponse {
  trip?: {
    legs?: Array<{
      shape?: string;
      maneuvers?: Array<{
        begin_shape_index?: number;
        instruction?: string;
        street_names?: string[];
        type?: number;
        roundabout_exit_count?: number;
        length?: number; // kilometres
      }>;
      summary?: { length?: number; time?: number };
    }>;
    summary?: { length?: number; time?: number };
  };
}

const KM_TO_M = 1000;

/**
 * Routes against a local Valhalla HTTP service, applying the van dimensions
 * (height/weight/length/width) as costing_options so low bridges and
 * restricted roads are avoided. See data/valhalla/van-costing.json.
 */
export class ValhallaRouter implements Router {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly costing: string;
  private readonly costingOptions: Record<string, unknown>;

  constructor(options: ValhallaRouterOptions = {}) {
    this.baseUrl = (options.baseUrl ?? 'http://127.0.0.1:8002').replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs ?? 8000;
    this.costing = vanCosting.costing;
    this.costingOptions = options.costingOptions ?? vanCosting.costing_options;
  }

  async route(request: RouteRequest): Promise<Route> {
    const body = {
      locations: [
        { lat: request.from.lat, lon: request.from.lng },
        { lat: request.to.lat, lon: request.to.lng },
      ],
      costing: this.costing,
      costing_options: this.costingOptions,
      directions_options: { units: 'kilometers' },
    };

    let res: Response;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      res = await fetch(`${this.baseUrl}/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (cause) {
      throw new RoutingError('Valhalla request failed', { cause });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      throw new RoutingError(`Valhalla returned HTTP ${res.status}`);
    }
    return parseValhallaResponse(await res.json());
  }
}

/** Parse a Valhalla /route JSON body into our Route. Exported for tests. */
export function parseValhallaResponse(json: unknown): Route {
  const trip = (json as ValhallaResponse).trip;
  if (!trip || !trip.legs || trip.legs.length === 0) {
    throw new RoutingError('Valhalla response had no trip legs');
  }

  const geometry: Route['geometry'] = [];
  const maneuvers: RouteManeuver[] = [];

  for (const leg of trip.legs) {
    const offset = geometry.length;
    if (leg.shape) {
      const pts = decodePolyline(leg.shape, 6);
      // Avoid duplicating the shared vertex where consecutive legs join.
      geometry.push(...(offset > 0 ? pts.slice(1) : pts));
    }
    for (const m of leg.maneuvers ?? []) {
      maneuvers.push({
        beginShapeIndex: (m.begin_shape_index ?? 0) + (offset > 0 ? offset - 1 : 0),
        instruction: m.instruction ?? '',
        streetName: m.street_names && m.street_names.length > 0 ? m.street_names[0]! : null,
        type: m.type ?? 0,
        roundaboutExitCount: m.roundabout_exit_count ?? null,
        lengthMetres: (m.length ?? 0) * KM_TO_M,
      });
    }
  }

  const summary = trip.summary ?? {};
  return {
    geometry,
    maneuvers,
    distanceMetres: (summary.length ?? 0) * KM_TO_M,
    durationSeconds: summary.time ?? 0,
  };
}
