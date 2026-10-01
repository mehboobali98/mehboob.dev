import { describe, expect, it } from 'vitest';
import {
  A0, A1, ARRIVE, DURATION, LANDED, REWIND1, afterFill, clockOpacity, countShown, crawl, hoursAt, letterAt, pingPhase, tailIn,
} from './syncTimeline';

describe('sync timeline', () => {
  it('crawls from 0 to 1 without ever going backwards, in stutters', () => {
    let prev = -1;
    for (let t = 0; t <= A1 + 0.1; t += 0.005) {
      const p = crawl(t);
      expect(p).toBeGreaterThanOrEqual(prev);
      prev = p;
    }
    expect(crawl(A0)).toBe(0);
    expect(crawl(A0 + 0.05)).toBe(0);
    expect(crawl(A1)).toBe(1);
  });

  it('counts to 12 hours, spins the clock to 13.5 and rewinds it to 0.8', () => {
    expect(countShown(0)).toBe(0);
    expect(countShown(A1)).toBe(12);
    expect(hoursAt(A1)).toBeCloseTo(13.5, 6);
    expect(hoursAt(REWIND1)).toBeCloseTo(0.8, 6);
  });

  it('moves the unit before the tail appears', () => {
    expect(tailIn(A1)).toEqual({ unit: 0, tail: 0 });
    const mid = tailIn(A1 + 0.1);
    expect(mid.unit).toBeGreaterThan(0.4);
    expect(mid.tail).toBe(0);
    expect(tailIn(A1 + 0.3)).toEqual({ unit: 1, tail: 1 });
  });

  it('pings only during the waits of the slow run', () => {
    expect(pingPhase(0.1)).toBeNull();
    expect(pingPhase(A0 + 0.01)).not.toBeNull();
    expect(pingPhase(A1 + 0.1)).toBeNull();
  });

  it('fills the after bar in four beats and lands the letters', () => {
    expect(afterFill(ARRIVE[0] - 0.01)).toBe(0);
    expect(afterFill(ARRIVE[1] + 0.07)).toBeCloseTo(0.5, 6);
    expect(afterFill(LANDED + 0.2)).toBe(1);
    expect(letterAt(0, LANDED - 0.01)).toEqual({ o: 0, y: 1 });
    const settled = letterAt(6, DURATION);
    expect(settled.o).toBe(1);
    expect(Math.abs(settled.y)).toBeLessThan(0.01);
  });

  it('shows the clock only between its entrance and exit', () => {
    expect(clockOpacity(0)).toBe(0);
    expect(clockOpacity(1)).toBe(1);
    expect(clockOpacity(DURATION)).toBe(0);
  });
});
