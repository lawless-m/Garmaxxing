import type { LngLat } from '../gps/geo';

/**
 * Normalise a postcode to the key used in postcodes.sqlite: upper-case, no
 * whitespace. Mirrors the Rust loader's normalise_postcode so the app's
 * queries hit the table's primary key exactly (e.g. "eh8 9yl" → "EH89YL").
 */
export function normalisePostcode(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase();
}

/** Basic shape check for a UK postcode (outward + inward). Forgiving on input
 * spacing; rejects obvious non-postcodes before we bother the lookup. */
export function looksLikePostcode(raw: string): boolean {
  const pc = normalisePostcode(raw);
  // Inward code is always digit + two letters; outward is 2–4 chars.
  return /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(pc);
}

/** Resolves a postcode to a coordinate. Backed by SQLite in the van, or a
 * small in-memory table for the demo. */
export interface PostcodeLookup {
  /** Resolve a postcode, or null if it isn't in the table. */
  resolve(postcode: string): Promise<LngLat | null>;
}

/** A small fixed lookup for the sandbox/demo (no SQLite file needed). */
export class DemoPostcodeLookup implements PostcodeLookup {
  private readonly table: Map<string, LngLat>;

  constructor(entries: Record<string, LngLat> = DEMO_POSTCODES) {
    this.table = new Map(
      Object.entries(entries).map(([pc, ll]) => [normalisePostcode(pc), ll]),
    );
  }

  async resolve(postcode: string): Promise<LngLat | null> {
    return this.table.get(normalisePostcode(postcode)) ?? null;
  }
}

/** A handful of real GB postcodes around the demo track for sandbox routing. */
export const DEMO_POSTCODES: Record<string, LngLat> = {
  'S1 2HH': { lng: -1.4699, lat: 53.3811 }, // Sheffield centre
  'S3 8GG': { lng: -1.4905, lat: 53.3934 },
  'DE1 2NB': { lng: -1.4746, lat: 52.9226 }, // Derby
  'NG1 5DT': { lng: -1.1496, lat: 52.9536 }, // Nottingham
};
