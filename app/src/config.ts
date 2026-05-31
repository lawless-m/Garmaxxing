import type { GpsSource } from './gps/types';
import { SimulatedGps, pathFromGeoJson } from './gps/simulated';
import { GpsdSource } from './gps/gpsd';

// Served from public/ at <base>/tracks/demo.geojson — no bundling needed.
const demoTrack = `${import.meta.env.BASE_URL}tracks/demo.geojson`;

/**
 * Which GPS source to wire up. Defaults to the simulator unless
 * VITE_GPS_SOURCE=gpsd is set (the van build).
 */
export async function createGpsSource(): Promise<GpsSource> {
  const kind = import.meta.env.VITE_GPS_SOURCE ?? 'simulated';
  if (kind === 'gpsd') {
    return new GpsdSource({
      url: import.meta.env.VITE_GPSD_WS_URL ?? 'ws://127.0.0.1:2948',
    });
  }
  const res = await fetch(demoTrack);
  const path = pathFromGeoJson(await res.json());
  return new SimulatedGps(path, { speedMps: 13.4, hz: 5, loop: true });
}
