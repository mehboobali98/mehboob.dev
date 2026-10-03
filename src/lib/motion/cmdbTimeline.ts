import { hops, mobileHops, mobileRelated, others, quietEdges } from '../../data/cmdbGraph';
import { along, bloom, burst, cameraTransform, comet, decode, easeInFx, flash, flow, ring, shakeAt, slam, svgText, type CameraKey, type ViewBox } from './fx';
import { easeInOut, easeOut, hash, lerp, mix, pop, round2 as f, span, springOut } from './math';
import type { Layout, Timeline } from './overlay';

type Point = [number, number];

const C = { ink: '#0F1319', surface: '#202834', line: '#404A5A', lineStrong: '#556274', quiet: '#8590A2', paper: '#F0EDE6', mysql: '#3FA7C0' };

/** Desktop beats in seconds: ignition, three expansions, the charge, the four hops and the end. */
export const DESKTOP = { IGN: 0.12, T1: 0.5, T2: 1.0, T3: 1.5, GROW: 0.3, CH0: 1.95, Q0: 2.4, HOP: [2.4, 2.64, 2.9, 3.15], Q1: 3.15, END: 4.6 } as const;

/** Phone beats in seconds, slightly tighter than desktop. */
export const PHONE = { IGN: 0.12, T1: 0.45, T2: 0.9, T3: 1.35, GROW: 0.28, CH0: 1.8, Q0: 2.2, HOP: [2.2, 2.42, 2.64, 2.86], Q1: 2.86, END: 4.2 } as const;

const D = DESKTOP;
const M = PHONE;
const P: Point[] = hops.map((h) => [h.x, h.y]);
const HOP_AT = [D.IGN, D.T1 + D.GROW, D.T2 + D.GROW, D.T3 + D.GROW];
const PATH_AT = [D.T1, D.T2, D.T3];
const EDGE_AT = [D.T1, D.T2, D.T1, D.T3, D.T2];
const OTHER_AT = [D.T1, D.T2, D.T1, D.T3].map((at) => at + D.GROW);
const EXPANDERS = [
  { n: hops[0], tier: hops[0].tier, hop: true, at: D.T1 },
  { n: hops[1], tier: hops[1].tier, hop: true, at: D.T2 },
  { n: others[0], tier: others[0].type, hop: false, at: D.T2 },
  { n: hops[2], tier: hops[2].tier, hop: true, at: D.T3 },
];
const CAM: CameraKey[] = [
  { t: 0, x: 44, y: 150, s: 2.1 },
  { t: 0.45, x: 60, y: 150, s: 1.95 },
  { t: 0.85, x: 115, y: 158, s: 1.45 },
  { t: 1.35, x: 200, y: 160, s: 1.18 },
  { t: 1.85, x: 256, y: 150, s: 1 },
  { t: D.CH0, x: 256, y: 150, s: 1 },
  { t: D.Q0, x: 74, y: 152, s: 1.75 },
];

const X0 = 16;
const MOBILE_AT = [M.IGN, M.T1 + M.GROW, M.T2 + M.GROW, M.T3 + M.GROW];
const SEG_AT = [M.T1, M.T2, M.T3];
const RELATED_AT = mobileRelated.map((r) => SEG_AT[r.hop]);

const settled = (v: number): number => (v < 0.02 ? 0 : v);

const pulse = (t: number, at: number): number => {
  const u = t - at;
  return u > 0 && u < 0.35 ? Math.sin((Math.PI * u) / 0.35) : 0;
};

const dot = (x: number, y: number, r: number, fill: string, stroke: string, sw: number, extra = ''): string =>
  `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}" stroke="${stroke}" stroke-width="${f(sw)}"${extra}/>`;

const relatedDot = (x: number, y: number, r: number, pu: number, sw: number, o: number): string =>
  dot(x, y, r + 1.5 * pu, mix(C.ink, C.paper, 0.5 * pu), mix(C.lineStrong, C.paper, pu), sw, ` opacity="${f(o)}"`);

const hopDot = (x: number, y: number, r: number, lit: number, pu: number, sw: number): string =>
  dot(x, y, r + 1.5 * pu, mix(mix(C.ink, C.mysql, lit), C.paper, 0.6 * pu), C.lineStrong, sw * (1 - lit));

