import { describe, expect, it } from 'vitest';
import { cards, staticFrame, timeline } from './agentsTimeline';

const VB = { desktop: { x: -17.6, y: -17.6, w: 418, h: 181.2 }, phone: { x: -17.6, y: -17.6, w: 290, h: 181.2 } } as const;

describe('validator timeline', () => {
  for (const layout of ['desktop', 'phone'] as const) {
    it(`${layout}: the last frame before the end equals the static graphic`, () => {
      expect(timeline.draw(timeline.duration(layout) - 0.02, layout, VB[layout])).toBe(staticFrame(layout, VB[layout]));
    });
    it(`${layout}: the working shatters at the wall`, () => {
      const at = timeline.draw(2.8, layout, VB[layout]);
      expect((at.match(/<rect /g) ?? []).length).toBeGreaterThan(10);
    });
    it(`${layout}: the spec card and code panel stay inside the card`, () => {
      const { doc, panel } = cards[layout];
      const right = VB[layout].x + VB[layout].w;
      expect(doc.x + doc.w).toBeLessThanOrEqual(right);
      expect(panel.x + panel.w).toBeLessThanOrEqual(right);
    });
  }
});
