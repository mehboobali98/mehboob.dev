import { ghost, layouts, palette, slots, top as TOP, U } from '../../data/rackLayout';
import { bloom, boxRing, burst, cameraTransform, decode, easeInFx, flash, ring, shakeAt, svgText, type CameraKey, type ViewBox } from './fx';
import { clamp, easeInOut, easeOut, hash, lerp, mix, round2 as f, span, springOut } from './math';
import type { Layout, Timeline } from './overlay';

type Point = [number, number];
type Slot = (typeof slots)[number];

const C = { ink: '#0F1319', surface: '#202834', surface2: '#2A3342', line: '#404A5A', lineStrong: '#556274', quiet: '#8590A2', paper: '#F0EDE6', react: '#61DAFB' };

/** Beats in seconds, shared by both layouts: grab, drag, collision, recoil, scan, snap, shine, end. */
export const BEATS = { CUR0: 0.05, GRAB: 0.42, D0: 0.55, D1: 1.05, COLL: 1.05, RECOIL: 1.42, SC0: 1.5, SC1: 2.0, SNAP: 2.12, SHINE0: 2.4, SHINE1: 2.72, FADE0: 2.24, FADE1: 2.44, END: 4.4 } as const;

const B = BEATS;
const RACK_U = slots.reduce((sum, s) => sum + s.h, 0);
const slotY = (u: number): number => TOP + u * U + 2;
const uOf = (kind: string): number => slots.find((s) => s.kind === kind)?.u ?? 0;
const GAP = slotY(uOf('gap'));
const WALL = slotY(uOf('firewall'));
const FREE = slotY(ghost.u);
const MID = FREE + (ghost.h * U - 4) / 2;
const CAM: CameraKey[] = [
  { t: 0, x: 230, y: 139, s: 1 },
  { t: 0.9, x: 230, y: 139, s: 1 },
  { t: 1.12, x: 330, y: 110, s: 1.28 },
  { t: 2.05, x: 340, y: 136, s: 1.3 },
  { t: 2.45, x: 330, y: 136, s: 1.22 },
  { t: 3.05, x: 230, y: 139, s: 1 },
];

interface Rig {
  pal: number;
  rx: number;
  rw: number;
  x: number;
  sw: number;
  items: number;
}

const RIGS: Record<Layout, Rig> = {
  desktop: { pal: layouts[0].pal, rx: layouts[0].rackX, rw: layouts[0].rackW, x: layouts[0].rackX + 12, sw: layouts[0].rackW - 24, items: layouts[0].items },
  phone: { pal: layouts[1].pal, rx: layouts[1].rackX, rw: layouts[1].rackW, x: layouts[1].rackX + 12, sw: layouts[1].rackW - 24, items: layouts[1].items },
};

const settled = (v: number, eps = 0.02): number => (v < eps ? 0 : v);
const blend = (a: string, b: string, p: number): string => (p <= 0 ? a : p >= 1 ? b : mix(a, b, p));
const scale = (cx: number, cy: number, s: number, body: string): string =>
  s === 1 ? body : `<g transform="translate(${f(cx)} ${f(cy)}) scale(${s.toFixed(4)}) translate(${f(-cx)} ${f(-cy)})">${body}</g>`;