const edgeLine = (x1: number, y1: number, x2: number, y2: number, pu: number, o: number): string =>
  `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${mix(C.line, C.paper, 0.8 * pu)}" stroke-width="${f(1 + pu)}" opacity="${f(o)}"/>`;

const pathEl = (pts: Point[], hot: number, width: number): string =>
  `<path d="${pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)},${f(y)}`).join(' ')}" fill="none" stroke="${mix(C.mysql, C.paper, hot)}" stroke-width="${f(width)}" stroke-linecap="round" stroke-linejoin="round"/>`;

const phonePath = (y: number, hot: number, width: number): string =>
  `<path d="M${X0},36 L${X0},${f(y)}" stroke="${mix(C.mysql, C.paper, hot)}" stroke-width="${f(width)}"/>`;

const growComet = (a: Point, b: Point, t: number, at: number, grow: number, head: number): string =>
  comet(
    (tt) => {
      const g = easeOut(span(tt, at, at + grow));
      return [lerp(a[0], b[0], g), lerp(a[1], b[1], g)];
    },
    t,
    at,
    C.paper,
    { len: 0.1, n: 10, head, glow: 7 },
  );

function expandCard(cx: number, x: number, top: number, w: number, h: number, v: number, s: number, inset: number, arm: number, sw: number): string {
  const cy = top + h / 2;
  const o = Math.sin(Math.PI * Math.min(1, v * 1.4)) * 0.95;
  return (
    `<g transform="translate(${f(cx)} ${f(cy)}) scale(${s.toFixed(3)}) translate(${f(-cx)} ${f(-cy)})" opacity="${f(o)}">` +
    `<rect x="${f(x)}" y="${f(top)}" width="${f(w)}" height="${h}" rx="5" fill="${C.surface}" fill-opacity="0.45" stroke="${C.paper}" stroke-width="1"/>` +
    `<g transform="translate(${f(x + w - inset)} ${f(top + inset)}) rotate(${f(90 * easeOut(v))})">` +
    `<line x1="${-arm}" y1="0" x2="${arm}" y2="0" stroke="${C.paper}" stroke-width="${sw}"/><line x1="0" y1="${-arm}" x2="0" y2="${arm}" stroke="${C.paper}" stroke-width="${sw}"/></g></g>`
  );
}

interface ChargeSize {
  n: number;
  r0: number;
  spread: number;
  ring: number;
  core: number;
}

function charge(x: number, y: number, t: number, from: number, to: number, size: ChargeSize): string {
  if (t <= from || t >= to + 0.05) return '';
  const c = span(t, from, to);
  let s = '';
  for (let i = 0; i < size.n; i++) {
    const a = hash(i, 31) * Math.PI * 2;
    const r0 = size.r0 + size.spread * hash(i, 32);
    const p = easeInFx(span(t, from + 0.25 * hash(i, 33), to));
    if (p <= 0 || p >= 1) continue;
    const r = r0 * (1 - p);
    s += `<line x1="${f(x + Math.cos(a) * r)}" y1="${f(y + Math.sin(a) * r)}" x2="${f(x + Math.cos(a) * (r + 6 + 10 * p))}" y2="${f(y + Math.sin(a) * (r + 6 + 10 * p))}" stroke="${i % 3 ? C.mysql : C.paper}" stroke-width="1.3" stroke-linecap="round" opacity="${f(0.9 * Math.sin(Math.PI * p))}"/>`;
  }
  for (let k = 0; k < 3; k++) {
    const v = span(t, from + k * 0.13, from + k * 0.13 + 0.3);
    if (v > 0 && v < 1) s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(size.ring * (1 - easeInFx(v)) + size.core)}" fill="none" stroke="${C.mysql}" stroke-width="1.2" opacity="${f(0.8 * v)}"/>`;
  }
  return s + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(size.core + 12 * c)}" fill="${C.mysql}" opacity="${f(0.7 * c)}" filter="url(#fx-glow)"/>`;
}

interface ImpactSize {
  r0: number;
  bloom: number;
  small: number;
  wave: number;
  echo: number;
  inner: number;
  n: number;
}

