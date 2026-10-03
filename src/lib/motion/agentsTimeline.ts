import { agents, rail as RAIL, wall as WALL } from '../../data/agentsDiagram';
import { bloom, burst, cameraTransform, comet, easeInFx, flash, ring, shakeAt, svgText, type CameraKey, type ViewBox } from './fx';
import { clamp, easeInOut, easeOut, hash, lerp, mix, pop, round2 as f, span, springOut } from './math';
import type { Layout, Timeline } from './overlay';

type Box = { x: number; y: number; w: number; h: number };

const C = { void: '#07090C', surface: '#202834', line: '#404A5A', lineStrong: '#556274', quiet: '#8590A2', paper: '#F0EDE6', signal: '#E0A84E' };

/** Beats in seconds: audit, spec stamp, strike, estimate, code scan, bundle, drop, wall hit, validator lock, end. */
export const BEATS = {
  A0: 0.12, DOC0: 0.25, DOC1: 0.45, SCAN0: 0.5, SCAN1: 0.85, STAMP: 0.9, STRIKE0: 0.98, STRIKE1: 1.1, SUCK0: 1.12, SUCK1: 1.26, G0: 1.22, G1: 1.42, E0: 1.42,
  CODE0: 1.48, CODE1: 2.1, FORGE0: 2.08, BUNDLE: 2.3, D0: 2.42, HIT: 2.72, V1: 3.0, LOCK0: 3.0, LOCK1: 3.35, END: 4.4,
} as const;

/** Where the spec card and the code panel sit, in the diagram's units, per layout. */
export const cards: Record<Layout, { doc: Box; panel: Box }> = {
  desktop: { doc: { x: 292, y: -6, w: 50, h: 32 }, panel: { x: 258, y: 34, w: 136, h: 36 } },
  phone: { doc: { x: 168, y: -12, w: 50, h: 32 }, panel: { x: 118, y: 39, w: 150, h: 23 } },
};

const B = BEATS;
const WIDTH = 248;
const [AUD, EST, VAL] = agents.map((a) => a.y);
const DOTS0 = EST + 11;
const DOTS1 = WALL - 9;
const HOURS = agents[0].note.indexOf('hours');

const settled = (v: number, eps = 0.02): number => (v < eps ? 0 : v);
const blend = (a: string, b: string, p: number): string => (p <= 0 ? a : p >= 1 ? b : mix(a, b, p));

const solidRail = (g: number): string => `<path d="M${RAIL} ${AUD} L${RAIL} ${f(lerp(AUD, EST, g))}" stroke="${C.signal}" stroke-width="2"/>`;
const dottedRail = (stroke: string): string => `<path d="M${RAIL} ${DOTS0} L${RAIL} ${DOTS1}" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-dasharray="0.5 6"/>`;
const wallPath = (stroke: string): string => `<path d="M0 ${WALL} L${WIDTH} ${WALL}" stroke="${stroke}" stroke-width="1.5" stroke-dasharray="7 5"/>`;
const litDot = (y: number, r: number, lit: number): string => `<circle cx="${RAIL}" cy="${y}" r="${f(r)}" fill="${blend(C.surface, C.signal, lit)}" stroke="${C.lineStrong}" stroke-width="${f(1.5 * (1 - lit))}"/>`;
const openDot = (y: number, r: number): string => `<circle cx="${RAIL}" cy="${y}" r="${f(r)}" fill="${C.surface}" stroke="${C.paper}" stroke-width="1.5"/>`;
const labels = (i: number): string => svgText(30, agents[i].y + 5, agents[i].name, 14, C.paper) + svgText(30, agents[i].y + 24, agents[i].note, 13, C.quiet);

function view(t: number, vb: ViewBox): string {
  const cx = vb.x + vb.w / 2;
  const cy = vb.y + vb.h / 2;
  const keys: CameraKey[] = [
    { t: 0, x: cx, y: cy, s: 1 },
    { t: B.D0, x: cx, y: cy, s: 1 },
    { t: B.HIT - 0.04, x: 110, y: 97, s: 1.18 },
    { t: B.HIT + 0.35, x: 110, y: 100, s: 1.14 },
    { t: B.LOCK1 + 0.3, x: cx, y: cy, s: 1 },
  ];
  const sh = settled(shakeAt(t, [B.HIT], 2.2, 9) + shakeAt(t, [B.A0, B.E0], 0.7));
  const punch = settled(t > B.HIT ? 0.07 * Math.exp(-(t - B.HIT) * 8) : 0, 1e-4);
  const tf = cameraTransform(keys, t, vb, sh);
  if (!punch) return tf;
  return `translate(${f(cx)} ${f(cy)}) scale(${(1 + punch).toFixed(4)}) translate(${f(-cx)} ${f(-cy)}) ${tf}`.trim();
}

