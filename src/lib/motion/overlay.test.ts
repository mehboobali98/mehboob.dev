import { describe, expect, it } from 'vitest';
import { overlayBox } from './overlay';

describe('overlayBox', () => {
  it('maps the host padding box into the graphic units', () => {
    const vb = overlayBox({ left: 77, top: 1557, width: 530 }, { left: 21, top: 1501, width: 642, height: 423 }, 512);
    const k = 530 / 512;
    expect(vb.x).toBeCloseTo(-56 / k, 3);
    expect(vb.y).toBeCloseTo(-56 / k, 3);
    expect(vb.w).toBeCloseTo(642 / k, 3);
    expect(vb.h).toBeCloseTo(423 / k, 3);
  });
  it('is the identity when the graphic fills the host at scale 1', () => {
    expect(overlayBox({ left: 0, top: 0, width: 248 }, { left: 0, top: 0, width: 248, height: 146 }, 248)).toEqual({ x: 0, y: 0, w: 248, h: 146 });
  });
});
