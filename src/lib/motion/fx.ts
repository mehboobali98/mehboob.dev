import { clamp, easeInOut, easeOut, hash, lerp, round2, span, springOut } from './math';

/** Font family for every effect that renders text. */
export const MONO = 'var(--font-mono)';

export type ViewBox = { x: number; y: number; w: number; h: number };

export type CameraKey = { t: number; x: number; y: number; s: number; ease?: (p: number) => number };

type Point = [number, number];

/** Shared glow, bloom and hatch defs; reference as url(#fx-glow), url(#fx-bloom), url(#fx-hatch). */
export const FX_DEFS =
  '<filter id="fx-glow" x="-300%" y="-300%" width="700%" height="700%"><feGaussianBlur stdDeviation="3"/></filter>' +
  '<filter id="fx-bloom" x="-300%" y="-300%" width="700%" height="700%"><feGaussianBlur stdDeviation="9"/></filter>' +
  '<pattern id="fx-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="#F0EDE6" stroke-width="1.2" opacity="0.55"/></pattern>';

const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghkmnpqrstuvwxyz0123456789-=+<>#';

/** Power ease-in matching the storyboards' curve; math.ts's easeIn defaults to power 3 for phase 1. */
export const easeInFx = (p: number): number => Math.pow(clamp(p), 2.4);

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Resolves text left to right; unresolved characters cycle through seeded glyphs. */
export function decode(text: string, p: number, seed: number, t: number): string {
  if (p >= 1) return text;
  if (p <= 0) return '';
  const n = text.length;
  const shown = Math.ceil(n * Math.min(1, p * 1.6));
  const fixed = Math.floor(n * p);
  let out = '';
  for (let i = 0; i < shown; i++) {
    const ch = text[i];
    out += i < fixed || ch === ' ' ? ch : GLYPHS[Math.floor(hash(seed * 31 + i, Math.floor(t * 30)) * GLYPHS.length)];
  }
  return out;
}

/** Keeps the text's length: resolved characters left to right, the rest cycle through seeded glyphs. */
export function scramble(text: string, p: number, seed: number, t: number): string {
  if (p >= 1) return text;
  const fixed = Math.floor(text.length * clamp(p));
  return [...text]
    .map((ch, i) => (i < fixed || ch === ' ' || ch === '.' ? ch : GLYPHS[Math.floor(hash(seed * 31 + i, Math.floor(t * 30)) * GLYPHS.length)]))
    .join('');
}

/** Expanding ring that eases out and fades across u in [0, dur]. */
export function ring(x: number, y: number, u: number, dur: number, r0: number, r1: number, color: string, w = 1.6, o = 0.9): string {
  const v = u / dur;
  if (v <= 0 || v >= 1) return '';
  return `<circle cx="${round2(x)}" cy="${round2(y)}" r="${round2(r0 + (r1 - r0) * easeOut(v))}" fill="none" stroke="${color}" stroke-width="${round2(w * (1 - v) + 0.2)}" opacity="${round2(o * (1 - v))}"/>`;
}

/** Radiating spark lines that fade out over 0.4 s from u = 0. */
export function sparks(x: number, y: number, u: number, seed: number, color: string, n = 6, dist = 16): string {
  if (u <= 0 || u >= 0.4) return '';
  const v = u / 0.4;
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = hash(seed, i) * Math.PI * 2;
    const d = dist * (0.6 + 0.6 * hash(seed + 7, i)) * easeOut(v);
    const x2 = x + Math.cos(a) * d;
    const y2 = y + Math.sin(a) * d;
    const x1 = x + Math.cos(a) * d * 0.55;
    const y1 = y + Math.sin(a) * d * 0.55;
    s += `<line x1="${round2(x1)}" y1="${round2(y1)}" x2="${round2(x2)}" y2="${round2(y2)}" stroke="${color}" stroke-width="1.2" stroke-linecap="round" opacity="${round2(1 - v)}"/>`;
  }
  return s;
}

/** A single SVG text element in the mono font, or '' for empty text. */
export const svgText = (x: number, y: number, s: string, size: number, color: string, extra = ''): string =>
  s ? `<text x="${round2(x)}" y="${round2(y)}" font-family="${MONO}" font-size="${round2(size)}" fill="${color}" ${extra}>${esc(s)}</text>` : '';

/** Point at fraction p along a polyline of [x, y] points. */
export function along(pts: Point[], p: number): Point {
  const lens = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
  const total = lens.reduce((sum, len) => sum + len, 0);
  let d = clamp(p) * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const k = lens[i] ? d / lens[i] : 0;
      return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)];
    }
    d -= lens[i];
  }
  return pts[pts.length - 1];
}