function device(r: Rig, s: Slot, glow: number, jolt: number): string {
  const { x, sw } = r;
  const y = slotY(s.u);
  const dh = s.h * U - 4;
  const mid = y + dh / 2;
  const g = [`<rect x="${f(x)}" y="${f(y)}" width="${f(sw)}" height="${f(dh)}" rx="2" fill="${C.surface}" stroke="${blend(C.line, C.paper, glow)}" stroke-width="${f(1 + glow)}"/>`];
  if (s.kind === 'switch') for (let i = 0; i < Math.floor((sw - 16) / 10); i++) g.push(`<rect x="${f(x + 8 + i * 10)}" y="${f(mid - 3)}" width="6" height="6" rx="1" fill="${C.lineStrong}"/>`);
  if (s.kind === 'firewall') g.push(`<circle cx="${f(x + 10)}" cy="${f(mid)}" r="2" fill="${C.quiet}"/><circle cx="${f(x + 18)}" cy="${f(mid)}" r="2" fill="${C.quiet}"/><rect x="${f(x + sw - 40)}" y="${f(mid - 2)}" width="30" height="4" rx="1" fill="${C.lineStrong}"/>`);
  if (s.kind === 'server') {
    for (let i = 0; i < 6; i++) g.push(`<rect x="${f(x + 8 + i * 12)}" y="${f(y + 6)}" width="8" height="${f(dh - 12)}" rx="1.5" fill="${C.lineStrong}"/>`);
    g.push(`<circle cx="${f(x + sw - 12)}" cy="${f(mid)}" r="3" fill="none" stroke="${C.quiet}" stroke-width="1.5"/>`);
  }
  if (s.kind === 'blank') g.push(`<circle cx="${f(x + 6)}" cy="${f(mid)}" r="1.5" fill="${C.lineStrong}"/><circle cx="${f(x + sw - 6)}" cy="${f(mid)}" r="1.5" fill="${C.lineStrong}"/>`);
  if (s.kind === 'ups') {
    g.push(`<rect x="${f(x + 8)}" y="${f(mid - 7)}" width="30" height="14" rx="1.5" fill="${C.line}"/>`);
    for (let i = 0; i < 3; i++) g.push(`<circle cx="${f(x + sw - 12 - i * 9)}" cy="${f(mid)}" r="2" fill="${C.quiet}"/>`);
  }
  if (glow > 0.05) g.push(`<rect x="${f(x)}" y="${f(y)}" width="${f(sw)}" height="${f(dh)}" rx="2" fill="url(#fx-hatch)" opacity="${f(glow)}"/>`);
  return jolt ? `<g transform="translate(${f(jolt)} 0)">${g.join('')}</g>` : g.join('');
}

const paletteItem = (r: Rig, i: number, stroke: string, ink: string): string => {
  const y = TOP + i * 46;
  return `<rect x="0.75" y="${f(y + 0.75)}" width="${f(r.pal - 1.5)}" height="34.5" rx="4" fill="${C.surface}" stroke="${stroke}" stroke-width="1.5"/>` + svgText(10, y + 22, palette[i].name, 13, ink) + svgText(r.pal - 10, y + 22, palette[i].size, 12, C.quiet, 'text-anchor="end"');
};

const labels = (r: Rig): string => svgText(0, 18, 'Palette', 12, C.quiet) + svgText(r.rx, 18, `Rack, ${RACK_U}U`, 12, C.quiet);

const outline = (r: Rig): string =>
  `<rect x="${f(r.rx + 0.75)}" y="${TOP - 6}" width="${f(r.rw - 1.5)}" height="${RACK_U * U + 12}" rx="4" fill="none" stroke="${C.lineStrong}" stroke-width="1.5"/>`;

const gapText = (r: Rig, s: Slot, dx: number, text: string, ink: string): string => svgText(r.x + 8 + dx, slotY(s.u) + (s.h * U - 4) / 2 + 4, text, 12, ink);

const ghostSlot = (r: Rig, s: Slot, sc: number, text: string): string => {
  const y = slotY(s.u);
  const dh = s.h * U - 4;
  const mid = y + dh / 2;
  return scale(r.x + r.sw / 2, mid, sc, `<rect x="${f(r.x)}" y="${f(y)}" width="${f(r.sw)}" height="${f(dh)}" rx="2" fill="${C.react}" fill-opacity="0.1" stroke="${C.react}" stroke-width="1.5" stroke-dasharray="4 3"/>${svgText(r.x + 10, mid + 5, text, 13, C.react)}`);
};

