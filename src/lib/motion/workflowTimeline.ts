import { desktopEdges, mobileEdges, mobileNodes, nodes } from '../../data/workflowGraph';
import { along, bloom, boxRing, burst, cameraTransform, comet, cubic, easeInFx, flash, MONO, ring, scramble, shakeAt, svgText, type CameraKey, type ViewBox } from './fx';
import { clamp, easeInOut, easeOut, lerp, mix, round2 as f, span, springOut } from './math';
import type { Layout, Timeline } from './overlay';

type Point = [number, number];

const C = { void: '#07090C', surface: '#202834', line: '#404A5A', lineStrong: '#556274', quiet: '#8590A2', paper: '#F0EDE6', react: '#61DAFB' };

/** Desktop beats in seconds: event, condition scan, true verdict, request, response, run back, end. */
export const DESKTOP = { EV0: 0.1, EV1: 0.5, TK0: 0.62, TK1: 0.95, SC0: 1.0, SC1: 1.42, TRUE: 1.5, TK2: 1.62, TK3: 1.92, RQ0: 2.05, RQ1: 2.25, RS0: 2.55, RS1: 2.75, DN0: 2.92, DN1: 3.45, END: 4.6 } as const;

/** Phone beats in seconds, slightly tighter than desktop. */
export const PHONE = { EV0: 0.1, EV1: 0.5, TK0: 0.62, TK1: 0.85, SC0: 0.9, SC1: 1.32, TRUE: 1.4, TK2: 1.52, TK3: 1.82, RQ0: 1.95, RQ1: 2.15, RS0: 2.45, RS1: 2.65, DN0: 2.82, DN1: 3.3, END: 4.4 } as const;

type Beats = typeof DESKTOP | typeof PHONE;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  rx: number;
  sw: number;
  tx: number;
  ly: number;
  sy: number;
  lf: number;
  sf: number;
  label: string;
  sub: string;
  lit: boolean;
}

const DESKTOP_BOXES: Box[] = nodes.map((n) => ({ x: n.x, y: n.y, w: n.w, h: 48, rx: 4, sw: 1, tx: n.x + 12, ly: n.y + 20, sy: n.y + 36, lf: 9, sf: 10, label: n.label.toUpperCase(), sub: n.sub, lit: n.kind === 'lit' }));
const PHONE_BOXES: Box[] = mobileNodes.map((n) => ({ x: n.x + 0.75, y: n.y + 0.75, w: n.w - 1.5, h: 52.5, rx: 5, sw: 1.5, tx: n.x + 14, ly: n.y + 22, sy: n.y + 41, lf: 12, sf: 13, label: n.label.toUpperCase(), sub: n.sub, lit: n.kind === 'lit' }));

const nums = (d: string): number[] => (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
const bezier = (d: string): ((u: number) => Point) => {
  const [a, b, c, e, g, h, i, j] = nums(d);
  return (u) => cubic([a, b], [c, e], [g, h], [i, j], u);
};
const [E0X, E0Y, E1X] = nums(desktopEdges[0]);
const upper = bezier(desktopEdges[1]);
const lower = bezier(desktopEdges[2]);
const curve = (fn: (u: number) => Point, u: number, n = 24): Point[] => Array.from({ length: Math.max(2, Math.ceil(n * u) + 1) }, (_, i) => fn(Math.min(u, i / n)));
const RUN_D: Point[] = [upper(1), ...Array.from({ length: 24 }, (_, i) => upper(1 - (i + 1) / 24)), [E1X, E0Y], [E0X, E0Y], [DESKTOP_BOXES[0].x, E0Y]];
const CAM: CameraKey[] = [
  { t: 0, x: 60, y: 86, s: 1.75 },
  { t: DESKTOP.EV1, x: 90, y: 86, s: 1.75 },
  { t: DESKTOP.TK1, x: 238, y: 86, s: 1.6 },
  { t: DESKTOP.TRUE, x: 250, y: 86, s: 1.72 },
  { t: DESKTOP.TK2, x: 260, y: 82, s: 1.7 },
  { t: DESKTOP.TK3, x: 398, y: 50, s: 1.7, ease: easeOut },
  { t: DESKTOP.RQ1, x: 420, y: 50, s: 1.55 },
  { t: DESKTOP.RS1, x: 410, y: 50, s: 1.62 },
  { t: DESKTOP.DN0, x: 330, y: 74, s: 1.3 },
  { t: DESKTOP.DN1 + 0.1, x: 238, y: 80, s: 1 },
];

const E2: Point[] = [[24, 136], [24, 185], [25.5, 191], [30, 195.5], [36, 197], [40, 197]];
const RUN_M: Point[] = [[40, 197], [36, 197], [30, 195.5], [25.5, 191], [24, 185], [24, 136], [24, 82], [24, 54]];

const settled = (v: number, eps = 0.02): number => (v < eps ? 0 : v);
const blend = (a: string, b: string, p: number): string => (p <= 0 ? a : p >= 1 ? b : mix(a, b, p));
const poly = (pts: Point[]): string => pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');

function partial(pts: Point[], p: number): Point[] {
  const out: Point[] = [pts[0]];
  const lens = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
  let d = p * lens.reduce((sum, len) => sum + len, 0);
  for (let i = 0; i < lens.length; i++) {
    if (d >= lens[i]) {
      out.push(pts[i + 1]);
      d -= lens[i];
    } else {
      const k = d / lens[i];
      out.push([lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)]);
      break;
    }
  }
  return out;
}

