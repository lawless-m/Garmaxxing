import maplibregl, { type Map as MapLibreMap, type Marker } from 'maplibre-gl';
import type { GpsFix } from '../gps/types';

/**
 * The van's position dot. Because the map rotates track-up, the marker sits
 * fixed at screen-centre pointing "up" — the world turns beneath it.
 */
export class VehicleMarker {
  private readonly marker: Marker;

  constructor(map: MapLibreMap) {
    const el = document.createElement('div');
    el.className = 'vehicle-marker';
    el.innerHTML =
      '<svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true">' +
      '<path d="M12 2 L20 21 L12 16 L4 21 Z" />' +
      '</svg>';
    this.marker = new maplibregl.Marker({ element: el, rotationAlignment: 'map' })
      .setLngLat([0, 0])
      .addTo(map);
  }

  update(fix: GpsFix): void {
    this.marker.setLngLat([fix.lng, fix.lat]);
  }

  remove(): void {
    this.marker.remove();
  }
}