const dropPath = (r: Rig, a: Point, o: number): string => {
  const b = (a[0] - r.pal) / 2;
  return `<path d="M${r.pal} ${TOP + 18} C${f(r.pal + b)} ${TOP + 18} ${f(a[0] - b)} ${f(a[1])} ${f(a[0])} ${f(a[1])}" fill="none" stroke="${C.react}" stroke-width="1.5" stroke-dasharray="3 4" opacity="${f(o)}"/>`;
};

const dot = (r: Rig, rad: number): string => `<circle cx="${f(r.x)}" cy="${f(MID)}" r="${f(rad)}" fill="${C.react}"/>`;

const scanY = (t: number): number => lerp(WALL - 2, FREE - 2, easeInOut(span(t, B.SC0, B.SC1)));

function anchorAt(r: Rig, t: number): Point | null {
  if (t < B.GRAB) return null;
  if (t < B.D0) return [r.pal - 12 * easeOut(span(t, B.GRAB, B.D0)), TOP + 18 - 6 * easeOut(span(t, B.GRAB, B.D0))];
  if (t < B.D1) {
    const m = easeInOut(span(t, B.D0, B.D1));
    return [lerp(r.pal - 12, r.x, m), lerp(TOP + 12, GAP + 18, m) - Math.sin(Math.PI * m) * 30];
  }
  if (t < B.RECOIL) return [r.x - 6 * Math.sin(Math.PI * span(t, B.COLL, B.RECOIL)), GAP + 18 - 8 * Math.sin(Math.PI * span(t, B.COLL, B.RECOIL))];
  if (t < B.SC0) return [r.x, GAP + 18];
  if (t < B.SNAP - 0.12) return [r.x, Math.max(GAP + 18, scanY(t - 0.06) + 18)];
  if (t < B.SNAP) return [r.x, lerp(scanY(B.SNAP - 0.18) + 18, MID, easeInFx(span(t, B.SNAP - 0.12, B.SNAP)))];
  return [r.x, MID];
}

function card(r: Rig, tt: number, alpha: number, outlineOnly: boolean): string {
  const a = anchorAt(r, tt);
  if (!a) return '';
  const w = r.pal - 1.5;
  const lift = easeOut(span(tt, B.GRAB, B.D0)) * (1 - span(tt, B.SNAP - 0.04, B.SNAP));
  const vx = (a[0] - (anchorAt(r, tt - 0.02) ?? a)[0]) / 0.02;
  const rot = clamp(vx / 260, -1, 1) * 7 - 3 * lift;
  const over = span(a[0], r.pal + 30, r.x);
  const land = tt > B.SNAP ? springOut(tt - B.SNAP, 1) : 0;
  const base = lerp(1, 1.08, lift) * lerp(1, 0.94, over);
  const fade = 1 - easeInOut(span(tt, B.FADE0, B.FADE1));
  const tf = `translate(${f(a[0] + w / 2)} ${f(a[1])}) rotate(${f(rot)}) scale(${(base * (1 + 0.08 * land)).toFixed(3)} ${(base * (1 - 0.14 * land)).toFixed(3)})`;
  if (outlineOnly) return `<g opacity="${f(alpha * fade)}" transform="${tf}"><rect x="${f(-w / 2)}" y="-17.25" width="${f(w)}" height="34.5" rx="4" fill="none" stroke="${C.react}" stroke-width="1"/></g>`;
  return (
    `<g opacity="${f(fade * lerp(1, 0.92, over))}" transform="${tf}">` +
    `<rect x="${f(-w / 2 + 4)}" y="${f(-17.25 + 7 * lift)}" width="${f(w)}" height="34.5" rx="4" fill="#000" opacity="${f(0.55 * lift)}"/>` +
    `<rect x="${f(-w / 2 - 2)}" y="-19.25" width="${f(w + 4)}" height="38.5" rx="5" fill="none" stroke="${C.react}" stroke-width="4" opacity="${f(0.35 * lift)}" filter="url(#fx-glow)"/>` +
    `<rect x="${f(-w / 2)}" y="-17.25" width="${f(w)}" height="34.5" rx="4" fill="${C.surface2}" stroke="${C.react}" stroke-width="1.5"/>` +
    svgText(-w / 2 + 9.25, 4.75, palette[0].name, 13, C.react) +
    svgText(w / 2 - 9.25, 4.75, palette[0].size, 12, C.quiet, 'text-anchor="end"') +
    `</g>`
  );
}