/** Point on a cubic Bezier at u in [0, 1]. */
export function cubic(p0: Point, p1: Point, p2: Point, p3: Point, u: number): Point {
  const m = 1 - u;
  return [0, 1].map(
    (k) => m * m * m * p0[k] + 3 * m * m * u * p1[k] + 3 * m * u * u * p2[k] + u * u * u * p3[k],
  ) as Point;
}

/** Eased camera transform between keyframes, clamped to stay inside vb, with optional seeded shake; '' once settled. */
export function cameraTransform(keys: CameraKey[], t: number, vb: ViewBox, shake = 0): string {
  let a = keys[0];
  let b = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (t >= keys[i].t && t <= keys[i + 1].t) {
      a = keys[i];
      b = keys[i + 1];
      break;
    }
  }
  if (t < keys[0].t) b = a;
  if (t > keys[keys.length - 1].t) a = b;
  const p = a === b ? 1 : (a.ease ?? easeInOut)((t - a.t) / (b.t - a.t));
  const s = lerp(a.s, b.s, p);
  const vw = vb.w / s;
  const vh = vb.h / s;
  const x = clamp(lerp(a.x, b.x, p), vb.x + vw / 2, vb.x + vb.w - vw / 2);
  const y = clamp(lerp(a.y, b.y, p), vb.y + vh / 2, vb.y + vb.h - vh / 2);
  const cx = vb.x + vb.w / 2;
  const cy = vb.y + vb.h / 2;
  const sx = shake ? (hash(Math.floor(t * 60), 1) - 0.5) * 2 * shake : 0;
  const sy = shake ? (hash(Math.floor(t * 60), 2) - 0.5) * 2 * shake : 0;
  if (s === 1 && Math.abs(x - cx) < 0.005 && Math.abs(y - cy) < 0.005 && !sx && !sy) return '';
  return `translate(${round2(cx + sx)} ${round2(cy + sy)}) scale(${s.toFixed(4)}) translate(${round2(-x)} ${round2(-y)})`;
}

/** Decaying shake amplitude from a list of impact times. */
export const shakeAt = (t: number, hits: number[], amp = 1.6, decay = 9): number =>
  hits.reduce((m, h) => (t >= h ? Math.max(m, amp * Math.exp(-(t - h) * decay)) : m), 0);

/** Full-viewBox flash that fades out across an impact window. */
export function flash(t: number, at: number, vb: ViewBox, color = '#F0EDE6', peak = 0.16, dur = 0.12): string {
  const u = t - at;
  if (u < 0 || u > dur) return '';
  return `<rect x="${round2(vb.x - 50)}" y="${round2(vb.y - 50)}" width="${round2(vb.w + 100)}" height="${round2(vb.h + 100)}" fill="${color}" opacity="${round2(peak * (1 - u / dur))}"/>`;
}

/** Blurred disc that decays after an impact. */
export function bloom(x: number, y: number, t: number, at: number, r: number, color: string, peak = 0.7, decay = 5): string {
  const u = t - at;
  if (u < 0 || u > 0.9) return '';
  return `<circle cx="${round2(x)}" cy="${round2(y)}" r="${round2(r)}" fill="${color}" opacity="${round2(peak * Math.exp(-u * decay))}" filter="url(#fx-bloom)"/>`;
}

interface CometOptions {
  len?: number;
  n?: number;
  head?: number;
  glow?: number;
  core?: string;
}

/** Moving head with a streaked tail sampled from a position function. */
export function comet(pos: (t: number) => Point, t: number, from: number, color: string, opts: CometOptions = {}): string {
  const { len = 0.16, n = 14, head = 3, glow = 10, core = '#F0EDE6' } = opts;
  if (t < from) return '';
  let s = '';
  const pts: [Point, number][] = [];
  for (let k = n; k >= 0; k--) {
    const tk = t - (len * k) / n;
    if (tk >= from) pts.push([pos(tk), k]);
  }
  for (let i = 1; i < pts.length; i++) {
    const [[x1, y1]] = pts[i - 1];
    const [[x2, y2], k] = pts[i];
    const v = 1 - k / n;
    s += `<line x1="${round2(x1)}" y1="${round2(y1)}" x2="${round2(x2)}" y2="${round2(y2)}" stroke="${color}" stroke-width="${round2(head * 1.6 * v)}" stroke-linecap="round" opacity="${round2(0.85 * v * v)}"/>`;
  }
  const [hx, hy] = pos(t);
  s += `<circle cx="${round2(hx)}" cy="${round2(hy)}" r="${round2(glow)}" fill="${color}" opacity="0.55" filter="url(#fx-glow)"/>`;
  s += `<circle cx="${round2(hx)}" cy="${round2(hy)}" r="${round2(head)}" fill="${core}"/>`;
  return s;
}