function specCard(t: number, doc: Box, vb: ViewBox): string {
  if (t <= B.DOC0 || t >= B.SUCK1) return '';
  const fly = easeOut(span(t, B.DOC0, B.DOC1));
  const suck = easeInFx(span(t, B.SUCK0, B.SUCK1));
  const x = lerp(lerp(vb.x + vb.w + 20, doc.x, fly), RAIL - 6, suck);
  const y = lerp(doc.y, 26, suck);
  const lines = [30, 22, 34, 18].map((w, k) => `<rect x="6" y="${f(6 + k * 5.5)}" width="${w}" height="1.8" rx="0.9" fill="${blend(C.lineStrong, C.signal, span(t, B.SCAN0 + k * 0.08, B.SCAN0 + 0.08 + k * 0.08))}"/>`).join('');
  let stamp = '';
  if (t > B.STAMP) {
    const v = t - B.STAMP;
    stamp = `<g transform="translate(40 22) scale(${(1 + springOut(v * 1.2, 1.2)).toFixed(3)})" opacity="${f(clamp(v / 0.04))}"><circle r="7" fill="${C.void}" stroke="${C.signal}" stroke-width="1.2"/><path d="M-3.2 0.2 L-0.8 2.6 L3.4 -2.4" fill="none" stroke="${C.signal}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  }
  let scan = '';
  if (t > B.SCAN0 && t < B.SCAN1) {
    const sx = 3 + 44 * easeInOut(span(t, B.SCAN0, B.SCAN1));
    scan = `<line x1="${f(sx)}" y1="2" x2="${f(sx)}" y2="30" stroke="${C.signal}" stroke-width="1.2"/><rect x="${f(sx - 10)}" y="1" width="10" height="30" fill="${C.signal}" opacity="0.15"/>`;
  }
  let s = `<g transform="translate(${f(x)} ${f(y)}) scale(${lerp(1, 0.2, suck).toFixed(3)})" opacity="${f(1 - suck * 0.6)}"><rect width="${doc.w}" height="${doc.h}" rx="3" fill="${C.void}" stroke="${C.lineStrong}" stroke-width="1"/>${lines}${scan}${stamp}</g>`;
  if (t < B.DOC1 + 0.05) s += comet((tt) => [lerp(vb.x + vb.w + 20, doc.x, easeOut(span(tt, B.DOC0, B.DOC1))), doc.y + 16], t, B.DOC0, C.lineStrong, { len: 0.08, n: 8, head: 1.5, glow: 4, core: C.quiet });
  if (t > B.SCAN0 && t < B.SCAN1) s += `<line x1="${RAIL + 6}" y1="${AUD}" x2="${doc.x}" y2="${f(doc.y + 16)}" stroke="${C.signal}" stroke-width="0.8" stroke-dasharray="2 3" opacity="${f(0.7 * Math.sin(Math.PI * span(t, B.SCAN0, B.SCAN1)))}"/>`;
  return s;
}

function codePanel(t: number, p: Box): string {
  if (t <= B.CODE0 - 0.1 || t >= B.FORGE0 + 0.3) return '';
  const o = Math.min(span(t, B.CODE0 - 0.1, B.CODE0 + 0.05), 1 - span(t, B.FORGE0 + 0.05, B.FORGE0 + 0.3));
  const scroll = Math.max(0, t - B.CODE0) * 46;
  const sx = p.x + 4 + (p.w - 8) * easeInOut(span(t, B.CODE0 + 0.15, B.CODE1));
  const rows: string[] = [];
  for (let r = 0; r < 14; r++) {
    const idx = r + Math.floor(scroll / 5);
    const yy = p.y + 7 + r * 5 - (scroll % 5);
    if (yy < p.y + 3 || yy > p.y + p.h - 4) continue;
    const w = 20 + 80 * hash(idx, 3);
    const indent = 6 + 8 * Math.floor(hash(idx, 4) * 3);
    const lit = t > B.CODE0 + 0.15 && sx > p.x + indent + w * 0.5;
    rows.push(`<rect x="${f(p.x + indent)}" y="${f(yy - 0.8)}" width="${f(w)}" height="1.6" rx="0.8" fill="${lit ? C.signal : C.line}"/>`);
  }
  const scan = t > B.CODE0 + 0.15 && t < B.CODE1 ? `<line x1="${f(sx)}" y1="${p.y + 2}" x2="${f(sx)}" y2="${p.y + p.h - 2}" stroke="${C.signal}" stroke-width="1.2"/><rect x="${f(sx - 14)}" y="${p.y + 1}" width="14" height="${p.h - 2}" fill="${C.signal}" opacity="0.14"/>` : '';
  let s = `<g opacity="${f(o)}"><rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="3" fill="${C.void}" stroke="${C.lineStrong}" stroke-width="1"/><clipPath id="fx-agents-clip"><rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="3"/></clipPath><g clip-path="url(#fx-agents-clip)">${rows.join('')}${scan}</g></g>`;
  if (t > B.E0 && t < B.CODE1) s += `<line x1="${RAIL + 6}" y1="${EST}" x2="${p.x}" y2="${p.y + p.h / 2}" stroke="${C.signal}" stroke-width="0.8" stroke-dasharray="2 3" opacity="${f(0.6 * o)}"/>`;
  return s;
}

function forge(t: number, p: Box): string {
  if (t <= B.FORGE0 || t >= B.BUNDLE + 0.05) return '';
  let s = '';
  for (let i = 0; i < 18; i++) {
    const k = easeInFx(span(t, B.FORGE0 + 0.12 * hash(i, 41), B.BUNDLE));
    if (k <= 0 || k >= 1) continue;
    const sx = p.x + 10 + (p.w - 20) * hash(i, 42);
    const sy = p.y + 6 + (p.h - 12) * hash(i, 43);
    s += `<circle cx="${f(lerp(sx, RAIL, k))}" cy="${f(lerp(sy, EST, k) - Math.sin(Math.PI * k) * 14 * hash(i, 44))}" r="${f(1.4 + k)}" fill="${i % 4 ? C.signal : C.paper}" opacity="${f(0.9 * Math.sin(Math.PI * Math.min(1, k * 1.1)))}"/>`;
  }
  return s;
}

const dropY = (t: number): number => (t < B.HIT ? lerp(EST, WALL, easeInFx(span(t, B.D0, B.HIT))) : lerp(WALL, VAL, easeOut(span(t, B.HIT, B.V1))));

function working(t: number): string {
  if (t <= B.BUNDLE || t >= B.LOCK1 + 0.2) return '';
  const hit = t - B.HIT;
  const y = t < B.D0 ? EST : dropY(t);
  const form = pop(t - B.BUNDLE);
  let s = '';
  if (t > B.D0 && t < B.V1) s += comet((tt) => [RAIL, dropY(tt)], t, B.D0, C.signal, { len: 0.1, n: 10, head: 0.1, glow: 6, core: C.signal });
  s += `<g opacity="${f(1 - span(t, B.LOCK1 - 0.1, B.LOCK1 + 0.15))}" transform="translate(${RAIL} ${f(y)}) scale(${form.toFixed(3)})"><rect x="-6.5" y="-4.5" width="13" height="9" rx="4.5" fill="${C.signal}"/><rect x="-3" y="-0.8" width="6" height="1.6" rx="0.8" fill="${C.void}"/></g>`;
  if (t < B.HIT) {
    [12, 8, 10].forEach((w, k) => {
      const ww = w * form;
      s += `<rect x="${f(RAIL - ww / 2)}" y="${f(y - 8.5 - k * 4.2 - 0.8)}" width="${f(ww)}" height="1.6" rx="0.8" fill="${C.quiet}" opacity="${f(0.95 - k * 0.2)}"/>`;
    });
  } else if (hit < 0.9) {
    for (let k = 0; k < 30; k++) {
      const a = -Math.PI * (0.04 + 0.5 * hash(k, 5));
      const v0 = 40 + 120 * hash(k, 9);
      const life = 0.5 + 0.4 * hash(k, 7);
      if (hit > life) continue;
      const x = RAIL + Math.cos(a) * v0 * hit;
      const yb = Math.min(WALL - 6 + Math.sin(a) * v0 * hit * 0.9 + 0.5 * 260 * hit * hit, WALL - 2);
      s += `<rect x="${f(x)}" y="${f(yb)}" width="${f(2 + 3.5 * hash(k, 2))}" height="1.5" rx="0.7" fill="${k % 5 ? C.quiet : C.paper}" opacity="${f(1 - hit / life)}" transform="rotate(${f(540 * hash(k, 4) * hit)} ${f(x)} ${f(yb)})"/>`;
    }
  }
  return s;
}

function lock(t: number): string {
  if (t <= B.LOCK0 - 0.05 || t >= B.LOCK1 + 0.35) return '';
  const v = easeOut(span(t, B.LOCK0, B.LOCK0 + 0.22));
  const o = 1 - span(t, B.LOCK1, B.LOCK1 + 0.35);
  const d = lerp(24, 10, v);
  const corner = (sx: number, sy: number): string =>
    `<path d="M${f(RAIL + sx * d)} ${f(VAL + sy * (d - 4))} L${f(RAIL + sx * d)} ${f(VAL + sy * d)} L${f(RAIL + sx * (d - 4))} ${f(VAL + sy * d)}" fill="none" stroke="${C.paper}" stroke-width="1.3"/>`;
  let s = `<g opacity="${f(o * clamp((t - B.LOCK0 + 0.05) / 0.08))}" transform="rotate(${f(45 * (1 - v))} ${RAIL} ${VAL})">${corner(-1, -1)}${corner(1, -1)}${corner(-1, 1)}${corner(1, 1)}</g>`;
  const rv = span(t, B.LOCK0 + 0.1, B.LOCK1);
  if (rv > 0 && rv < 1) s += `<circle cx="${RAIL}" cy="${VAL}" r="13" fill="none" stroke="${C.paper}" stroke-width="1.2" stroke-dasharray="${f(81.7 * rv)} 81.7" transform="rotate(${f(-90 + 360 * rv)} ${RAIL} ${VAL})" opacity="${f(0.9 * o)}"/>`;
  return s;
}

function draw(t: number, layout: Layout, vb: ViewBox): string {
  const { doc, panel } = cards[layout];
  const out: string[] = [];
  const g = easeOut(span(t, B.G0, B.G1));
  if (g > 0) out.push(solidRail(g));
  if (t > B.G0 && t < B.G1 + 0.4) out.push(`<path d="M${RAIL} ${AUD} L${RAIL} ${f(lerp(AUD, EST, g))}" stroke="${C.signal}" stroke-width="5" opacity="${f(0.5 * (1 - span(t, B.G1, B.G1 + 0.4)))}" filter="url(#fx-glow)"/>`);
  if (g > 0 && g < 1) out.push(comet((tt) => [RAIL, lerp(AUD, EST, easeOut(span(tt, B.G0, B.G1)))], t, B.G0, C.signal, { len: 0.08, n: 8, head: 2.6, glow: 8 }));
  out.push(dottedRail(blend(C.line, C.signal, span(t, B.BUNDLE - 0.15, B.BUNDLE))));

  const charge = t < B.HIT ? span(t, B.HIT - 0.2, B.HIT) : 0;
  const hit = t - B.HIT;
  const wallFlash = hit > 0 && hit < 0.8 ? Math.exp(-hit * 5) * (1 - hit / 0.8) : 0;
  if (charge > 0 || wallFlash > 0) out.push(`<path d="M${f(vb.x)} ${WALL} L${f(vb.x + vb.w)} ${WALL}" stroke="${C.paper}" stroke-width="5" stroke-dasharray="7 5" opacity="${f(0.35 * Math.max(charge, wallFlash))}" filter="url(#fx-glow)"/>`);
  out.push(wallPath(blend(C.lineStrong, C.paper, Math.max(0.7 * charge, 0.9 * wallFlash))));
  if (hit > 0 && hit < 0.7) {
    const v = hit / 0.7;
    for (const x1 of [vb.x + vb.w + 10, vb.x - 10]) {
      const x = lerp(RAIL, x1, easeOut(v));
      out.push(`<line x1="${f(lerp(RAIL, x, 0.6))}" y1="${WALL}" x2="${f(x)}" y2="${WALL}" stroke="${C.paper}" stroke-width="1.8" opacity="${f(0.9 * (1 - v))}"/><circle cx="${f(x)}" cy="${WALL}" r="5" fill="${C.paper}" opacity="${f(0.6 * (1 - v))}" filter="url(#fx-glow)"/>`);
    }
    for (let k = 0; k < 3; k++) {
      const u = clamp((hit - k * 0.07) / 0.45);
      if (u > 0 && u < 1) out.push(`<ellipse cx="${RAIL}" cy="${WALL}" rx="${f(6 + 50 * easeOut(u))}" ry="${f(2 + 9 * easeOut(u))}" fill="none" stroke="${C.signal}" stroke-width="${f(1.4 * (1 - u))}" opacity="${f(0.8 * (1 - u))}"/>`);
    }
  }

  agents.forEach((a, i) => {
    const at = i === 0 ? B.A0 : i === 1 ? B.E0 : B.V1;
    const u = t - at;
    if (i < 2) {
      const lit = span(t, at, at + 0.06);
      out.push(litDot(a.y, 5.5 * (lit > 0 ? 1 + springOut(u, 0.6) : 1), lit));
      out.push(ring(RAIL, a.y, u, 0.5, 6, 30, C.signal, 1.6, 0.9));
      out.push(bloom(RAIL, a.y, t, at, 12, C.signal, 0.8, 6));
      out.push(burst(RAIL, a.y, t, at, 11 + i, C.signal, { n: 12, speed: 70, grav: 40, life: 0.45, size: 1.3, spread: Math.PI * 1.3, dir: 0 }));
    } else {
      out.push(openDot(a.y, 5 * (u > 0 ? 1 + springOut(u, 0.5) : 1)));
      out.push(ring(RAIL, a.y, u, 0.5, 6, 16, C.paper, 1.3, 0.8));
    }
    out.push(labels(i));
  });

  out.push(specCard(t, doc, vb));
  const st = span(t, B.STRIKE0, B.STRIKE1);
  if (st > 0 && t < B.G1 + 0.4) {
    const x0 = 30 + HOURS * 7.8 - 1;
    const x1 = 30 + (HOURS + 5) * 7.8 + 1;
    const sy = AUD + 19.5;
    out.push(`<line x1="${f(x0)}" y1="${sy}" x2="${f(lerp(x0, x1, easeOut(st)))}" y2="${sy}" stroke="${C.signal}" stroke-width="1.6" opacity="${f(1 - span(t, B.G1, B.G1 + 0.4))}"/>`);
    out.push(burst(x1, sy, t, B.STRIKE1, 23, C.signal, { n: 8, speed: 50, grav: 50, life: 0.35, size: 1.1, spread: Math.PI, dir: 0 }));
  }
  out.push(codePanel(t, panel));
  out.push(forge(t, panel));
  out.push(bloom(RAIL, EST, t, B.BUNDLE, 14, C.signal, 0.8, 7));
  out.push(working(t));
  out.push(bloom(RAIL, WALL, t, B.HIT, 18, C.paper, 0.75, 6));
  out.push(lock(t));
  out.push(ring(RAIL, VAL, t - B.LOCK1, 0.5, 8, 40, C.paper, 1.6, 0.8));
  out.push(burst(RAIL, VAL, t, B.LOCK1, 51, C.paper, { n: 10, speed: 60, grav: 20, life: 0.4, size: 1.2 }));
  out.push(flash(t, B.HIT, vb, C.paper, 0.1, 0.07));
  out.push(flash(t, B.A0, vb, C.signal, 0.05, 0.08));

  if (layout === 'phone') return out.join('');
  const tf = view(t, vb);
  return tf ? `<g transform="${tf}">${out.join('')}</g>` : out.join('');
}

/** The settled diagram: both rails and the wall, then each agent's dot, name and note. */
export function staticFrame(_layout: Layout, _vb: ViewBox): string {
  return solidRail(1) + dottedRail(C.signal) + wallPath(C.lineStrong) + litDot(AUD, 5.5, 1) + labels(0) + litDot(EST, 5.5, 1) + labels(1) + openDot(VAL, 5) + labels(2);
}

/** The /estimate run: the auditor and estimator work in the open, the working shatters at the wall, the validator stays blind. */
export const timeline: Timeline = {
  duration: () => B.END,
  viewBoxWidth: () => WIDTH,
  draw: (t, layout, vb) => (t >= B.END ? staticFrame(layout, vb) : draw(t, layout, vb)),
};
