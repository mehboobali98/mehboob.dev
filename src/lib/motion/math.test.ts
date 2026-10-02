import { describe, expect, it } from 'vitest';
import { clamp, easeIn, easeInOut, easeOut, hash, lerp, mix, spring } from './math';

describe('math', () => {
  it('clamps to the unit range by default and to explicit bounds', () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(2)).toBe(1);
    expect(clamp(5, 0, 3)).toBe(3);
  });

  it('interpolates linearly', () => {
    expect(lerp(10, 20, 0.25)).toBe(12.5);
  });

  it('eases from 0 to 1 and clamps outside the range', () => {
    for (const ease of [easeOut, easeInOut, (p: number) => easeIn(p)]) {
      expect(ease(0)).toBe(0);
      expect(ease(1)).toBe(1);
      expect(ease(-3)).toBe(0);
      expect(ease(4)).toBe(1);
    }
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 10);
    expect(easeIn(0.5, 2)).toBeCloseTo(0.25, 10);
  });

  it('springs from the full amplitude and settles to zero', () => {
    expect(spring(-0.2, 7)).toBe(7);
    expect(spring(0, 7)).toBe(7);
    expect(Math.abs(spring(3, 7))).toBeLessThan(0.001);
  });

  it('mixes hex colours and clamps the ratio', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mix('#E0A84E', '#F0EDE6', 0)).toBe('#e0a84e');
    expect(mix('#E0A84E', '#F0EDE6', 9)).toBe('#f0ede6');
  });

  it('hashes deterministically into [0, 1)', () => {
    expect(hash(3, 4)).toBe(hash(3, 4));
    expect(hash(3, 4)).not.toBe(hash(4, 3));
    for (let i = 0; i < 200; i++) {
      const v = hash(i, i * 7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
