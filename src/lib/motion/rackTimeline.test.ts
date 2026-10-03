import { describe, expect, it } from 'vitest';
import { staticFrame, timeline } from './rackTimeline';

const VB = { desktop: { x: -99.4, y: -56, w: 658.8, h: 390 }, phone: { x: -24, y: -20, w: 348, h: 318 } } as const;

describe('rack timeline', () => {
  for (const layout of ['desktop', 'phone'] as const) {
    it(`${layout}: the last frame before the end equals the static graphic`, () => {
      expect(timeline.draw(timeline.duration(layout) - 0.02, layout, VB[layout])).toBe(staticFrame(layout, VB[layout]));
    });
    it(`${layout}: the collision hatches the firewall`, () => {
      expect(timeline.draw(1.1, layout, VB[layout])).toContain('url(#fx-hatch)');
    });
    it(`${layout}: the cursor is gone by the end`, () => {
      expect(timeline.draw(timeline.duration(layout) - 0.02, layout, VB[layout])).not.toContain('L10.6 9.6');
    });
  }
  it('the desktop static frame ends with the drop path and its dot', () => {
    expect(staticFrame('desktop', VB.desktop)).toMatch(/<path d="M140 48 C201 48 201 150 262 150"[^>]*\/><circle cx="262" cy="150" r="3" fill="#61DAFB"\/>$/);
  });
});