function impact(x: number, y: number, t: number, at: number, seed: number, big: boolean, size: ImpactSize): string {
  let s = bloom(x, y, t, at, big ? size.bloom : 16, C.mysql, big ? 0.9 : 0.6, big ? 4 : 7);
  s += ring(x, y, t - at, big ? 0.8 : 0.5, size.r0, big ? size.wave : size.small, C.mysql, big ? 3.2 : 1.8, 0.95);
  if (big) {
    s += ring(x, y, t - at - 0.07, 0.75, size.r0, size.echo, C.paper, 2, 0.6);
    s += ring(x, y, t - at - 0.16, 0.6, size.r0, size.inner, C.mysql, 1.4, 0.7);
  }
  return s + burst(x, y, t, at, seed, C.mysql, { n: big ? size.n : 14, speed: big ? 150 : 90, grav: 60, life: big ? 0.8 : 0.5, size: big ? 1.8 : 1.4 });
}

function headD(t: number): Point {
  const H = D.HOP;
  if (t <= H[0]) return P[0];
  if (t >= H[3]) return P[3];
  let i = 0;
  while (t > H[i + 1]) i++;
  const u = easeInOut((t - H[i]) / (H[i + 1] - H[i]));
  return [lerp(P[i][0], P[i + 1][0], u), lerp(P[i][1], P[i + 1][1], u)];
}

function pathTo(t: number): Point[] {
  const out = [P[0]];
  for (let i = 1; i < 4; i++) if (t >= D.HOP[i]) out.push(P[i]);
  if (t < D.HOP[3]) out.push(headD(t));
  return out;
}

function viewD(t: number, vb: ViewBox): string {
  const sh = settled(shakeAt(t, [D.HOP[1], D.HOP[2]], 1.2) + shakeAt(t, [D.Q1], 3.2, 7));
  if (t < D.Q0) return cameraTransform(CAM, t, vb, sh);
  let key: CameraKey;
  if (t < D.Q1) {
    const [hx, hy] = headD(t);
    const k = easeInOut(span(t, D.Q0, D.Q0 + 0.18));
    key = { t, x: lerp(74, hx, k), y: lerp(152, hy, k), s: lerp(1.75, 1.6, k) };
  } else {
    const k = easeOut(span(t, D.Q1 + 0.04, D.Q1 + 0.5));
    key = k >= 1 ? { t, x: 256, y: 150, s: 1 } : { t, x: lerp(P[3][0], 256, k), y: lerp(P[3][1], 150, k), s: lerp(1.6, 1, k) };
  }
  return cameraTransform([key], t, vb, sh);
}

