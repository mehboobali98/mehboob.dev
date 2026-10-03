/** Clamps v into [a, b]. */
export const clamp = (v: number, a = 0, b = 1): number => Math.min(b, Math.max(a, v));

/** Linear interpolation from a to b. */
export const lerp = (a: number, b: number, p: number): number => a + (b - a) * p;

/** Power ease-in, clamped to [0, 1]. */
export const easeIn = (p: number, power = 3): number => Math.pow(clamp(p), power);

/** Cubic ease-out, clamped to [0, 1]. */
export const easeOut = (p: number): number => 1 - Math.pow(1 - clamp(p), 3);

/** Cubic ease-in-out, clamped to [0, 1]. */
export const easeInOut = (p: number): number => {
  const q = clamp(p);
  return q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2;
};

/** Damped spring: amp before u = 0, then decays toward 0. */
export const spring = (u: number, amp: number): number => (u <= 0 ? amp : amp * Math.exp(-6 * u) * Math.cos(11 * u));

const channels = (hex: string): number[] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** Mixes two #rrggbb colours; p is clamped to [0, 1]. */
export function mix(a: string, b: string, p: number): string {
  const x = channels(a);
  const y = channels(b);
  const q = clamp(p);
  return '#' + x.map((v, i) => Math.round(lerp(v, y[i], q)).toString(16).padStart(2, '0')).join('');
}

/** Deterministic pseudo-random number in [0, 1) from two integers. */
export function hash(a: number, b = 0): number {
  let s = (a * 7919 + b * 104729 + 17) | 0;
  s = (s + 0x6d2b79f5) | 0;
  let r = Math.imul(s ^ (s >>> 15), 1 | s);
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
  return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
}

/** Progress of t from a to b, clamped to [0, 1]. */
export const span = (t: number, a: number, b: number): number => clamp((t - a) / (b - a));

/** Damped spring that is exactly zero after 1.2 s, so scenes settle precisely. */
export const springOut = (u: number, amp: number): number => (u <= 0 ? amp : u > 1.2 ? 0 : amp * Math.exp(-6 * u) * Math.cos(11 * u));

/** Overshooting 0 to 1 entrance driven by springOut. */
export const pop = (u: number): number => (u <= 0 ? 0 : 1 - springOut(u, 1));

/** Formats n with at most two decimals for SVG attributes. */
export const round2 = (n: number): string => (Math.round(n * 100) / 100).toString();
