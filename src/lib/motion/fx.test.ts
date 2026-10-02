import { describe, expect, it } from 'vitest';
import { burst, cameraTransform, comet, decode, flash, ring, scramble, shakeAt, slam, svgText } from './fx';
import { pop, round2, span, springOut } from './math';

const VB = { x: -50, y: -50, w: 600, h: 400 };

describe('math additions', () => {
  it('span maps t into [0, 1] between a and b', () => {
    expect(span(1, 0, 2)).toBe(0.5);
    expect(span(-1, 0, 2)).toBe(0);
    expect(span(3, 0, 2)).toBe(1);
  });
  it('springOut is exactly zero after 1.2 s and pop settles at 1', () => {
    expect(springOut(1.21, 0.8)).toBe(0);
    expect(pop(0)).toBe(0);
    expect(pop(2)).toBe(1);
  });
  it('round2 keeps two decimals without trailing zeros', () => {
    expect(round2(1.234)).toBe('1.23');
    expect(round2(1.236)).toBe('1.24');
    expect(round2(2)).toBe('2');
    expect(round2(-0.5)).toBe('-0.5');
  });
});

describe('effects are silent outside their window', () => {
  it('ring, burst, flash and comet return nothing before or after', () => {
    expect(ring(0, 0, -0.1, 0.5, 4, 20, '#F0EDE6')).toBe('');
    expect(ring(0, 0, 0.6, 0.5, 4, 20, '#F0EDE6')).toBe('');
    expect(burst(0, 0, 1, 2, 1, '#61DAFB')).toBe('');
    expect(burst(0, 0, 9, 2, 1, '#61DAFB')).toBe('');
    expect(flash(0.5, 0.2, VB)).toBe('');
    expect(comet(() => [0, 0], 0.1, 0.2, '#3FA7C0')).toBe('');
  });
  it('a ring mid-flight draws one circle', () => {
    expect(ring(10, 20, 0.25, 0.5, 4, 20, '#F0EDE6')).toMatch(/^<circle cx="10" cy="20" r="[\d.]+"/);
  });
});

describe('text effects', () => {
  it('decode resolves to the text and starts empty', () => {
    expect(decode('srv-014', 1, 3, 0.4)).toBe('srv-014');
    expect(decode('srv-014', 0, 3, 0.4)).toBe('');
  });
  it('scramble keeps the length and resolves at the end', () => {
    expect(scramble('member.offboarded', 0.3, 7, 0.6)).toHaveLength(17);
    expect(scramble('member.offboarded', 1, 7, 0.6)).toBe('member.offboarded');
  });
  it('slam settles to plain text after 1.2 s', () => {
    expect(slam(10, 20, 'LEVEL 1', 9, '#8590A2', 3, 1)).toBe(svgText(10, 20, 'LEVEL 1', 9, '#8590A2'));
  });
});

describe('camera', () => {
  const keys = [{ t: 0, x: 44, y: 150, s: 2 }, { t: 1, x: 250, y: 150, s: 1 }];
  it('is empty once settled at the vb centre with no shake', () => {
    expect(cameraTransform([{ t: 0, x: 250, y: 150, s: 1 }], 2, VB)).toBe('');
  });
  it('clamps the view inside the vb while zoomed', () => {
    // At s = 2 the view is 300 x 200, so its centre x is clamped to at least -50 + 150 = 100; y = 150 is already inside [50, 250].
    expect(cameraTransform(keys, 0, VB)).toBe('translate(250 150) scale(2.0000) translate(-100 -150)');
  });
  it('shakeAt decays from each hit', () => {
    expect(shakeAt(0.5, [1])).toBe(0);
    expect(shakeAt(1, [1], 2)).toBe(2);
    expect(shakeAt(1.5, [1], 2)).toBeLessThan(0.1);
  });
});