const edgesGroup = (paths: readonly string[], strokes: string[], sw: number): string =>
  `<g fill="none" stroke-width="${sw}">${paths.map((d, i) => `<path d="${d}" stroke="${strokes[i]}"/>`).join('')}</g>`;

const faceRect = (b: Box, stroke: string): string =>
  `<rect x="${f(b.x)}" y="${f(b.y)}" width="${f(b.w)}" height="${f(b.h)}" rx="${b.rx}" fill="${C.surface}" stroke="${stroke}" stroke-width="${b.sw}"/>`;

const faceText = (b: Box, ink: string, sub: string): string =>
  svgText(b.tx, b.ly, b.label, b.lf, ink, 'letter-spacing="0.08em"') + svgText(b.tx, b.sy, sub, b.sf, C.paper);

const glowEdge = (pts: Point[], o: number, wide: number, thin: number): string =>
  o > 0.005
    ? `<polyline points="${poly(pts)}" fill="none" stroke="${C.react}" stroke-width="${wide}" opacity="${f(0.35 * o)}" filter="url(#fx-glow)"/><polyline points="${poly(pts)}" fill="none" stroke="${mix(C.react, C.paper, 0.4 * o)}" stroke-width="${thin}" opacity="${f(o)}"/>`
    : '';

interface ChipSize {
  cw: number;
  pad: number;
  h: number;
  font: number;
  ty: number;
  sw: number;
}

function chip(x: number, y: number, s: string, t: number, at: number, fade: number, z: ChipSize): string {
  const u = t - at;
  if (u <= 0 || fade <= 0) return '';
  const sc = 1 + springOut(u * 1.1, 0.9);
  const w = s.length * z.cw + z.pad;
  const g = u < 0.5 ? `<rect x="${f(-w / 2 - 2)}" y="${f(-z.h / 2 - 2)}" width="${f(w + 4)}" height="${f(z.h + 4)}" rx="${f(z.h / 2 + 2)}" fill="${C.react}" opacity="${f(0.6 * Math.exp(-u * 6))}" filter="url(#fx-glow)"/>` : '';
  return `<g opacity="${f(fade * clamp(u / 0.05))}" transform="translate(${f(x)} ${f(y)}) scale(${sc.toFixed(3)})">${g}<rect x="${f(-w / 2)}" y="${f(-z.h / 2)}" width="${f(w)}" height="${f(z.h)}" rx="${f(z.h / 2)}" fill="${C.void}" stroke="${C.react}" stroke-width="${z.sw}"/><text x="0" y="${z.ty}" font-family="${MONO}" font-size="${z.font}" letter-spacing="0.06em" fill="${C.react}" text-anchor="middle">${s}</text></g>`;
}

interface NodeStyle {
  kick: number;
  scanW: number;
  scanLine: number;
  scanGlow: number;
  bar: (b: Box, t: number, T: Beats) => string;
}