function drawDesktop(t: number, vb: ViewBox): string {
  const out: string[] = [];
  const dim = 1 - 0.68 * easeInOut(span(t, D.CH0 - 0.1, D.CH0 + 0.25)) * (1 - easeInOut(span(t, D.Q1 + 0.35, D.Q1 + 1.0)));
  const pulseAt = (x: number, y: number): number => pulse(t, D.Q1 + Math.hypot(x - P[3][0], y - P[3][1]) / 700);

  out.push(ring(P[0][0], P[0][1], t - D.IGN, 1.1, 6, 300, C.quiet, 1.4, 0.55));
  out.push(ring(P[0][0], P[0][1], t - D.IGN - 0.18, 1.1, 6, 300, C.quiet, 1.0, 0.35));

  const quiet: string[] = [];
  const grow = (a: Point, b: Point, at: number, isPath: boolean): void => {
    const g = easeOut(span(t, at, at + D.GROW));
    if (g <= 0 || (isPath && t >= D.Q1)) return;
    const pu = pulseAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    quiet.push(edgeLine(a[0], a[1], lerp(a[0], b[0], g), lerp(a[1], b[1], g), pu, isPath ? Math.max(dim, 0.6) : Math.max(dim, pu)));
    if (g < 1) out.push(growComet(a, b, t, at, D.GROW, 2.2));
    if (g >= 1 && !isPath) out.push(flow([a, b], t, at + D.GROW, D.CH0 + 0.1, C.paper, { n: 3, speed: 1.4, r: 1.1, o: 0.55 }));
  };
  quietEdges.forEach(([x1, y1, x2, y2], i) => grow([x1, y1], [x2, y2], EDGE_AT[i], false));
  PATH_AT.forEach((at, i) => grow(P[i], P[i + 1], at, true));
  out.unshift(`<g>${quiet.join('')}</g>`);

  if (t >= D.Q0) {
    const pts = pathTo(t);
    const hot = 1 - span(t, D.Q1 + 0.2, D.Q1 + 0.9);
    const wide = settled(t > D.Q1 ? 2 * Math.exp(-(t - D.Q1) * 4) : 0);
    if (hot > 0) out.push(`<polyline points="${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}" fill="none" stroke="${C.mysql}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="${f(0.35 * hot)}" filter="url(#fx-glow)"/>`);
    out.push(pathEl(pts, 0.55 * hot * (t < D.Q1 ? 1 : Math.exp(-(t - D.Q1) * 4)), 2 + wide));
    if (t < D.Q1 + 0.02) out.push(comet(headD, t, D.Q0, C.mysql, { len: 0.2, n: 18, head: 3.6, glow: 13 }));
    const back = span(t, D.Q1 + 0.05, D.Q1 + 0.5);
    if (back > 0 && back < 1) {
      const b0 = along(P, 1 - easeOut(back));
      const b1 = along(P, Math.min(1, 1 - easeOut(back) + 0.12));
      out.push(`<line x1="${f(b0[0])}" y1="${f(b0[1])}" x2="${f(b1[0])}" y2="${f(b1[1])}" stroke="${C.paper}" stroke-width="3" stroke-linecap="round" opacity="${f(0.9 * (1 - back))}"/>`);
    }
  }

  for (const { n, tier, hop, at } of EXPANDERS) {
    out.push(ring(n.x, n.y, t - at, 0.45, 6, 26, C.paper, 1.4, 0.7));
    const u = t - (at - 0.14);
    if (u > 0 && u < 0.5) {
      const v = u / 0.5;
      const w = Math.max(n.label.length * (hop ? 7.4 : 6.8), tier.length * 6) + 22;
      out.push(expandCard(n.x, n.x - w / 2, n.y - (hop ? 27 : 24), w, hop ? 54 : 50, v, lerp(0.88, 1.06, easeOut(v)), 9, 3, 1.2));
    }
  }

  others.forEach((n, i) => {
    const at = OTHER_AT[i];
    const u = t - at;
    if (u <= 0) return;
    const pu = pulseAt(n.x, n.y);
    const o = Math.max(dim, pu);
    out.push(relatedDot(n.x, n.y, 4 * pop(u), pu, 1, o));
    out.push(ring(n.x, n.y, u, 0.4, 4, 22, C.paper, 1.2, 0.7));
    out.push(burst(n.x, n.y, t, at, 48 + i, C.quiet, { n: 10, speed: 70, grav: 40, life: 0.45, size: 1.3 }));
    out.push(svgText(n.x, n.y - 12, decode(n.type, span(t, at, at + 0.3), 48 + i, t), 9, C.quiet, `text-anchor="middle" letter-spacing="0.06em" opacity="${f(o)}"`));
    if (u < 1.2) out.push(`<g opacity="${f(o)}">${slam(n.x, n.y + 19, decode(n.label, span(t, at, at + 0.4), 51 + i, t), 11, C.quiet, t, at, '', 'middle')}</g>`);
    else out.push(svgText(n.x, n.y + 19, n.label, 11, C.quiet, `text-anchor="middle" opacity="${f(o)}"`));
  });

  out.push(charge(P[0][0], P[0][1], t, D.CH0, D.Q0, { n: 26, r0: 70, spread: 90, ring: 46, core: 6 }));
  out.push(bloom(P[0][0], P[0][1], t, D.Q0, 26, C.mysql, 0.8, 6));
  out.push(burst(P[0][0], P[0][1], t, D.Q0, 70, C.mysql, { n: 16, speed: 90, grav: 30, life: 0.5, size: 1.5 }));

  hops.forEach((n, i) => {
    const u = t - HOP_AT[i];
    if (u <= 0) return;
    const at = D.HOP[i];
    const lit = i === 0 ? span(t, D.Q0 - 0.12, D.Q0) : span(t, at, at + 0.06);
    const kick = lit >= 1 && i > 0 ? springOut(t - at, 0.6) : 0;
    const pu = i === 3 ? 0 : pulseAt(n.x, n.y);
    out.push(hopDot(n.x, n.y, lerp(4.5, 6, lit) * pop(u) * (1 + kick), lit, pu, 1));
    if (u < 0.6) out.push(ring(n.x, n.y, u, 0.45, 4, 24, C.paper, 1.3, 0.7));
    if (i > 0) out.push(impact(n.x, n.y, t, at, 40 + i, i === 3, { r0: 6, bloom: 34, small: 34, wave: 560, echo: 380, inner: 120, n: 30 }));
    if (i > 0 && t > at && t < at + 1.2) out.push(slam(n.x, n.y - 15, n.tier, 9, mix(C.quiet, C.mysql, Math.exp(-(t - at) * 3)), t, at, 'letter-spacing="0.08em"', 'middle'));
    else out.push(svgText(n.x, n.y - 15, decode(n.tier, span(t, HOP_AT[i], HOP_AT[i] + 0.3), 90 + i, t), 9, C.quiet, 'text-anchor="middle" letter-spacing="0.08em"'));
    if (u < 1.2) out.push(slam(n.x, n.y + 21, decode(n.label, span(t, HOP_AT[i], HOP_AT[i] + 0.4), 95 + i, t), 12, C.paper, t, HOP_AT[i], '', 'middle'));
    else out.push(svgText(n.x, n.y + 21, n.label, 12, C.paper, 'text-anchor="middle"'));
  });

  out.push(flash(t, D.Q0, vb, C.mysql, 0.08, 0.1));
  out.push(flash(t, D.Q1, vb, C.paper, 0.11, 0.08));
  out.push(flash(t, D.IGN, vb, C.paper, 0.1, 0.1));

  const tf = viewD(t, vb);
  return tf ? `<g transform="${tf}">${out.join('')}</g>` : out.join('');
}

