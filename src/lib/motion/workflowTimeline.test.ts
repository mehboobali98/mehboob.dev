import { describe, expect, it } from 'vitest';
import { staticFrame, timeline } from './workflowTimeline';

const VB = { desktop: { x: -24.55, y: -24.55, w: 525.09, h: 209.07 }, phone: { x: -19.48, y: -19.48, w: 338.96, h: 345 } } as const;

describe('workflow timeline', () => {
  for (const layout of ['desktop', 'phone'] as const) {
    it(`${layout}: the last frame before the end equals the static graphic`, () => {
      expect(timeline.draw(timeline.duration(layout) - 0.02, layout, VB[layout])).toBe(staticFrame(layout, VB[layout]));
    });
    it(`${layout}: the condition shows its true verdict`, () => {
      const t = layout === 'desktop' ? 1.7 : 1.6;
      expect(timeline.draw(t, layout, VB[layout])).toContain('>true<');
    });
    it(`${layout}: the 200 chip appears after the response`, () => {
      const t = layout === 'desktop' ? 2.9 : 2.8;
      expect(timeline.draw(t, layout, VB[layout])).toContain('>200<');
    });
  }
  it('the static frame lights only the trigger and the connector', () => {
    const s = staticFrame('desktop', VB.desktop);
    expect(s.match(/stroke="#61DAFB"/g)).toHaveLength(2);
    for (const label of ['TRIGGER', 'CONDITION', 'CONNECTOR', 'ACTION', 'member.offboarded', 'status = inactive', 'Entra: update user', 'open ticket']) expect(s).toContain(`>${label}<`);
  });
});
