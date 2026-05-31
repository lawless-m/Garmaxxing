import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
import type { Route } from '../routing/types';
import type { LngLat } from '../gps/geo';

const SOURCE_ID = 'route';
const CASING_LAYER = 'route-casing';
const LINE_LAYER = 'route-line';
const PIN_SOURCE = 'destination';
const PIN_LAYER = 'destination-pin';

/**
 * Draws the route line (with a casing for contrast at junction zoom) and a
 * destination marker. The bold line over the junction is what marks the exit
 * — Valhalla already threads the route out the correct one (03-nav-app.md).
 */
export class RouteLine {
  private readonly map: MapLibreMap;

  constructor(map: MapLibreMap) {
    this.map = map;
    this.ensureLayers();
  }

  /** Show a route. Re-adds layers if a style change (day/night) dropped them. */
  setRoute(route: Route, destination: LngLat): void {
    this.ensureLayers();
    (this.map.getSource(SOURCE_ID) as GeoJSONSource).setData(lineFeature(route.geometry));
    (this.map.getSource(PIN_SOURCE) as GeoJSONSource).setData(pointFeature(destination));
  }

  /** Clear the route and destination marker. */
  clear(): void {
    if (this.map.getSource(SOURCE_ID)) {
      (this.map.getSource(SOURCE_ID) as GeoJSONSource).setData(emptyCollection());
    }
    if (this.map.getSource(PIN_SOURCE)) {
      (this.map.getSource(PIN_SOURCE) as GeoJSONSource).setData(emptyCollection());
    }
  }

  private ensureLayers(): void {
    if (this.map.getSource(SOURCE_ID)) return;

    this.map.addSource(SOURCE_ID, { type: 'geojson', data: emptyCollection() });
    this.map.addSource(PIN_SOURCE, { type: 'geojson', data: emptyCollection() });

    this.map.addLayer({
      id: CASING_LAYER,
      type: 'line',
      source: SOURCE_ID,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#0b3d91',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 6, 18, 22],
      },
    });
    this.map.addLayer({
      id: LINE_LAYER,
      type: 'line',
      source: SOURCE_ID,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#3b82f6',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 3, 18, 14],
      },
    });
    this.map.addLayer({
      id: PIN_LAYER,
      type: 'circle',
      source: PIN_SOURCE,
      paint: {
        'circle-radius': 8,
        'circle-color': '#ef4444',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
      },
    });
  }
}

function lineFeature(points: LngLat[]): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: points.map((p) => [p.lng, p.lat]) },
  };
}

function pointFeature(point: LngLat): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Point', coordinates: [point.lng, point.lat] },
  };
}

function emptyCollection(): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: [] };
}
