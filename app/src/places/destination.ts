import type { LngLat } from '../gps/geo';
import type { PostcodeLookup } from './postcode';
import { looksLikePostcode, normalisePostcode } from './postcode';

/** A resolved place ready to route to. */
export interface Destination {
  name: string;
  coord: LngLat;
  /** How it was chosen — drives the "confirm resolved area" UX for postcodes. */
  source: 'favourite' | 'postcode';
}

export type ResolveResult =
  | { ok: true; destination: Destination }
  | { ok: false; reason: 'invalid-postcode' | 'not-found' };

/**
 * Resolve typed text to a destination via the postcode table. Favourites are
 * resolved directly from the store (they already carry coordinates), so this
 * only handles the postcode fallback — the one piece that needs a lookup.
 */
export async function resolvePostcode(
  text: string,
  lookup: PostcodeLookup,
): Promise<ResolveResult> {
  if (!looksLikePostcode(text)) {
    return { ok: false, reason: 'invalid-postcode' };
  }
  const coord = await lookup.resolve(text);
  if (coord === null) {
    return { ok: false, reason: 'not-found' };
  }
  return {
    ok: true,
    destination: { name: formatPostcode(text), coord, source: 'postcode' },
  };
}

/** Present a postcode with its conventional single space (e.g. "EH8 9YL"). */
export function formatPostcode(raw: string): string {
  const pc = normalisePostcode(raw);
  if (pc.length < 5) return pc;
  return `${pc.slice(0, pc.length - 3)} ${pc.slice(pc.length - 3)}`;
}
