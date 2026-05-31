import type { Route } from '../routing/types';
import { formatDistance } from '../units';

/** A compact route banner: destination name, remaining distance and ETA. Slice
 * 2 shows the whole-route figures; Slice 3 will update them live. */
export class RouteSummary {
  private readonly el: HTMLElement;

  constructor(parent: HTMLElement = document.body) {
    this.el = document.createElement('div');
    this.el.className = 'route-summary';
    this.el.hidden = true;
    parent.appendChild(this.el);
  }

  show(name: string, route: Route): void {
    const dist = formatDistance(route.distanceMetres);
    const mins = Math.max(1, Math.round(route.durationSeconds / 60));
    this.el.innerHTML =
      `<span class="dest">${escapeHtml(name)}</span>` +
      `<span class="figs">${dist.text} · ${mins} min</span>`;
    this.el.hidden = false;
  }

  hide(): void {
    this.el.hidden = true;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}