function drawNodes(boxes: Box[], t: number, T: Beats, falseDim: number, cool: number, s: NodeStyle): string[] {
  return boxes.map((b, i) => {
    const lit = i === 0 ? span(t, T.EV1, T.EV1 + 0.06) : i === 2 ? span(t, T.TK3, T.TK3 + 0.06) : 0;
    const scan = i === 1 ? Math.sin(Math.PI * span(t, T.SC0 - 0.05, T.SC1 + 0.08)) : 0;
    const o = i === 3 ? 1 - 0.55 * falseDim : 1;
    const stroke = b.lit ? blend(C.lineStrong, C.react, lit) : blend(C.lineStrong, C.paper, 0.7 * scan);
    const ink = b.lit ? blend(C.quiet, C.react, lit) : C.quiet;
    const hitAt = i === 0 ? T.EV1 : i === 2 ? T.TK3 : -9;
    const kick = t > hitAt ? springOut(t - hitAt, 1) : 0;
    const power = b.lit && lit > 0 ? (1 - cool) * 0.5 + (t > hitAt ? 0.6 * Math.exp(-(t - hitAt) * 4) : 0) : 0;
    const g: string[] = [];
    if (power > 0.01) g.push(`<rect x="${f(b.x - 2)}" y="${f(b.y - 2)}" width="${f(b.w + 4)}" height="${f(b.h + 4)}" rx="${b.rx + 2}" fill="none" stroke="${C.react}" stroke-width="4" opacity="${f(0.45 * power)}" filter="url(#fx-glow)"/>`);
    g.push(faceRect(b, stroke));
    if (i === 1) {
      for (const [a, z] of [[T.SC0, T.SC0 + 0.24], [T.SC0 + 0.22, T.SC1]]) {
        if (t > a && t < z) {
          const x = lerp(b.x + 3, b.x + b.w - 3, easeInOut(span(t, a, z)));
          g.push(`<rect x="${f(x - s.scanW)}" y="${f(b.y + 1)}" width="${s.scanW}" height="${f(b.h - 2)}" fill="${C.react}" opacity="0.12"/><line x1="${f(x)}" y1="${f(b.y + 2)}" x2="${f(x)}" y2="${f(b.y + b.h - 2)}" stroke="${C.react}" stroke-width="${s.scanLine}"/><circle cx="${f(x)}" cy="${f(b.y + b.h / 2)}" r="${s.scanGlow}" fill="${C.react}" opacity="0.4" filter="url(#fx-glow)"/>`);
        }
      }
    }
    if (i === 2 && t > T.RQ0 && t < T.RS1 + 0.35) g.push(s.bar(b, t, T));
    g.push(faceText(b, ink, i === 0 && t > T.EV1 && t < T.EV1 + 0.45 ? scramble(b.sub, span(t, T.EV1, T.EV1 + 0.45), 7, t) : b.sub));
    const sc = 1 + s.kick * kick;
    if (o >= 1 && sc === 1) return g.join('');
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    return `<g opacity="${f(o)}" transform="translate(${f(cx)} ${f(cy)}) scale(${sc.toFixed(4)}) translate(${f(-cx)} ${f(-cy)})">${g.join('')}</g>`;
  });
}

function xMark(x: number, y: number, t: number, T: Beats, bg: string, sw: number): string {
  if (t <= T.TRUE + 0.12 || t >= T.DN0) return '';
  const v = t - T.TRUE - 0.12;
  const sc = 1 + springOut(v * 1.2, 1);
  return (
    `<g transform="translate(${f(x)} ${f(y)}) scale(${sc.toFixed(3)})" opacity="${f(clamp(v / 0.05) * (1 - span(t, T.DN0 - 0.3, T.DN0)))}">${bg}` +
    `<line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" stroke="${C.paper}" stroke-width="${sw}"/><line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5" stroke="${C.paper}" stroke-width="${sw}"/></g>` +
    burst(x, y, t, T.TRUE + 0.12, 17, C.quiet, { n: 8, speed: 50, grav: 60, life: 0.4, size: 1.2 })
  );
}

