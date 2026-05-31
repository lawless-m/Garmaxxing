import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { registerPmtiles } from './map/pmtiles';
import { styleFor, themeForHour, type Theme } from './map/themes';
import { FollowCamera } from './camera/followCamera';
import { VehicleMarker } from './ui/vehicleMarker';
import { Hud } from './ui/hud';
import { RouteLine } from './map/routeLine';
import { DestinationPanel } from './ui/destinationPanel';
import { RouteSummary } from './ui/routeSummary';
import { LocalFavouritesStore } from './places/favourites';
import type { Destination } from './places/destination';
import { RoutingError } from './routing/types';
import { createGpsSource, createRouter, createPostcodeLookup } from './config';
import type { GpsFix } from './gps/types';

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
    interactive: false, // Track-up nav: the user never drives the camera by hand.
  });

  await new Promise<void>((resolve) => map.on('load', () => resolve()));

  const camera = new FollowCamera(map);
  const marker = new VehicleMarker(map);
  const hud = new Hud();
  const routeLine = new RouteLine(map);
  const routeSummary = new RouteSummary();

  const router = createRouter();
  const postcodes = createPostcodeLookup();
  const favourites = new LocalFavouritesStore();

  // Latest position, so we can route from where the van is right now.
  let lastFix: GpsFix | null = null;

  const gps = await createGpsSource();
  gps.onStatus((status) => hud.setGpsState(status.state));
  gps.onFix((fix) => {
    lastFix = fix;
    marker.update(fix);
    camera.update(fix);
    hud.setFix(fix);
  });
  gps.start();

  const panel = new DestinationPanel({
    favourites,
    postcodes,
    onConfirm: (dest) => void routeTo(dest),
  });

  async function routeTo(dest: Destination): Promise<void> {
    if (lastFix === null) {
      hud.setNotice('Waiting for GPS before routing…');
      return;
    }
    hud.setNotice('Routing…');
    try {
      const route = await router.route({
        from: { lng: lastFix.lng, lat: lastFix.lat },
        to: dest.coord,
      });
      routeLine.setRoute(route, dest.coord);
      routeSummary.show(dest.name, route);
      hud.clearNotice();
    } catch (err) {
      const why = err instanceof RoutingError ? err.message : 'Routing failed';
      hud.setNotice(why);
    }
  }

  function clearRoute(): void {
    routeLine.clear();
    routeSummary.hide();
    hud.clearNotice();
  }

  // Keyboard: the panel gets first refusal, then the global shortcuts.
  window.addEventListener('keydown', (e) => {
    if (panel.handleKey(e)) {
      e.preventDefault();
      return;
    }
    switch (e.key) {
      case 'd':
      case 'D':
      case 'Enter':
        if (!panel.isOpen()) panel.show();
        break;
      case 'c':
      case 'C':
        clearRoute();
        break;
      case 'n':
      case 'N':
        // Manual day/night toggle (03-nav-app.md). Styles drop custom layers,
        // so re-add the route line once the new style loads.
        theme = theme === 'day' ? 'night' : 'day';
        map.once('style.load', () => routeLine.clear());
        map.setStyle(styleFor(theme));
        break;
    }
  });
}

void main();
