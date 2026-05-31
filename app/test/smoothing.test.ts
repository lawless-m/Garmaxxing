import { describe, it, expect } from 'vitest';
import { HeadingSmoother } from '../src/gps/smoothing';

describe('HeadingSmoother', () => {
  it('returns null before any moving sample', () => {
    const s = new HeadingSmoother();
    expect(s.value).toBeNull();
    expect(s.update(90, 0)).toBeNull(); // stationary, frozen with no history
  });

  it('adopts the first moving heading directly', () => {
    const s = new HeadingSmoother({ alpha: 0.25, freezeBelowMps: 1.4 });
    expect(s.update(90, 10)).toBe(90);
  });

  it('eases toward a new heading rather than snapping', () => {
    const s = new HeadingSmoother({ alpha: 0.5, freezeBelowMps: 1.4 });
    s.update(0, 10);
    const next = s.update(90, 10);
    // Half-way along the shortest arc from 0 to 90.
    expect(next).toBeCloseTo(45, 5);
  });

  it('crosses north the short way (350 -> 10)', () => {
    const s = new HeadingSmoother({ alpha: 0.5, freezeBelowMps: 1.4 });
    s.update(350, 10);
    const next = s.update(10, 10)!;
    // Should land near 0, not swing down toward 180.
    expect(Math.min(next, 360 - next)).toBeLessThan(11);
  });

  it('freezes bearing below walking pace', () => {
    const s = new HeadingSmoother({ alpha: 0.5, freezeBelowMps: 1.4 });
    s.update(90, 10);
    const frozen = s.update(270, 0.2); // crawling: ignore the wild heading
    expect(frozen).toBe(90);
  });

  it('treats unknown speed as frozen', () => {
    const s = new HeadingSmoother();
    s.update(90, 10);
    expect(s.update(270, null)).toBe(90);
  });

  it('converges to a steady heading after several samples', () => {
    const s = new HeadingSmoother({ alpha: 0.3, freezeBelowMps: 1.4 });
    s.update(0, 10);
    for (let i = 0; i < 30; i++) s.update(120, 10);
    expect(s.value).toBeCloseTo(120, 1);
  });

  it('reset clears history', () => {
    const s = new HeadingSmoother();
    s.update(90, 10);
    s.reset();
    expect(s.value).toBeNull();
  });
});