const hold = (x: number, y: number, t: number, T: Beats): string => {
  if (t <= T.TK1 || t >= T.TK2) return '';
  const k = Math.sin((t - T.TK1) * 30) * 0.5 + 0.5;
  return `<circle cx="${x}" cy="${y}" r="${f(6 + 3 * k)}" fill="${C.react}" opacity="0.45" filter="url(#fx-glow)"/><circle cx="${x}" cy="${y}" r="2.6" fill="${C.paper}"/>`;
};

function viewD(t: number, vb: ViewBox): string {
  const T = DESKTOP;
  const sh = settled(shakeAt(t, [T.EV1, T.TK3], 1.6) + shakeAt(t, [T.RS1], 2, 8) + shakeAt(t, [T.TRUE + 0.1], 0.8));
  const punch = settled(t > T.RS1 ? 0.06 * Math.exp(-(t - T.RS1) * 7) : 0, 1e-4);
  const tf = cameraTransform(CAM, t, vb, sh);
  if (!punch) return tf;
  const cx = vb.x + vb.w / 2;
  const cy = vb.y + vb.h / 2;
  return `translate(${f(cx)} ${f(cy)}) scale(${(1 + punch).toFixed(4)}) translate(${f(-cx)} ${f(-cy)}) ${tf}`.trim();
}

const DESKTOP_STYLE: NodeStyle = {
  kick: 0.045,
  scanW: 26,
  scanLine: 1.2,
  scanGlow: 5,
  bar: (b, t, T) => {
    const p = t < T.RS1 ? easeInOut(span(t, T.RQ0, T.RS1)) : 1;
    const o = 1 - span(t, T.RS1, T.RS1 + 0.35);
    const sx = b.x + 4 + ((t * 1.6) % 1) * (b.w - 8) * p;
    return `<rect x="${f(b.x + 4)}" y="${f(b.y + 44)}" width="${f((b.w - 8) * p)}" height="1.8" rx="0.9" fill="${C.react}" opacity="${f(o)}"/><circle cx="${f(sx)}" cy="${f(b.y + 45)}" r="3" fill="${C.paper}" opacity="${f(0.6 * o)}" filter="url(#fx-glow)"/>`;
  },
};

const PHONE_STYLE: NodeStyle = {
  kick: 0.035,
  scanW: 30,
  scanLine: 1.4,
  scanGlow: 6,
  bar: (b, t, T) => {
    const p = t < T.RS1 ? easeInOut(span(t, T.RQ0, T.RS1)) : 1;
    return `<rect x="${f(b.x + 4)}" y="${f(b.y + b.h - 4)}" width="${f((b.w - 8) * p)}" height="2" rx="1" fill="${C.react}" opacity="${f(1 - span(t, T.RS1, T.RS1 + 0.35))}"/>`;
  },
};

