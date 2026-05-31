import { describe, it, expect } from 'vitest';
import { LocalFavouritesStore } from '../src/places/favourites';

/** In-memory Storage stand-in so the test needs no DOM. */
function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

describe('LocalFavouritesStore', () => {
  it('seeds defaults on first use and persists them', () => {
    const storage = fakeStorage();
    const store = new LocalFavouritesStore(storage);
    expect(store.list().length).toBeGreaterThan(0);
    // A second store over the same storage reads the persisted list.
    const reopened = new LocalFavouritesStore(storage);
    expect(reopened.list()).toEqual(store.list());
  });

  it('adds and removes favourites, persisting each change', () => {
    const storage = fakeStorage();
    const store = new LocalFavouritesStore(storage, []);
    const fav = store.add('Camp Site', { lng: -2, lat: 53 });
    expect(store.list()).toHaveLength(1);

    const reopened = new LocalFavouritesStore(storage);
    expect(reopened.list()[0]!.name).toBe('Camp Site');

    store.remove(fav.id);
    expect(store.list()).toHaveLength(0);
  });

  it('list returns a copy, not the internal array', () => {
    const store = new LocalFavouritesStore(fakeStorage(), []);
    store.add('A', { lng: 0, lat: 0 });
    const list = store.list();
    list.pop();
    expect(store.list()).toHaveLength(1);
  });
});
