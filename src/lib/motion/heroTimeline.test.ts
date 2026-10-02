import { describe, expect, it } from 'vitest';
import { meshNodes, work } from '../../data/heroGraph';
import {
  DURATION, SPARK1, T0, T1, T_LAST, cameraAt, decode, edgeAt, focusAt, hitTimes, meshNodeAt,
  pathLength, pathPoint, progress, rippleAt, statFlare,
} from './heroTimeline';

describe('hero timeline', () => {
  it('reaches the four nodes in order between T0 and T1, the last at T1', () => {
    expect(hitTimes).toHaveLength(work.length);
    hitTimes.forEach((h, i) => {
      expect(h).toBeGreaterThan(T0);
      expect(h).toBeLessThanOrEqual(T1 + 1e-6);
      if (i > 0) expect(h).toBeGreaterThan(hitTimes[i - 1]);
    });
    expect(T_LAST).toBeCloseTo(T1, 2);
    expect(progress(T1)).toBe(1);
  });

  it('puts the path ends on the start node and the last work node', () => {
    expect(pathPoint(0)).toEqual({ x: 18, y: 392 });
    const end = pathPoint(pathLength);
    expect(end.x).toBeCloseTo(452, 6);
    expect(end.y).toBeCloseTo(150, 6);
  });

  it('settles into the static graph at the end', () => {
    const cam = cameraAt(DURATION);
    expect(cam.cx).toBeCloseTo(312, 6);
    expect(cam.cy).toBeCloseTo(235, 6);
    expect(cam.s).toBeCloseTo(1, 4);
    meshNodes.forEach(([x, y], k) => {
      const p = meshNodeAt(k, DURATION);
      expect(p.x).toBeCloseTo(x, 3);
      expect(p.y).toBeCloseTo(y, 3);
      expect(p.o).toBeCloseTo(1, 10);
    });
    expect(edgeAt(0, DURATION)).not.toBeNull();
    expect(focusAt(DURATION)).toBe(0);
    expect(rippleAt(DURATION, 100)).toBe(0);
  });

  it('starts the mesh faint and scattered, with no edges drawn', () => {
    expect(meshNodeAt(0, 0).o).toBeCloseTo(0.35, 6);
    expect(edgeAt(0, 0)).toBeNull();
  });

  it('dims the graph only between the spotlight and the impact', () => {
    expect(focusAt(1.9)).toBe(0);
    expect(focusAt(T_LAST - 0.01)).toBeGreaterThan(0.5);
    expect(focusAt(T_LAST + 0.2)).toBe(0);
  });

  it('flares the stat when the spark lands', () => {
    expect(statFlare(SPARK1 - 0.1)).toBe(0);
    expect(statFlare(SPARK1 + 0.05)).toBeCloseTo(1, 6);
    expect(statFlare(SPARK1 + 1.5)).toBeLessThan(0.02);
  });

  it('decodes a label to its real text after it lands, and shows nothing before', () => {
    expect(decode('sync', hitTimes[0] - 0.5, hitTimes[0], 1)).toBe('');
    expect(decode('sync', hitTimes[0] + 1, hitTimes[0], 1)).toBe('sync');
    expect(decode('sync', hitTimes[0] + 0.12, hitTimes[0], 1)).toHaveLength(4);
  });
});