function drawDesktop(t: number, vb: ViewBox): string {
  const T = DESKTOP;
  const N = DESKTOP_BOXES;
  const out: string[] = [];
  const cool = span(t, T.DN1, T.END - 0.25);
  const falseDown = t < T.TRUE ? 0 : t < T.TRUE + 0.2 ? (Math.floor((t - T.TRUE) * 40) % 2 ? 1 : 0.3) : 1;
  const falseDim = falseDown * (1 - cool);
  const candidate = t > T.SC0 && t < T.TRUE ? 0.5 + 0.5 * Math.sin((t - T.SC0) * 26) : 0;
  const cand = blend(C.lineStrong, C.react, 0.5 * candidate);
  out.push(edgesGroup(desktopEdges, [C.lineStrong, cand, blend(cand, C.line, falseDim)], 1));
  if (t >= T.TK0) out.push(glowEdge([[E0X, E0Y], [lerp(E0X, E1X, easeInOut(span(t, T.TK0, T.TK1))), E0Y]], 1 - cool, 5, 1.3));
  if (t >= T.TK2) out.push(glowEdge(curve(upper, easeInOut(span(t, T.TK2, T.TK3))), 1 - cool, 5, 1.3));
  out.push(...drawNodes(N, t, T, falseDim, cool, DESKTOP_STYLE));

  const [tx, ty] = [N[0].x, N[0].y + N[0].h / 2];
  const [cx, cy] = upper(1);
  const right = N[2].x + N[2].w;
  out.push(boxRing(N[0].x, N[0].y, N[0].w, N[0].h, t, T.EV1, 0.5, 16, C.react, 2));
  out.push(boxRing(N[0].x, N[0].y, N[0].w, N[0].h, t, T.EV1 + 0.08, 0.6, 34, C.paper, 1.2));
  out.push(bloom(tx, ty, t, T.EV1, 20, C.react, 0.8, 6));
  out.push(burst(tx, ty, t, T.EV1, 3, C.react, { n: 18, speed: 110, grav: 50, life: 0.55, spread: Math.PI * 1.2, dir: Math.PI }));
  out.push(boxRing(N[2].x, N[2].y, N[2].w, N[2].h, t, T.TK3, 0.5, 16, C.react, 2));
  out.push(bloom(cx, cy, t, T.TK3, 18, C.react, 0.8, 6));
  out.push(burst(cx, cy, t, T.TK3, 9, C.react, { n: 16, speed: 100, grav: 50, life: 0.5 }));
  out.push(boxRing(N[2].x, N[2].y, N[2].w, N[2].h, t, T.RS1, 0.6, 22, C.react, 2.2));
  out.push(ring(N[2].x + N[2].w / 2, cy, t - T.RS1, 0.85, 20, 640, C.react, 2.4, 0.7));
  out.push(ring(N[2].x + N[2].w / 2, cy, t - T.RS1 - 0.08, 0.8, 20, 420, C.paper, 1.4, 0.4));
  out.push(bloom(right, cy, t, T.RS1, 22, C.react, 0.9, 5));
  out.push(burst(right, cy, t, T.RS1, 13, C.paper, { n: 14, speed: 90, grav: 40, life: 0.45, spread: Math.PI, dir: 0 }));
  if (t < T.EV1 + 0.02) out.push(comet((tt) => [lerp(-160, tx, easeInFx(span(tt, T.EV0, T.EV1))), ty], t, T.EV0, C.react, { len: 0.14, n: 16, head: 3.2, glow: 12 }));
  if (t < T.TK1 + 0.02) out.push(comet((tt) => [lerp(E0X, E1X, easeInOut(span(tt, T.TK0, T.TK1))), E0Y], t, T.TK0, C.react, { len: 0.1, n: 10, head: 2.6, glow: 9 }));
  out.push(hold(E1X, E0Y, t, T));
  if (t < T.TK3 + 0.02) out.push(comet((tt) => upper(easeInOut(span(tt, T.TK2, T.TK3))), t, T.TK2, C.react, { len: 0.12, n: 14, head: 2.8, glow: 10 }));
  if (t < T.RQ1 + 0.04) out.push(comet((tt) => [lerp(right, 640, easeInFx(span(tt, T.RQ0, T.RQ1))), cy], t, T.RQ0, C.react, { len: 0.12, n: 14, head: 2.8, glow: 10 }));
  if (t < T.RS1 + 0.03) out.push(comet((tt) => [lerp(660, right, easeOut(span(tt, T.RS0, T.RS1))), cy], t, T.RS0, C.react, { len: 0.12, n: 14, head: 2.8, glow: 10 }));
  for (let k = 0; k < 3; k++) {
    const v = span(t, T.RQ1 - 0.05 + k * 0.12, T.RQ1 + 0.3 + k * 0.12);
    if (v > 0 && v < 1 && t < T.RS0 + 0.1) {
      const e = easeOut(v);
      out.push(`<path d="M${f(right + 4 + 8 * e)} ${f(cy - 8 - 10 * e)} A ${f(10 + 12 * e)} ${f(10 + 12 * e)} 0 0 1 ${f(right + 4 + 8 * e)} ${f(cy + 8 + 10 * e)}" fill="none" stroke="${C.react}" stroke-width="1.2" opacity="${f(0.8 * (1 - v))}"/>`);
    }
  }
  const fadeChips = 1 - span(t, T.DN1, T.END - 0.3);
  const small: ChipSize = { cw: 5.4, pad: 8, h: 11, font: 7.5, ty: 2.6, sw: 0.8 };
  out.push(chip(N[1].x + N[1].w - 20, N[1].y + 8, 'true', t, T.TRUE, fadeChips, small));
  const [lx, ly] = lower(0.5);
  out.push(xMark(lx, ly, t, T, '', 1.4));
  out.push(chip(right - 16, N[2].y + 8, '200', t, T.RS1, fadeChips, small));
  if (t > T.DN0 && t < T.DN1 + 0.05) out.push(comet((tt) => along(RUN_D, easeInOut(span(tt, T.DN0, T.DN1))), t, T.DN0, C.paper, { len: 0.12, n: 14, head: 2.6, glow: 9, core: C.paper }));
  out.push(boxRing(N[1].x, N[1].y, N[1].w, N[1].h, t, T.DN0 + 0.25, 0.4, 12, C.paper, 1.2));
  out.push(boxRing(N[0].x, N[0].y, N[0].w, N[0].h, t, T.DN1, 0.5, 18, C.react, 1.8));
  out.push(bloom(tx, ty, t, T.DN1, 16, C.react, 0.6, 6));
  out.push(flash(t, T.EV1, vb, C.react, 0.05, 0.06));
  out.push(flash(t, T.RS1, vb, C.paper, 0.045, 0.06));
  out.push(flash(t, T.TRUE, vb, C.react, 0.05, 0.06));

  const tf = viewD(t, vb);
  return tf ? `<g transform="${tf}">${out.join('')}</g>` : out.join('');
}

