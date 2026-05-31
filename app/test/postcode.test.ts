import { describe, it, expect } from 'vitest';
import {
  normalisePostcode,
  looksLikePostcode,
  DemoPostcodeLookup,
} from '../src/places/postcode';
import { resolvePostcode, formatPostcode } from '../src/places/destination';

describe('normalisePostcode', () => {
  it('upper-cases and strips spaces', () => {
    expect(normalisePostcode('eh8 9yl')).toBe('EH89YL');
    expect(normalisePostcode('  s1   2hh ')).toBe('S12HH');
  });
});

describe('looksLikePostcode', () => {
  it('accepts valid GB formats', () => {
    expect(looksLikePostcode('S1 2HH')).toBe(true);
    expect(looksLikePostcode('EH8 9YL')).toBe(true);
    expect(looksLikePostcode('SW1A 1AA')).toBe(true);
    expect(looksLikePostcode('m11ae')).toBe(true);
  });
  it('rejects nonsense', () => {
    expect(looksLikePostcode('hello')).toBe(false);
    expect(looksLikePostcode('12345')).toBe(false);
    expect(looksLikePostcode('')).toBe(false);
  });
});

describe('formatPostcode', () => {
  it('inserts the conventional single space', () => {
    expect(formatPostcode('eh89yl')).toBe('EH8 9YL');
    expect(formatPostcode('SW1A1AA')).toBe('SW1A 1AA');
  });
});

describe('DemoPostcodeLookup', () => {
  it('resolves a known postcode regardless of spacing/case', async () => {
    const lookup = new DemoPostcodeLookup();
    const a = await lookup.resolve('S1 2HH');
    const b = await lookup.resolve('s12hh');
    expect(a).not.toBeNull();
    expect(a).toEqual(b);
  });
  it('returns null for an unknown postcode', async () => {
    expect(await new DemoPostcodeLookup().resolve('ZZ1 1ZZ')).toBeNull();
  });
});

describe('resolvePostcode', () => {
  const lookup = new DemoPostcodeLookup();

  it('resolves a valid, known postcode to a destination', async () => {
    const r = await resolvePostcode('s1 2hh', lookup);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.destination.source).toBe('postcode');
      expect(r.destination.name).toBe('S1 2HH');
      expect(r.destination.coord.lat).toBeCloseTo(53.3811, 3);
    }
  });

  it('flags invalid input before looking up', async () => {
    const r = await resolvePostcode('nonsense', lookup);
    expect(r).toEqual({ ok: false, reason: 'invalid-postcode' });
  });

  it('flags a valid-but-unknown postcode as not-found', async () => {
    const r = await resolvePostcode('ZZ1 1ZZ', lookup);
    expect(r).toEqual({ ok: false, reason: 'not-found' });
  });
});
