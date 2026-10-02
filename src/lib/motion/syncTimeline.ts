import { clamp, easeIn, easeInOut, easeOut, lerp, spring } from './math';

export const A0 = 0.25;
export const A1 = 1.75;
export const SCAN0 = 1.85;
export const SCAN1 = 2.2;
export const DROP0 = 2.3;
export const ARRIVE = [2.52, 2.6, 2.68, 2.76] as const;
export const LANDED = ARRIVE[ARRIVE.length - 1];
export const REWIND0 = 2.3;
export const REWIND1 = 2.8;
export const DURATION = 3.8;
const STEPS = 10;

/** Before-bar progress: ten stutters, each a wait then a move. */
export function crawl(t: number): number {
  const u = clamp((t - A0) / (A1 - A0));
  if (u >= 1) return 1;
  const k = Math.floor(u * STEPS);
  const f = u * STEPS - k;
  return (k + easeInOut(clamp((f - 0.55) / 0.45))) / STEPS;
}

/** Hours shown by the clock: forward to 13.5 during the crawl, then rewound to 0.8. */
export function hoursAt(t: number): number {
  if (t < REWIND0) return 13.5 * crawl(t);
  return lerp(13.5, 0.8, easeInOut((t - REWIND0) / (REWIND1 - REWIND0)));
}

/** Whole hours shown by the counter. */
export function countShown(t: number): number {
  const p = crawl(t);
  return p >= 1 ? 12 : Math.floor(12 * p);
}

/** How far the unit has slid into place, and how visible the "-15" tail is. */
export function tailIn(t: number): { unit: number; tail: number } {
  const p = clamp((t - A1) / 0.3);
  return { unit: easeOut(p), tail: easeOut(clamp((p - 0.45) / 0.55)) };
}

/** Phase of the query pings during a wait, or null while moving or outside the crawl. */
export function pingPhase(t: number): number | null {
  if (t < A0 || t >= A1) return null;
  const u = clamp((t - A0) / (A1 - A0)) * STEPS;
  const f = u - Math.floor(u);
  return f < 0.55 ? f / 0.55 : null;
}

/** Y of the scan line in a panel of height h. */
export const scanY = (t: number, h: number): number => lerp(-20, h + 22, easeInOut((t - SCAN0) / (SCAN1 - SCAN0)));

/** Opacity of the brief freeze dim. */
export const dimAt = (t: number): number => (t >= A1 && t < SCAN0 + 0.05 ? 0.25 * Math.sin(Math.PI * clamp((t - A1) / 0.1)) : 0);

/** How far record i (of `dots`) has gathered into its batch. */
export const gatherAt = (i: number, dots: number, t: number): number => clamp((t - (SCAN0 + 0.12 + (dots - i) * 0.006)) / 0.32);

/** Eased progress of batch b's drop into the after bar. */
export const dropAt = (b: number, t: number): number => easeIn(clamp((t - (ARRIVE[b] - 0.22)) / 0.22), 2.4);

/** After-bar fill: four beats, one per arriving batch. */
export function afterFill(t: number): number {
  const filled = ARRIVE.filter((a) => t >= a).length;
  if (filled === 0) return 0;
  return Math.min(1, (filled - 1 + easeOut((t - ARRIVE[filled - 1]) / 0.07)) / ARRIVE.length);
}

/** Letter i of "Under 1": opacity, and drop offset as a fraction (1 = fully below). */
export function letterAt(i: number, t: number): { o: number; y: number } {
  const u = t - LANDED - i * 0.04;
  return { o: u <= 0 ? 0 : clamp(u / 0.08), y: u <= 0 ? 1 : spring(u, 1) };
}

/** Clock opacity: fades in at the start, out after the rewind. */
export const clockOpacity = (t: number): number => easeOut((t - 0.1) / 0.25) * (1 - easeInOut((t - 3.05) / 0.35));