function view(t: number, vb: ViewBox): string {
  const sh = settled(shakeAt(t, [B.COLL], 2.2, 10) + shakeAt(t, [B.SNAP], 2.4, 9));
  const punch = settled(t > B.SNAP ? 0.05 * Math.exp(-(t - B.SNAP) * 8) : 0, 1e-4);
  const tf = cameraTransform(CAM, t, vb, sh);
  if (!punch) return tf;
  const cx = vb.x + vb.w / 2;
  const cy = vb.y + vb.h / 2;
  return `translate(${f(cx)} ${f(cy)}) scale(${(1 + punch).toFixed(4)}) translate(${f(-cx)} ${f(-cy)}) ${tf}`.trim();
}

function drawRack(t: number, layout: Layout, vb: ViewBox): string {
  const r = RIGS[layout];
  const { x, sw } = r;
  const out: string[] = [labels(r)];
  const hover = span(t, 0.28, 0.36);
  const lit = span(t, B.GRAB, B.GRAB + 0.05);
  for (let i = 0; i < r.items; i++) {
    const item = palette[i];
    const L = item.lit ? lit : 0;
    const H = item.lit ? hover * (1 - lit) : 0;
    if (item.lit && t > B.GRAB && t < B.GRAB + 0.6) out.push(`<rect x="-1" y="${TOP + i * 46 - 1}" width="${r.pal + 2}" height="38" rx="5" fill="none" stroke="${C.react}" stroke-width="4" opacity="${f(0.5 * Math.exp(-(t - B.GRAB) * 5))}" filter="url(#fx-glow)"/>`);
    out.push(paletteItem(r, i, blend(blend(C.line, C.lineStrong, H), C.react, L), blend(C.paper, C.react, L)));
  }
  out.push(outline(r));

  const sweep = t > B.SC0 && t < B.SC1 + 0.1 ? scanY(t) : null;
  const glowOf = (s: Slot): number => {
    let g = s.kind === 'firewall' && t > B.COLL && t < B.RECOIL + 0.2 ? Math.exp(-(t - B.COLL) * 5) : 0;
    if (sweep !== null && s.u >= uOf('firewall') && s.u < ghost.u && sweep > slotY(s.u) - 1) g = Math.max(g, 0.9 * clamp(1 - (sweep - (slotY(s.u) + s.h * U - 4)) / 30));
    return clamp(g);
  };
  const jolt = t > B.COLL && t < B.COLL + 0.3 ? Math.sin((t - B.COLL) * 90) * 2.2 * Math.exp(-(t - B.COLL) * 12) : 0;
  const lockU = t - B.SNAP;
  for (const s of slots) {
    if (s.kind === 'gap') {
      const d = span(t, B.COLL + 0.06, B.COLL + 0.36);
      const busy = d > 0 && d < 1;
      out.push(gapText(r, s, busy ? (hash(Math.floor(t * 40), 9) - 0.5) * 3 : 0, decode('1U free, too short', d, 5, t), blend(C.quiet, C.paper, busy ? 0.6 : 0)));
    } else if (s.kind === 'ghost') {
      if (lockU <= 0) continue;
      out.push(ghostSlot(r, s, 1 + springOut(lockU, 0.08), decode('Server 2U', span(t, B.SNAP + 0.04, B.SNAP + 0.3), 8, t)));
      if (t > B.SHINE0 && t < B.SHINE1) {
        const y = slotY(s.u);
        const dh = s.h * U - 4;
        const sx = lerp(x - 40, x + sw + 40, easeInOut(span(t, B.SHINE0, B.SHINE1)));
        out.push(`<clipPath id="fx-rack-shine"><rect x="${f(x)}" y="${f(y)}" width="${f(sw)}" height="${f(dh)}" rx="2"/></clipPath><g clip-path="url(#fx-rack-shine)"><path d="M${f(sx - 12)} ${f(y - 2)} L${f(sx + 8)} ${f(y - 2)} L${f(sx - 8)} ${f(y + dh + 2)} L${f(sx - 28)} ${f(y + dh + 2)} Z" fill="${C.paper}" opacity="0.3"/></g>`);
      }
    } else {
      out.push(device(r, s, glowOf(s), s.kind === 'firewall' ? jolt : 0));
    }
  }

  if (t > B.COLL && t < B.RECOIL + 0.06) {
    const sh = Math.sin((t - B.COLL) * 80) * 5 * Math.exp(-(t - B.COLL) * 6);
    const flick = t > B.RECOIL - 0.08 ? (Math.floor(t * 60) % 2 ? 0.2 : 1) : 1;
    out.push(`<g opacity="${f(flick)}"><rect x="${f(x + sh)}" y="${f(GAP)}" width="${f(sw)}" height="${2 * U - 4}" rx="2" fill="${C.paper}" fill-opacity="0.06" stroke="${C.paper}" stroke-width="1.5" stroke-dasharray="4 3"/><rect x="${f(x + sh)}" y="${f(WALL)}" width="${f(sw)}" height="${U - 4}" rx="2" fill="url(#fx-hatch)" opacity="${f(Math.exp(-(t - B.COLL) * 3))}"/></g>`);
    out.push(burst(x + sw / 2, WALL, t, B.COLL, 61, C.paper, { n: 16, speed: 90, grav: 80, life: 0.5, spread: Math.PI, dir: -Math.PI / 2 }));
  }
  out.push(bloom(x + sw / 2, WALL, t, B.COLL, 26, C.paper, 0.45, 7));
  if (sweep !== null) {
    const o = 1 - span(t, B.SC1, B.SC1 + 0.1);
    out.push(`<rect x="${f(x - 4)}" y="${f(sweep - 22)}" width="${f(sw + 8)}" height="22" fill="${C.react}" opacity="${f(0.08 * o)}"/><line x1="${f(x - 6)}" y1="${f(sweep)}" x2="${f(x + sw + 6)}" y2="${f(sweep)}" stroke="${C.react}" stroke-width="5" opacity="${f(0.4 * o)}" filter="url(#fx-glow)"/><line x1="${f(x - 6)}" y1="${f(sweep)}" x2="${f(x + sw + 6)}" y2="${f(sweep)}" stroke="${mix(C.react, C.paper, 0.4)}" stroke-width="1.3" opacity="${f(o)}"/>`);
  }
  if (t > B.SC1 - 0.05 && t < B.SNAP + 0.5) {
    const o = Math.min(span(t, B.SC1 - 0.05, B.SC1 + 0.08), 1 - span(t, B.SNAP + 0.05, B.SNAP + 0.5));
    out.push(`<rect x="${f(x)}" y="${f(vb.y)}" width="${f(sw)}" height="${f(FREE + 36 - vb.y)}" fill="${C.react}" opacity="${f(0.07 * o)}"/><rect x="${f(x)}" y="${f(FREE)}" width="${f(sw)}" height="36" rx="2" fill="${C.react}" opacity="${f(0.22 * o)}" filter="url(#fx-glow)"/><rect x="${f(x)}" y="${f(FREE)}" width="${f(sw)}" height="36" rx="2" fill="none" stroke="${C.react}" stroke-width="1.5" opacity="${f(o)}"/>`);
  }
  const anchor = anchorAt(r, t);
  if (anchor && t >= B.D0) out.push(dropPath(r, anchor, span(t, B.D0, B.D0 + 0.15)));
  if (t >= B.SNAP) {
    out.push(dot(r, 3 * (1 + springOut(lockU, 0.8))));
    out.push(ring(x + sw / 2, MID, lockU, 0.6, 24, 300, C.react, 2.4, 0.7));
    out.push(ring(x + sw / 2, MID, lockU - 0.07, 0.55, 24, 180, C.paper, 1.4, 0.45));
    out.push(boxRing(x, FREE, sw, 36, t, B.SNAP, 0.45, 14, C.react, 2, 2));
    out.push(burst(x + sw / 2, MID, t, B.SNAP, 33, C.react, { n: 22, speed: 120, grav: 70, life: 0.6 }));
    out.push(bloom(x + sw / 2, MID, t, B.SNAP, 40, C.react, 0.55, 5));
  }
  if (t >= B.GRAB && t < B.FADE1) {
    if (t > B.D0 && t < B.D1 + 0.1) for (let k = 3; k >= 1; k--) out.push(card(r, t - k * 0.035, 0.35 * (1 - k / 4), true));
    out.push(card(r, t, 1, false));
  }
  if (t > B.CUR0 && t < B.FADE1) {
    let cx: number;
    let cy: number;
    if (t < B.GRAB) {
      const m = easeInOut(span(t, B.CUR0, 0.36));
      cx = lerp(-60, 60, m);
      cy = lerp(200, 52, m);
    } else {
      const a = anchor ?? [x, MID];
      cx = t >= B.SNAP ? lerp(x + 2, x + 40, easeOut(span(t, B.SNAP, B.SNAP + 0.3))) : a[0] + 2;
      cy = a[1] + 4;
    }
    const press = t > B.GRAB - 0.03 && t < B.GRAB + 0.1 ? 0.85 : 1;
    out.push(`<g opacity="${f(1 - span(t, B.FADE0, B.FADE1))}" transform="translate(${f(cx)} ${f(cy)}) scale(${press})"><path d="M0 0 L0 14 L3.6 10.4 L6.2 16 L8.4 15 L5.8 9.6 L10.6 9.6 Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="0.9" stroke-linejoin="round"/></g>`);
    out.push(ring(60, 52, t - B.GRAB, 0.35, 3, 18, C.paper, 1.2, 0.8));
  }
  out.push(flash(t, B.SNAP, vb, C.react, 0.06, 0.07));
  out.push(flash(t, B.COLL, vb, C.paper, 0.06, 0.06));

  if (layout === 'phone') return out.join('');
  const tf = view(t, vb);
  return tf ? `<g transform="${tf}">${out.join('')}</g>` : out.join('');
}

/** The settled editor: labels, palette, rack, slots with the landed server, then the drop path and its dot. */
export function staticFrame(layout: Layout, _vb: ViewBox): string {
  const r = RIGS[layout];
  const items = Array.from({ length: r.items }, (_, i) => paletteItem(r, i, palette[i].lit ? C.react : C.line, palette[i].lit ? C.react : C.paper));
  const rack = slots.map((s) => (s.kind === 'gap' ? gapText(r, s, 0, '1U free, too short', C.quiet) : s.kind === 'ghost' ? ghostSlot(r, s, 1, 'Server 2U') : device(r, s, 0, 0)));
  return labels(r) + items.join('') + outline(r) + rack.join('') + dropPath(r, [r.x, MID], 1) + dot(r, 3);
}

/** The rack editor's slot logic: the server bounces off a 1U gap, scans down and snaps into the free 2U slot. */
export const timeline: Timeline = {
  duration: () => B.END,
  viewBoxWidth: (layout) => (layout === 'desktop' ? layouts[0].width : layouts[1].width),
  draw: (t, layout, vb) => (t >= B.END ? staticFrame(layout, vb) : drawRack(t, layout, vb)),
};
