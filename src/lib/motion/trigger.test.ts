import { describe, expect, it } from 'vitest';
import { autoplayThreshold } from './trigger';

describe('autoplayThreshold', () => {
  it('is 0.4 for hosts shorter than the viewport', () => {
    expect(autoplayThreshold(400, 900)).toBe(0.4);
  });
  it('shrinks for hosts taller than the viewport so it can always be met', () => {
    expect(autoplayThreshold(1800, 900)).toBeCloseTo(0.2, 5);
  });
});
