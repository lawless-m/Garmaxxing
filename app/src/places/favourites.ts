import type { LngLat } from '../gps/geo';

/** A saved place: campsite, aire, fuel, LPG, home. */
export interface Favourite {
  id: string;
  name: string;
  coord: LngLat;
}

/** Persistence for favourites. Writes are infrequent (only when editing), so
 * the SD card stays happy — bulk data is read-only (03-nav-app.md). */
export interface FavouritesStore {
  list(): Favourite[];
  add(name: string, coord: LngLat): Favourite;
  remove(id: string): void;
}

const STORAGE_KEY = 'garmaxxing:favourites';

/** Favourites backed by localStorage (the app's small writeable store). */
export class LocalFavouritesStore implements FavouritesStore {
  private readonly storage: Storage;
  private items: Favourite[];

  constructor(storage: Storage = window.localStorage, seed: Favourite[] = DEFAULT_FAVOURITES) {
    this.storage = storage;
    this.items = this.read() ?? seed;
    if (this.read() === null) this.write();
  }

  list(): Favourite[] {
    return [...this.items];
  }

  add(name: string, coord: LngLat): Favourite {
    const fav: Favourite = { id: makeId(), name: name.trim(), coord };
    this.items.push(fav);
    this.write();
    return fav;
  }

  remove(id: string): void {
    this.items = this.items.filter((f) => f.id !== id);
    this.write();
  }

  private read(): Favourite[] | null {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Favourite[]) : null;
    } catch {
      return null;
    }
  }

  private write(): void {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(this.items));
  }
}

function makeId(): string {
  return `fav_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Seeded favourites so a fresh install has somewhere to go. */
export const DEFAULT_FAVOURITES: Favourite[] = [
  { id: 'fav_home', name: 'Home', coord: { lng: -1.4699, lat: 53.3811 } },
  { id: 'fav_derby', name: 'Derby (Markeaton aire)', coord: { lng: -1.4746, lat: 52.9226 } },
];
