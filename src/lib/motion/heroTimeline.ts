import { mesh, meshNodes, start, work, type Point } from '../../data/heroGraph';
import { clamp, easeIn, easeInOut, easeOut, hash, lerp, spring } from './math';

export const DURATION = 3.6;
export const T0 = 0.55;
export const T1 = 2.35;
export const FOCUS0 = 1.95;
export const SPARK0 = 1.17;
export const SPARK1 = 1.62;
export const VIEW_CENTER: Point = { x: 312, y: 235 };

const pts: Point[] = [start, ...work];
const segLen = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y));
export const pathLength = segLen.reduce((a, b) => a + b, 0);
const cum = segLen.reduce<number[]>((acc, l) => [...acc, acc[acc.length - 1] + l], [0]);

/** Point at distance d along the career path. */
export function pathPoint(d: number): Point {
  const dd = clamp(d, 0, pathLength);
  let i = 0;
  while (i < segLen.length - 1 && dd > cum[i + 1]) i++;
  const u = (dd - cum[i]) / segLen[i];
  return { x: lerp(pts[i].x, pts[i + 1].x, u), y: lerp(pts[i].y, pts[i + 1].y, u) };
}

/** Vertices of the drawn path up to distance d. */
export function pathTo(d: number): Point[] {
  return [start, ...work.filter((_, i) => cum[i + 1] <= d), pathPoint(d)];
}

/** Fraction of the path the comet has covered at time t. */
export function progress(t: number): number {
  const p = clamp((t - T0) / (T1 - T0));
  return lerp(p, easeInOut(p), 0.55);
}

/** When the comet reaches each work node. */
export const hitTimes: number[] = work.map((_, i) => {
  const target = cum[i + 1] / pathLength;
  let lo = T0;
  let hi = T1;
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    if (progress(mid) < target) lo = mid;
    else hi = mid;
  }
  return hi;
});

export const T_LAST = hitTimes[hitTimes.length - 1];

const dist0 = meshNodes.map(([x, y]) => Math.hypot(x - start.x, y - start.y));
const maxDist = Math.max(...dist0);
const arrive = meshNodes.map((_, k) => 0.04 + 0.62 * (dist0[k] / maxDist));
const offsets = meshNodes.map((_, k) => {
  const a = hash(k, 1) * Math.PI * 2;
  const r = 28 + hash(k, 2) * 46;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
});

/** Mesh node k as the mesh assembles from scattered points. */
export function meshNodeAt(k: number, t: number): Point & { o: number } {
  const u = t - arrive[k];
  const s = Math.max(0, spring(u, 1));
  return { x: meshNodes[k][0] + offsets[k].x * s, y: meshNodes[k][1] + offsets[k].y * s, o: 0.35 + 0.65 * clamp(u / 0.15) };
}

const nodeIndex = (x: number, y: number): number => meshNodes.findIndex(([a, b]) => a === x && b === y);
const endpointAt = (x: number, y: number, t: number): Point => {
  const k = nodeIndex(x, y);
  return k >= 0 ? meshNodeAt(k, t) : { x, y };
};
const edgeStart = mesh.map(([x1, y1, x2, y2]) => {
  const a = nodeIndex(x1, y1);
  const b = nodeIndex(x2, y2);
  return Math.max(a >= 0 ? arrive[a] : 0.3, b >= 0 ? arrive[b] : 0.3) + 0.06;
});

/** Mesh edge i as drawn at time t, or null before it starts drawing. */
export function edgeAt(i: number, t: number): { a: Point; b: Point } | null {
  const p = easeOut((t - edgeStart[i]) / 0.35);
  if (p <= 0) return null;
  const [x1, y1, x2, y2] = mesh[i];
  const a = endpointAt(x1, y1, t);
  const b = endpointAt(x2, y2, t);
  return { a, b: { x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p) } };
}

const KEYS: [number, number, number, number][] = [
  [0, 150, 330, 1.16],
  [1.95, 312, 235, 1],
  [2.32, 330, 228, 1.045],
  [2.85, 312, 235, 1],
];

/** Camera centre and scale at time t, including the kick on each node hit. */
export function cameraAt(t: number): { cx: number; cy: number; s: number } {
  let i = KEYS.findIndex((k) => t < k[0]);
  if (i === -1) i = KEYS.length;
  const a = KEYS[Math.max(0, i - 1)];
  const b = KEYS[Math.min(KEYS.length - 1, i)];
  const p = a === b ? 1 : easeInOut((t - a[0]) / (b[0] - a[0]));
  const kick = hitTimes.reduce((sum, h, n) => {
    const u = t - h;
    if (u <= 0) return sum;
    return sum + (n === hitTimes.length - 1 ? 0.03 : 0.012) * Math.exp(-7 * u) * Math.cos(16 * u);
  }, 0);
  return { cx: lerp(a[1], b[1], p), cy: lerp(a[2], b[2], p), s: lerp(a[3], b[3], p) * (1 + kick) };
}

/** Where graph point p appears on screen, in viewBox units, through the camera at time t. */
export function throughCamera(p: Point, t: number): Point {
  const { cx, cy, s } = cameraAt(t);
  return { x: VIEW_CENTER.x + (p.x - cx) * s, y: VIEW_CENTER.y + (p.y - cy) * s };
}

/** How far the rest of the graph is dimmed for the spotlight, 0 to 0.62. */
export function focusAt(t: number): number {
  if (t < FOCUS0) return 0;
  if (t < T_LAST) return 0.62 * Math.pow(clamp((t - FOCUS0) / (T_LAST - FOCUS0)), 1.4);
  return 0.62 * Math.max(0, 1 - (t - T_LAST) / 0.12);
}

/** Ripple brightness for something d viewBox units from the last node. */
export function rippleAt(t: number, d: number): number {
  const rip = t - T_LAST;
  if (rip <= 0) return 0;
  const r = 620 * easeOut(rip / 1.1);
  return Math.exp(-Math.pow((r - d) / 45, 2)) * (1 - clamp(rip / 1));
}

/** Linear progress of the hero-wide ring, 0 to 1. */
export const ringProgress = (t: number): number => clamp((t - T_LAST) / 1.4);

/** Eased progress of the spark from the sync node to the stat. */
export const sparkProgress = (t: number): number => easeIn((t - SPARK0) / (SPARK1 - SPARK0), 2.2);

/** Stat flare intensity: a fast attack when the spark lands, then a decay. */
export function statFlare(t: number): number {
  const u = t - SPARK1;
  if (u <= 0) return 0;
  return u < 0.05 ? u / 0.05 : Math.exp(-(u - 0.05) * 3.2);
}

const GLYPHS = 'abcdefghijklmnopqrstuvwxyz0123456789<>/#*+=';

/** A label decoding from scrambled glyphs into its text after `at`. */
export function decode(text: string, t: number, at: number, seed: number): string {
  return [...text]
    .map((ch, i) => {
      if (t >= at + 0.1 + i * 0.045) return ch;
      if (t < at - 0.02) return '';
      return GLYPHS[Math.floor(hash(Math.floor(t * 30) + seed * 97, i) * GLYPHS.length)];
    })
    .join('');
}