function headY(t: number): number {
  const H = M.HOP;
  if (t <= H[0]) return mobileHops[0].y;
  if (t >= H[3]) return mobileHops[3].y;
  let i = 0;
  while (t > H[i + 1]) i++;
  return lerp(mobileHops[i].y, mobileHops[i + 1].y, easeInOut((t - H[i]) / (H[i + 1] - H[i])));
}

function drawPhone(t: number, vb: ViewBox): string {
  const out: string[] = [];
  const top = mobileHops[0].y;
  const end = mobileHops[3].y;
  const dim = 1 - 0.65 * easeInOut(span(t, M.CH0 - 0.1, M.CH0 + 0.25)) * (1 - easeInOut(span(t, M.Q1 + 0.3, M.Q1 + 0.9)));
  const pulseAt = (x: number, y: number): number => pulse(t, M.Q1 + Math.hypot(x - X0, y - end) / 650);

  out.push(ring(X0, top, t - M.IGN, 1, 7, 360, C.quiet, 1.4, 0.5));
  out.push(ring(X0, top, t - M.IGN - 0.18, 1, 7, 360, C.quiet, 1, 0.3));

  SEG_AT.forEach((at, i) => {
    const y0 = mobileHops[i].y;
    const y1 = mobileHops[i + 1].y;
    const g = easeOut(span(t, at, at + M.GROW));
    if (g <= 0 || t >= M.HOP[i + 1]) return;
    out.push(`<line x1="${X0}" y1="${y0}" x2="${X0}" y2="${f(lerp(y0, y1, g))}" stroke="${C.line}" stroke-width="1.5" opacity="${f(Math.max(dim, 0.6))}"/>`);
    if (g < 1) out.push(growComet([X0, y0], [X0, y1], t, at, M.GROW, 2.4));
  });

  if (t >= M.Q0) {
    const yh = headY(t);
    const hot = 1 - span(t, M.Q1 + 0.2, M.Q1 + 0.9);
    const wide = settled(t > M.Q1 ? 2 * Math.exp(-(t - M.Q1) * 4) : 0);
    if (hot > 0) out.push(`<line x1="${X0}" y1="${top}" x2="${X0}" y2="${f(yh)}" stroke="${C.mysql}" stroke-width="8" opacity="${f(0.35 * hot)}" filter="url(#fx-glow)"/>`);
    out.push(phonePath(yh, 0.55 * hot * (t < M.Q1 ? 1 : Math.exp(-(t - M.Q1) * 4)), 2.5 + wide));
    if (t < M.Q1 + 0.02) out.push(comet((tt) => [X0, headY(tt)], t, M.Q0, C.mysql, { len: 0.18, n: 16, head: 3.6, glow: 13 }));
    const back = span(t, M.Q1 + 0.05, M.Q1 + 0.45);
    if (back > 0 && back < 1) {
      const yb = lerp(end, top, easeOut(back));
      out.push(`<line x1="${X0}" y1="${f(yb)}" x2="${X0}" y2="${f(yb + 26)}" stroke="${C.paper}" stroke-width="3" stroke-linecap="round" opacity="${f(0.9 * (1 - back))}"/>`);
    }
  }

  mobileRelated.forEach((r, k) => {
    const g = easeOut(span(t, RELATED_AT[k], RELATED_AT[k] + M.GROW));
    if (g <= 0) return;
    const pu = pulseAt(204, r.y);
    const o = Math.max(dim, pu);
    out.push(`<line x1="${f(r.from)}" y1="${f(r.y)}" x2="${f(lerp(r.from, 200, g))}" y2="${f(r.y)}" stroke="${mix(C.line, C.paper, 0.8 * pu)}" stroke-width="1.5" opacity="${f(o)}"/>`);
    if (g < 1) out.push(growComet([r.from, r.y], [200, r.y], t, RELATED_AT[k], M.GROW, 2.2));
    const at = RELATED_AT[k] + M.GROW;
    const u = t - at;
    if (u <= 0) return;
    out.push(relatedDot(204, r.y, 4 * pop(u), pu, 1.5, o));
    out.push(ring(204, r.y, u, 0.4, 4, 22, C.paper, 1.2, 0.7));
    out.push(burst(204, r.y, t, at, 80 + k, C.quiet, { n: 10, speed: 70, grav: 40, life: 0.45, size: 1.3 }));
    out.push(svgText(216, r.y - 5, decode(r.type, span(t, at, at + 0.3), 70 + k, t), 12, C.quiet, `letter-spacing="0.06em" opacity="${f(o)}"`));
    if (u < 1.2) out.push(`<g opacity="${f(o)}">${slam(216, r.y + 13, decode(r.label, span(t, at, at + 0.4), 75 + k, t), 13, C.quiet, t, at)}</g>`);
    else out.push(svgText(216, r.y + 13, r.label, 13, C.quiet, `opacity="${f(o)}"`));
  });

  SEG_AT.forEach((at, i) => {
    const n = mobileHops[i];
    out.push(ring(X0, n.y, t - at, 0.45, 7, 28, C.paper, 1.4, 0.7));
    const u = t - (at - 0.14);
    if (u > 0 && u < 0.5) {
      const v = u / 0.5;
      const w = 32 + Math.max(n.label.length * 9, n.tier.length * 8.6) + 12;
      out.push(expandCard(4 + w / 2, 4, n.y - 22, w, 46, v, lerp(0.9, 1.04, easeOut(v)), 10, 3.5, 1.3));
    }
  });

  out.push(charge(X0, top, t, M.CH0, M.Q0, { n: 22, r0: 60, spread: 80, ring: 44, core: 7 }));
  out.push(bloom(X0, top, t, M.Q0, 24, C.mysql, 0.8, 6));
  out.push(burst(X0, top, t, M.Q0, 70, C.mysql, { n: 14, speed: 90, grav: 30, life: 0.5, size: 1.5 }));

  mobileHops.forEach((n, i) => {
    const u = t - MOBILE_AT[i];
    if (u <= 0) return;
    const at = M.HOP[i];
    const lit = i === 0 ? span(t, M.Q0 - 0.12, M.Q0) : span(t, at, at + 0.06);
    const kick = lit >= 1 && i > 0 ? springOut(t - at, 0.6) : 0;
    const pu = i === 3 ? 0 : pulseAt(X0, n.y);
    out.push(hopDot(X0, n.y, lerp(5, 7, lit) * pop(u) * (1 + kick), lit, pu, 1.5));
    if (u < 0.6) out.push(ring(X0, n.y, u, 0.45, 5, 26, C.paper, 1.3, 0.7));
    if (i > 0) out.push(impact(X0, n.y, t, at, 40 + i, i === 3, { r0: 7, bloom: 32, small: 36, wave: 520, echo: 360, inner: 110, n: 28 }));
    if (i > 0 && t > at && t < at + 1.2) out.push(slam(36, n.y - 4, n.tier, 12, mix(C.quiet, C.mysql, Math.exp(-(t - at) * 3)), t, at, 'letter-spacing="0.08em"'));
    else out.push(svgText(36, n.y - 4, decode(n.tier, span(t, MOBILE_AT[i], MOBILE_AT[i] + 0.3), 90 + i, t), 12, C.quiet, 'letter-spacing="0.08em"'));
    if (u < 1.2) out.push(slam(36, n.y + 16, decode(n.label, span(t, MOBILE_AT[i], MOBILE_AT[i] + 0.4), 95 + i, t), 15, C.paper, t, MOBILE_AT[i]));
    else out.push(svgText(36, n.y + 16, n.label, 15, C.paper));
  });

  out.push(flash(t, M.Q0, vb, C.mysql, 0.07, 0.08));
  out.push(flash(t, M.Q1, vb, C.paper, 0.09, 0.07));
  out.push(flash(t, M.IGN, vb, C.paper, 0.08, 0.08));
  return out.join('');
}

