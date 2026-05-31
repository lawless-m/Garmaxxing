import type { GpsSource } from './gps/types';
import { SimulatedGps, pathFromGeoJson } from './gps/simulated';
import { GpsdSource } from './gps/gpsd';
import type { Router } from './routing/types';
import { ValhallaRouter } from './routing/valhalla';
import { DemoRouter } from './routing/demoRouter';
import type { PostcodeLookup } from './places/postcode';
import { DemoPostcodeLookup } from './places/postcode';
import { SqlitePostcodeLookup } from './places/sqlitePostcode';

// Served from public/ at <base>/tracks/demo.geojson — no bundling needed.
const demoTrack = `${import.meta.env.BASE_URL}tracks/demo.geojson`;

/** True when running the real van stack (gpsd, Valhalla, SQLite postcodes). */
function isVanBuild(): boolean {
  return import.meta.env.VITE_GPS_SOURCE === 'gpsd';
}

/**
 * Which GPS source to wire up. Defaults to the simulator unless
 * VITE_GPS_SOURCE=gpsd is set (the van build).
 */
export async function createGpsSource(): Promise<GpsSource> {
  if (isVanBuild()) {
    return new GpsdSource({
      url: import.meta.env.VITE_GPSD_WS_URL ?? 'ws://127.0.0.1:2948',
    });
  }
  const res = await fetch(demoTrack);
  const path = pathFromGeoJson(await res.json());
  return new SimulatedGps(path, { speedMps: 13.4, hz: 5, loop: true });
}

/** Valhalla in the van; a straight-line demo router on a bare workstation. */
export function createRouter(): Router {
  if (isVanBuild() || import.meta.env.VITE_VALHALLA_URL) {
    return new ValhallaRouter({
      baseUrl: import.meta.env.VITE_VALHALLA_URL ?? 'http://127.0.0.1:8002',
    });
  }
  return new DemoRouter();
}

/** SQLite-backed postcodes in the van; a small fixed table for the demo. */
export function createPostcodeLookup(): PostcodeLookup {
  if (isVanBuild() || import.meta.env.VITE_POSTCODE_DB) {
    return new SqlitePostcodeLookup({
      dbUrl: import.meta.env.VITE_POSTCODE_DB ?? '/postcodes.sqlite',
    });
  }
  return new DemoPostcodeLookup();
}
