// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { DestinationPanel } from '../src/ui/destinationPanel';
import { LocalFavouritesStore } from '../src/places/favourites';
import { DemoPostcodeLookup } from '../src/places/postcode';
import type { Destination } from '../src/places/destination';

function key(k: string): KeyboardEvent {
  return new KeyboardEvent('keydown', { key: k });
}

/** Let the panel's fire-and-forget async lookup chain settle. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function setup() {
  const confirmed: Destination[] = [];
  const favourites = new LocalFavouritesStore(makeStorage(), [
    { id: 'a', name: 'Alpha', coord: { lng: 0, lat: 0 } },
    { id: 'b', name: 'Bravo', coord: { lng: 1, lat: 1 } },
  ]);
  const panel = new DestinationPanel({
    favourites,
    postcodes: new DemoPostcodeLookup(),
    onConfirm: (d) => confirmed.push(d),
  });
  return { panel, confirmed };
}

function makeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, v),
  };
}

describe('DestinationPanel', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('ignores keys while closed', () => {
    const { panel } = setup();
    expect(panel.handleKey(key('ArrowDown'))).toBe(false);
  });

  it('selects a favourite with arrows + Enter and routes immediately', () => {
    const { panel, confirmed } = setup();
    panel.show();
    expect(panel.handleKey(key('ArrowDown'))).toBe(true); // → Bravo
    expect(panel.handleKey(key('Enter'))).toBe(true);
    expect(confirmed).toHaveLength(1);
    expect(confirmed[0]!.name).toBe('Bravo');
    expect(confirmed[0]!.source).toBe('favourite');
    expect(panel.isOpen()).toBe(false); // favourites close the panel on confirm
  });

  it('does not move the selection past the ends', () => {
    const { panel, confirmed } = setup();
    panel.show();
    panel.handleKey(key('ArrowUp')); // already at top
    panel.handleKey(key('Enter'));
    expect(confirmed[0]!.name).toBe('Alpha');
  });

  it('requires a confirm step for postcodes (street-level)', async () => {
    const { panel, confirmed } = setup();
    panel.show();
    panel.handleKey(key('p')); // → postcode entry
    for (const ch of 'S12HH') panel.handleKey(key(ch));
    panel.handleKey(key('Enter')); // resolve → confirm mode
    await flush(); // let the async lookup settle
    expect(confirmed).toHaveLength(0); // not routed yet
    panel.handleKey(key('Enter')); // confirm
    expect(confirmed).toHaveLength(1);
    expect(confirmed[0]!.source).toBe('postcode');
    expect(confirmed[0]!.name).toBe('S1 2HH');
  });

  it('shows an error for an invalid postcode and does not route', async () => {
    const { panel, confirmed } = setup();
    panel.show();
    panel.handleKey(key('p'));
    for (const ch of 'XYZ') panel.handleKey(key(ch));
    panel.handleKey(key('Enter'));
    await flush();
    expect(confirmed).toHaveLength(0);
    expect(document.querySelector('.dest-panel .error')?.textContent).toMatch(/valid/i);
  });

  it('closes on Escape from the favourites list', () => {
    const { panel } = setup();
    panel.show();
    expect(panel.isOpen()).toBe(true);
    panel.handleKey(key('Escape'));
    expect(panel.isOpen()).toBe(false);
  });
});
