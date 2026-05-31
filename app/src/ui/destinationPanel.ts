import type { Destination } from '../places/destination';
import { resolvePostcode } from '../places/destination';
import type { FavouritesStore } from '../places/favourites';
import type { PostcodeLookup } from '../places/postcode';

export interface DestinationPanelDeps {
  favourites: FavouritesStore;
  postcodes: PostcodeLookup;
  /** Called once the driver confirms a destination — kicks off routing. */
  onConfirm: (destination: Destination) => void;
  /** Called when the panel is dismissed without choosing. */
  onCancel?: () => void;
}

type Mode = 'favourites' | 'postcode' | 'confirm';

/**
 * The destination chooser, used **while parked** on a compact keyboard
 * (no touch). Open it, arrow through favourites, or switch to postcode entry.
 *
 * Keys:
 *   ↑/↓    move selection (favourites)
 *   Enter  select / confirm
 *   p      switch to postcode entry
 *   Esc    back out / close
 *
 * Postcodes require an explicit confirm of the resolved area before routing,
 * because a postcode unit is street-level, not a specific door (02/03 docs).
 */
export class DestinationPanel {
  private readonly deps: DestinationPanelDeps;
  private readonly root: HTMLElement;
  private mode: Mode = 'favourites';
  private selected = 0;
  private postcodeText = '';
  private pending: Destination | null = null;
  private message = '';
  private open = false;

  constructor(deps: DestinationPanelDeps, parent: HTMLElement = document.body) {
    this.deps = deps;
    this.root = document.createElement('div');
    this.root.className = 'dest-panel';
    this.root.hidden = true;
    parent.appendChild(this.root);
  }

  isOpen(): boolean {
    return this.open;
  }

  show(): void {
    this.open = true;
    this.mode = 'favourites';
    this.selected = 0;
    this.postcodeText = '';
    this.pending = null;
    this.message = '';
    this.root.hidden = false;
    this.render();
  }

  hide(): void {
    this.open = false;
    this.root.hidden = true;
    this.deps.onCancel?.();
  }

  /** Feed a keydown. Returns true if the panel consumed it. */
  handleKey(e: KeyboardEvent): boolean {
    if (!this.open) return false;
    switch (this.mode) {
      case 'favourites':
        return this.handleFavouritesKey(e);
      case 'postcode':
        return this.handlePostcodeKey(e);
      case 'confirm':
        return this.handleConfirmKey(e);
    }
  }

  private handleFavouritesKey(e: KeyboardEvent): boolean {
    const favs = this.deps.favourites.list();
    switch (e.key) {
      case 'ArrowDown':
        this.selected = Math.min(this.selected + 1, Math.max(0, favs.length - 1));
        return this.consumed();
      case 'ArrowUp':
        this.selected = Math.max(this.selected - 1, 0);
        return this.consumed();
      case 'Enter': {
        const fav = favs[this.selected];
        if (fav) {
          this.confirmPending({ name: fav.name, coord: fav.coord, source: 'favourite' });
        }
        return true;
      }
      case 'p':
      case 'P':
        this.mode = 'postcode';
        this.postcodeText = '';
        this.message = '';
        return this.consumed();
      case 'Escape':
        this.hide();
        return true;
      default:
        return false;
    }
  }

  private handlePostcodeKey(e: KeyboardEvent): boolean {
    if (e.key === 'Enter') {
      void this.tryPostcode();
      return true;
    }
    if (e.key === 'Escape') {
      this.mode = 'favourites';
      this.message = '';
      return this.consumed();
    }
    if (e.key === 'Backspace') {
      this.postcodeText = this.postcodeText.slice(0, -1);
      return this.consumed();
    }
    if (e.key.length === 1 && /[a-zA-Z0-9 ]/.test(e.key)) {
      this.postcodeText += e.key.toUpperCase();
      return this.consumed();
    }
    return false;
  }

  private handleConfirmKey(e: KeyboardEvent): boolean {
    if (e.key === 'Enter' && this.pending) {
      const dest = this.pending;
      this.hideSilently();
      this.deps.onConfirm(dest);
      return true;
    }
    if (e.key === 'Escape') {
      this.mode = this.pending?.source === 'postcode' ? 'postcode' : 'favourites';
      this.pending = null;
      return this.consumed();
    }
    return false;
  }

  private async tryPostcode(): Promise<void> {
    const result = await resolvePostcode(this.postcodeText, this.deps.postcodes);
    if (!result.ok) {
      this.message =
        result.reason === 'invalid-postcode'
          ? 'Not a valid postcode'
          : 'Postcode not found';
      this.render();
      return;
    }
    this.confirmPending(result.destination);
  }

  /** Favourites route immediately; postcodes go through a confirm step. */
  private confirmPending(dest: Destination): void {
    if (dest.source === 'postcode') {
      this.pending = dest;
      this.mode = 'confirm';
      this.message = '';
      this.render();
      return;
    }
    this.hideSilently();
    this.deps.onConfirm(dest);
  }

  private hideSilently(): void {
    this.open = false;
    this.root.hidden = true;
  }

  private consumed(): boolean {
    this.render();
    return true;
  }

  private render(): void {
    if (this.mode === 'favourites') {
      const favs = this.deps.favourites.list();
      const items = favs
        .map(
          (f, i) =>
            `<li class="${i === this.selected ? 'sel' : ''}">${escapeHtml(f.name)}</li>`,
        )
        .join('');
      this.root.innerHTML = `
        <h2>Where to?</h2>
        <ul class="dest-list">${items || '<li class="empty">No favourites yet</li>'}</ul>
        <p class="hint">↑↓ choose · Enter go · P postcode · Esc close</p>`;
      return;
    }

    if (this.mode === 'postcode') {
      this.root.innerHTML = `
        <h2>Enter postcode</h2>
        <div class="postcode-entry">${escapeHtml(this.postcodeText) || '<span class="ph">e.g. S1 2HH</span>'}</div>
        ${this.message ? `<p class="error">${escapeHtml(this.message)}</p>` : ''}
        <p class="hint">type · Enter look up · Esc back</p>`;
      return;
    }

    // confirm
    const name = this.pending ? escapeHtml(this.pending.name) : '';
    this.root.innerHTML = `
      <h2>Route to ${name}?</h2>
      <p class="confirm-note">Postcode is street-level — check the marked area on the map.</p>
      <p class="hint">Enter confirm · Esc back</p>`;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}
