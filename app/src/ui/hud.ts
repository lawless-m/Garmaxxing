import type { GpsFix, GpsState } from '../gps/types';
import { speedMph } from '../units';

/**
 * The glanceable overlay. Slice 1 shows GPS state and speed; the
 * next-maneuver arrow and distance-to-turn land in Slice 3.
 */
export class Hud {
  private readonly gpsStateEl: HTMLElement;
  private readonly speedEl: HTMLElement;

  constructor(root: Document = document) {
    this.gpsStateEl = mustGet(root, 'gps-state');
    this.speedEl = mustGet(root, 'speed-value');
  }

  setGpsState(state: GpsState): void {
    this.gpsStateEl.dataset.state = state;
    this.gpsStateEl.textContent =
      state === 'acquiring'
        ? 'Acquiring GPS…'
        : state === 'lost'
          ? 'GPS lost'
          : '';
    this.gpsStateEl.style.display = state === 'fix' ? 'none' : 'block';
  }

  setFix(fix: GpsFix): void {
    this.speedEl.textContent =
      fix.speedMps === null ? '—' : String(speedMph(fix.speedMps));
  }
}

function mustGet(root: Document, id: string): HTMLElement {
  const el = root.getElementById(id);
  if (!el) throw new Error(`HUD element #${id} not found`);
  return el;
}