/** The settled graphic, drawn with the same builders and order as the last frames of the scene. */
export function staticFrame(layout: Layout, _vb: ViewBox): string {
  if (layout === 'phone') {
    const related = mobileRelated.map(
      (r) =>
        `<line x1="${f(r.from)}" y1="${f(r.y)}" x2="${f(200)}" y2="${f(r.y)}" stroke="${mix(C.line, C.paper, 0)}" stroke-width="1.5" opacity="1"/>` +
        relatedDot(204, r.y, 4, 0, 1.5, 1) +
        svgText(216, r.y - 5, r.type, 12, C.quiet, 'letter-spacing="0.06em" opacity="1"') +
        svgText(216, r.y + 13, r.label, 13, C.quiet, 'opacity="1"'),
    );
    const nodes = mobileHops.map(
      (n) =>
        hopDot(X0, n.y, 7, 1, 0, 1.5) +
        svgText(36, n.y - 4, n.tier, 12, C.quiet, 'letter-spacing="0.08em"') +
        svgText(36, n.y + 16, n.label, 15, C.paper),
    );
    return phonePath(mobileHops[3].y, 0, 2.5) + related.join('') + nodes.join('');
  }
  const edges = quietEdges.map(([x1, y1, x2, y2]) => edgeLine(x1, y1, x2, y2, 0, 1)).join('');
  const related = others.map(
    (n) =>
      relatedDot(n.x, n.y, 4, 0, 1, 1) +
      svgText(n.x, n.y - 12, n.type, 9, C.quiet, 'text-anchor="middle" letter-spacing="0.06em" opacity="1"') +
      svgText(n.x, n.y + 19, n.label, 11, C.quiet, 'text-anchor="middle" opacity="1"'),
  );
  const nodes = hops.map(
    (n) =>
      hopDot(n.x, n.y, 6, 1, 0, 1) +
      svgText(n.x, n.y - 15, n.tier, 9, C.quiet, 'text-anchor="middle" letter-spacing="0.08em"') +
      svgText(n.x, n.y + 21, n.label, 12, C.paper, 'text-anchor="middle"'),
  );
  return `<g>${edges}</g>` + pathEl(P, 0, 2) + related.join('') + nodes.join('');
}

/** The CMDB traversal: the graph expands level by level, then a comet runs the answer path. */
export const timeline: Timeline = {
  duration: (layout) => (layout === 'desktop' ? D.END : M.END),
  viewBoxWidth: (layout) => (layout === 'desktop' ? 512 : 300),
  draw: (t, layout, vb) => {
    if (t >= (layout === 'desktop' ? D.END : M.END)) return staticFrame(layout, vb);
    return layout === 'desktop' ? drawDesktop(t, vb) : drawPhone(t, vb);
  },
};