interface BurstOptions {
  n?: number;
  speed?: number;
  grav?: number;
  life?: number;
  size?: number;
  spread?: number;
  dir?: number;
}

/** Particle burst with gravity and drag. */
export function burst(x: number, y: number, t: number, at: number, seed: number, color: string, opts: BurstOptions = {}): string {
  const { n = 14, speed = 60, grav = 90, life = 0.6, size = 1.6, spread = Math.PI * 2, dir = 0 } = opts;
  const u = t - at;
  if (u <= 0 || u >= life) return '';
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = dir + (hash(seed, i) - 0.5) * spread;
    const v = speed * (0.4 + 0.8 * hash(seed + 3, i));
    const k = 1 - Math.exp(-u * 4);
    const px = x + ((Math.cos(a) * v * k) / 4) * 2.2;
    const py = y + ((Math.sin(a) * v * k) / 4) * 2.2 + 0.5 * grav * u * u;
    const o = 1 - u / life;
    s += `<circle cx="${round2(px)}" cy="${round2(py)}" r="${round2(size * (0.6 + 0.8 * hash(seed + 5, i)) * o + 0.2)}" fill="${hash(seed + 9, i) > 0.7 ? '#F0EDE6' : color}" opacity="${round2(o)}"/>`;
  }
  return s;
}

interface FlowOptions {
  n?: number;
  speed?: number;
  r?: number;
  o?: number;
}

/** Dots flowing along a polyline while active, fading in and out at the edges. */
export function flow(pts: Point[], t: number, from: number, to: number, color: string, opts: FlowOptions = {}): string {
  const { n = 6, speed = 0.9, r = 1.3, o = 0.7 } = opts;
  if (t < from || t > to) return '';
  const fade = Math.min(span(t, from, from + 0.15), 1 - span(t, to - 0.2, to));
  let s = '';
  for (let i = 0; i < n; i++) {
    const p = ((t - from) * speed + i / n) % 1;
    const [x, y] = along(pts, p);
    s += `<circle cx="${round2(x)}" cy="${round2(y)}" r="${round2(r)}" fill="${color}" opacity="${round2(o * fade * Math.sin(Math.PI * p))}"/>`;
  }
  return s;
}

/** Text that slams in with a fading glow copy, settling to plain text once t - at >= 1.2. */
export function slam(x: number, y: number, str: string, size: number, color: string, t: number, at: number, extra = '', anchor = 'start'): string {
  const u = t - at;
  if (u <= 0) return '';
  const anchored = anchor === 'start' ? extra : `text-anchor="${anchor}"${extra ? ` ${extra}` : ''}`;
  if (u >= 1.2) return svgText(x, y, str, size, color, anchored);
  const sc = 1 + springOut(u * 1.1, 0.7);
  const o = clamp(u / 0.06);
  const g =
    u < 0.6
      ? `<text x="0" y="0" font-family="${MONO}" font-size="${round2(size)}" fill="${color}" opacity="${round2(0.8 * Math.exp(-u * 5))}" filter="url(#fx-glow)" ${anchored}>${esc(str)}</text>`
      : '';
  return `<g transform="translate(${round2(x)} ${round2(y)}) scale(${sc.toFixed(3)})" opacity="${round2(o)}">${g}<text x="0" y="0" font-family="${MONO}" font-size="${round2(size)}" fill="${color}" ${anchored}>${esc(str)}</text></g>`;
}

/** Expanding rounded-rect shockwave around a box. */
export function boxRing(x: number, y: number, w: number, h: number, t: number, at: number, dur: number, grow: number, color: string, sw = 1.6, rx = 4): string {
  const v = (t - at) / dur;
  if (v <= 0 || v >= 1) return '';
  const g = grow * easeOut(v);
  return `<rect x="${round2(x - g)}" y="${round2(y - g)}" width="${round2(w + 2 * g)}" height="${round2(h + 2 * g)}" rx="${round2(rx + g / 2)}" fill="none" stroke="${color}" stroke-width="${round2(sw * (1 - v) + 0.2)}" opacity="${round2(0.9 * (1 - v))}"/>`;
}
