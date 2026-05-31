import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';

let registered = false;

/**
 * Register the `pmtiles://` protocol with MapLibre so styles can read the
 * single-file offline map (gb.pmtiles) directly off disk — no tile server.
 * Safe to call more than once.
 */
export function registerPmtiles(): void {
  if (registered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol('pmtiles', protocol.tile);
  registered = true;
}
