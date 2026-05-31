import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { registerPmtiles } from './map/pmtiles';
import { styleFor, themeForHour, type Theme } from './map/themes';
import { FollowCamera } from './camera/followCamera';
import { VehicleMarker } from './ui/vehicleMarker';
import { Hud } from './ui/hud';
import { createGpsSource } from './config';

async function main(): Promise<void> {
  registerPmtiles();

  let theme: Theme = themeForHour(new Date().getHours());

  const map = new maplibregl.Map({
    container: 'map',
    style: styleFor(theme),
    center: [-1.5, 53.0], // Somewhere over GB until the first fix arrives.
    zoom: 14,
    pitch: 0,
    attributionControl: false,
    // Track-up nav: the user never drives the camera by hand.
    interactive: false,
  });

  await new Promise<void>((resolve) => map.on('load', () => resolve()));

  const camera = new FollowCamera(map);
  const marker = new VehicleMarker(map);
  const hud = new Hud();

  const gps = await createGpsSource();
  gps.onStatus((status) => hud.setGpsState(status.state));
  gps.onFix((fix) => {
    marker.update(fix);
    camera.update(fix);
    hud.setFix(fix);
  });
  gps.start();

  // Manual day/night toggle: 'n' on the compact keyboard (03-nav-app.md).
  window.addEventListener('keydown', (e) => {
    if (e.key === 'n' || e.key === 'N') {
      theme = theme === 'day' ? 'night' : 'day';
      map.setStyle(styleFor(theme));
    }
  });
}

void main();