function drawPhone(t: number, vb: ViewBox): string {
  const T = PHONE;
  const N = PHONE_BOXES;
  const out: string[] = [];
  const cool = span(t, T.DN1, T.END - 0.25);
  const falseDown = t < T.TRUE ? 0 : t < T.TRUE + 0.2 ? (Math.floor((t - T.TRUE) * 40) % 2 ? 1 : 0.3) : 1;
  const falseDim = falseDown * (1 - cool);
  const candidate = t > T.SC0 && t < T.TRUE ? 0.5 + 0.5 * Math.sin((t - T.SC0) * 26) : 0;
  const cand = blend(C.lineStrong, C.react, 0.5 * candidate);
  out.push(edgesGroup(mobileEdges, [C.lineStrong, cand, blend(cand, C.line, falseDim)], 1.5));
  if (t >= T.TK0) out.push(glowEdge([[24, 54], [24, lerp(54, 82, easeInOut(span(t, T.TK0, T.TK1)))]], 1 - cool, 6, 1.8));
  if (t >= T.TK2) out.push(glowEdge(partial(E2, easeInOut(span(t, T.TK2, T.TK3))), 1 - cool, 6, 1.8));
  out.push(...drawNodes(N, t, T, falseDim, cool, PHONE_STYLE));

  const ty = N[0].y + N[0].h / 2;
  const right = N[2].x + N[2].w;
  out.push(boxRing(N[0].x, N[0].y, N[0].w, N[0].h, t, T.EV1, 0.5, 14, C.react, 2, 5));
  out.push(boxRing(N[0].x, N[0].y, N[0].w, N[0].h, t, T.EV1 + 0.08, 0.6, 30, C.paper, 1.2, 5));
  out.push(bloom(N[0].x, ty, t, T.EV1, 20, C.react, 0.8, 6));
  out.push(burst(N[0].x, ty, t, T.EV1, 3, C.react, { n: 16, speed: 100, grav: 50, life: 0.55, spread: Math.PI * 1.2, dir: Math.PI }));
  out.push(boxRing(N[2].x, N[2].y, N[2].w, N[2].h, t, T.TK3, 0.5, 14, C.react, 2, 5));
  out.push(bloom(40, 197, t, T.TK3, 18, C.react, 0.8, 6));
  out.push(burst(40, 197, t, T.TK3, 9, C.react, { n: 14, speed: 90, grav: 50, life: 0.5 }));
  out.push(boxRing(N[2].x, N[2].y, N[2].w, N[2].h, t, T.RS1, 0.6, 20, C.react, 2.2, 5));
  out.push(ring(170, 197, t - T.RS1, 0.85, 20, 420, C.react, 2.4, 0.7));
  out.push(ring(170, 197, t - T.RS1 - 0.08, 0.8, 20, 300, C.paper, 1.4, 0.4));
  out.push(bloom(right, 197, t, T.RS1, 20, C.react, 0.9, 5));
  if (t < T.EV1 + 0.02) out.push(comet((tt) => [lerp(-90, N[0].x, easeInFx(span(tt, T.EV0, T.EV1))), 27], t, T.EV0, C.react, { len: 0.14, n: 14, head: 3.2, glow: 12 }));
  if (t < T.TK1 + 0.02) out.push(comet((tt) => [24, lerp(54, 82, easeInOut(span(tt, T.TK0, T.TK1)))], t, T.TK0, C.react, { len: 0.1, n: 10, head: 2.6, glow: 9 }));
  out.push(hold(24, 82, t, T));
  if (t < T.TK3 + 0.02) out.push(comet((tt) => along(E2, easeInOut(span(tt, T.TK2, T.TK3))), t, T.TK2, C.react, { len: 0.12, n: 14, head: 2.8, glow: 10 }));
  if (t < T.RQ1 + 0.04) out.push(comet((tt) => [lerp(right, 380, easeInFx(span(tt, T.RQ0, T.RQ1))), 197], t, T.RQ0, C.react, { len: 0.12, n: 12, head: 2.8, glow: 10 }));
  if (t < T.RS1 + 0.03) out.push(comet((tt) => [lerp(390, right, easeOut(span(tt, T.RS0, T.RS1))), 197], t, T.RS0, C.react, { len: 0.12, n: 12, head: 2.8, glow: 10 }));
  const fadeChips = 1 - span(t, T.DN1, T.END - 0.3);
  const large: ChipSize = { cw: 7, pad: 10, h: 15, font: 10, ty: 3.5, sw: 1 };
  out.push(chip(212, 97, 'true', t, T.TRUE, fadeChips, large));
  out.push(xMark(24, 238, t, T, `<rect x="-6" y="-6" width="12" height="12" rx="6" fill="${C.void}"/>`, 1.5));
  out.push(chip(266, 185, '200', t, T.RS1, fadeChips, large));
  if (t > T.DN0 && t < T.DN1 + 0.05) out.push(comet((tt) => along(RUN_M, easeInOut(span(tt, T.DN0, T.DN1))), t, T.DN0, C.paper, { len: 0.12, n: 14, head: 2.6, glow: 9, core: C.paper }));
  out.push(boxRing(N[1].x, N[1].y, N[1].w, N[1].h, t, T.DN0 + 0.22, 0.4, 10, C.paper, 1.2, 5));
  out.push(boxRing(N[0].x, N[0].y, N[0].w, N[0].h, t, T.DN1, 0.5, 16, C.react, 1.8, 5));
  out.push(flash(t, T.EV1, vb, C.react, 0.05, 0.06));
  out.push(flash(t, T.RS1, vb, C.paper, 0.045, 0.06));
  return out.join('');
}

/** The settled graphic: the edges, then each node's box, label and detail. */
export function staticFrame(layout: Layout, _vb: ViewBox): string {
  const phone = layout === 'phone';
  const boxes = phone ? PHONE_BOXES : DESKTOP_BOXES;
  const edges = phone ? mobileEdges : desktopEdges;
  return edgesGroup(edges, edges.map(() => C.lineStrong), phone ? 1.5 : 1) + boxes.map((b) => faceRect(b, b.lit ? C.react : C.lineStrong) + faceText(b, b.lit ? C.react : C.quiet, b.sub)).join('');
}

/** The workflow run: an event fires the trigger, the condition passes, the connector calls out and the run returns. */
export const timeline: Timeline = {
  duration: (layout) => (layout === 'desktop' ? DESKTOP.END : PHONE.END),
  viewBoxWidth: (layout) => (layout === 'desktop' ? 476 : 300),
  draw: (t, layout, vb) => {
    if (t >= (layout === 'desktop' ? DESKTOP.END : PHONE.END)) return staticFrame(layout, vb);
    return layout === 'desktop' ? drawDesktop(t, vb) : drawPhone(t, vb);
  },
};
