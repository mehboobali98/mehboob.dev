import { describe, expect, it } from 'vitest';
import { staticFrame, timeline } from './cmdbTimeline';

const VB = { desktop: { x: -54.1, y: -54.1, w: 620.2, h: 408.6 }, phone: { x: -19.48, y: -19.48, w: 338.96, h: 338.96 } } as const;

describe('CMDB timeline', () => {
  for (const layout of ['desktop', 'phone'] as const) {
    it(`${layout}: the last frame before the end equals the static graphic`, () => {
      expect(timeline.draw(timeline.duration(layout) - 0.02, layout, VB[layout])).toBe(staticFrame(layout, VB[layout]));
    });
    it(`${layout}: the comet is in flight mid-traversal`, () => {
      const t = layout === 'desktop' ? 2.6 : 2.4;
      expect(timeline.draw(t, layout, VB[layout])).toContain('url(#fx-glow)');
    });
    it(`${layout}: frames are deterministic`, () => {
      expect(timeline.draw(1.3, layout, VB[layout])).toBe(timeline.draw(1.3, layout, VB[layout]));
    });
  }
  it('desktop static frame has every node label', () => {
    const s = staticFrame('desktop', VB.desktop);
    for (const label of ['srv-014', 'SQL Server', 'LIC-2291', 'Microsoft', 'm.ali', 'INC-4821', 'HQ-Lahore', 'CTR-77', 'LEVEL 3', 'contract']) expect(s).toContain(`>${label}<`);
  });
});
