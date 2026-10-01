import { mesh, meshNodes, start, work, type Point } from '../../data/heroGraph';
import {
  DURATION, SPARK0, SPARK1, T0, T1, T_LAST, cameraAt, decode, edgeAt, focusAt, hitTimes, meshNodeAt,
  pathLength, pathPoint, pathTo, progress, rippleAt, ringProgress, sparkProgress, statFlare, throughCamera,
} from './heroTimeline';
import { clamp, easeOut, hash, mix, spring } from './math';
import type { Scene } from './scene';

const NS = 'http://www.w3.org/2000/svg';
const C = { line: '#404A5A', lineStrong: '#556274', paper: '#F0EDE6', signal: '#E0A84E' };
type Attrs = Record<string, string | number>;

function make<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Attrs = {}, parent?: Element): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  parent?.appendChild(node);
  return node;
}

const set = (node: Element, attrs: Attrs): void => {
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
};

const f = (n: number): string => n.toFixed(2);

function blur(defs: Element, id: string, std: number, box = '-100%'): void {
  const span = box === '-100%' ? '300%' : box === '-150%' ? '400%' : '200%';
  const filter = make('filter', { id, x: box, y: box, width: span, height: span }, defs);
  make('feGaussianBlur', { stdDeviation: std }, filter);
}

/** Builds the hero scene over the live hero, or returns null if the markup isn't there. */
export function createHeroScene(root: HTMLElement): Scene | null {
  const graph = root.querySelector<SVGSVGElement>('[data-hero-graph]');
  const burst = root.querySelector<SVGSVGElement>('[data-hero-burst]');
  const anchors = Array.from(root.querySelectorAll<SVGAElement>('[data-hero-graph] .hero-node'));
  const stats = Array.from(root.querySelectorAll<HTMLElement>('[data-hero-stat]'));
  const statics = Array.from(root.querySelectorAll<SVGElement>('[data-hero-static]'));
  const texts = anchors.map((a) => Array.from(a.querySelectorAll('text')));
  if (!graph || !burst || anchors.length !== work.length || stats.length === 0) return null;
  if (texts.some((pair) => pair.length < 2)) return null;
  const ctm = graph.getScreenCTM();
  if (!ctm) return null;

  const hero = root.getBoundingClientRect();
  const toHero = (p: Point): Point => {
    const q = new DOMPoint(p.x, p.y).matrixTransform(ctm);
    return { x: q.x - hero.left, y: q.y - hero.top };
  };

  const layer = make('g', { 'aria-hidden': 'true' }, graph);
  const defs = make('defs', {}, layer);
  blur(defs, 'hero-fx-glow', 4);
  blur(defs, 'hero-fx-glow-wide', 10, '-150%');
  const cam = make('g', {}, layer);
  const edgesG = make('g', {}, cam);
  const edges = mesh.map(() => make('line', {}, edgesG));
  const dotsG = make('g', {}, cam);
  const dots = meshNodes.map(() => make('circle', { r: 2.5 }, dotsG));
  const path = make('path', { fill: 'none', stroke: C.signal, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, cam);
  const fx = make('g', {}, cam);
  const startDot = make('circle', { cx: start.x, cy: start.y, r: 3.5, fill: C.signal }, cam);
  const nodes = work.map((n, i) => {
    const g = make('g', {}, cam);
    const halo = make('circle', { cx: n.x, cy: n.y, r: 15, fill: C.signal, 'fill-opacity': 0.12 }, g);
    const core = make('circle', { cx: n.x, cy: n.y, r: 5.5, fill: C.signal }, g);
    const label = texts[i][0].cloneNode(false) as SVGTextElement;
    const note = texts[i][1].cloneNode(false) as SVGTextElement;
    note.textContent = n.note;
    g.append(label, note);
    return { g, halo, core, label, note };
  });
  const comet = make('g', {}, cam);

  const w = hero.width;
  const h = hero.height;
  const impact = toHero(throughCamera(work[work.length - 1], T_LAST));
  burst.replaceChildren();
  set(burst, { viewBox: `0 0 ${f(w)} ${f(h)}` });
  const bDefs = make('defs', {}, burst);
  blur(bDefs, 'hero-burst-soft', 12, '-50%');
  blur(bDefs, 'hero-burst-blur6', 6);
  blur(bDefs, 'hero-burst-blur18', 18);
  const grad = make('radialGradient', { id: 'hero-burst-flash', gradientUnits: 'userSpaceOnUse', cx: f(impact.x), cy: f(impact.y), r: 760 }, bDefs);
  make('stop', { offset: 0, 'stop-color': C.signal, 'stop-opacity': 1 }, grad);
  make('stop', { offset: 0.35, 'stop-color': C.signal, 'stop-opacity': 0.18 }, grad);
  make('stop', { offset: 1, 'stop-color': C.signal, 'stop-opacity': 0 }, grad);
  const flash = make('rect', { width: f(w), height: f(h), fill: 'url(#hero-burst-flash)', opacity: 0 }, burst);
  const burstFx = make('g', {}, burst);
  const ringMax = Math.max(...[[0, 0], [w, 0], [0, h], [w, h]].map(([x, y]) => Math.hypot(x - impact.x, y - impact.y))) + 40;

  const statBox = stats[0].getBoundingClientRect();
  const stat = {
    x: statBox.left - hero.left + statBox.width / 2,
    y: statBox.top - hero.top + statBox.height / 2,
    w: statBox.width,
    h: statBox.height,
    right: statBox.right - hero.left,
  };
  const statCentres = stats.map((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left - hero.left + r.width / 2, y: r.top - hero.top + r.height / 2 };
  });
  stats[0].style.transformOrigin = 'center';

  const from = toHero(throughCamera(work[0], SPARK0));
  const to = { x: stat.right - 7, y: stat.y };
  const dx = from.x - to.x;
  const dy = to.y - from.y;
  const P: Point[] = [from, { x: from.x - 0.058 * dx, y: from.y + 0.768 * dy }, { x: to.x + 0.716 * dx, y: to.y }, to];
  const bez = (u: number): Point => {
    const v = 1 - u;
    return {
      x: v * v * v * P[0].x + 3 * v * v * u * P[1].x + 3 * v * u * u * P[2].x + u * u * u * P[3].x,
      y: v * v * v * P[0].y + 3 * v * v * u * P[1].y + 3 * v * u * u * P[2].y + u * u * u * P[3].y,
    };
  };

  const last = work[work.length - 1];

  const seek = (t: number): void => {
    const camT = cameraAt(t);
    set(cam, { transform: `translate(312 235) scale(${camT.s.toFixed(4)}) translate(${f(-camT.cx)} ${f(-camT.cy)})` });
    const focus = focusAt(t);

    mesh.forEach(([x1, y1, x2, y2], i) => {
      const e = edgeAt(i, t);
      if (!e) {
        set(edges[i], { opacity: 0 });
        return;
      }
      const b = rippleAt(t, Math.hypot((x1 + x2) / 2 - last.x, (y1 + y2) / 2 - last.y));
      set(edges[i], {
        x1: f(e.a.x), y1: f(e.a.y), x2: f(e.b.x), y2: f(e.b.y),
        stroke: mix(C.line, C.paper, b * 0.85),
        'stroke-width': f(1 + 1.3 * b),
        'stroke-opacity': f(0.75 + 0.25 * b),
        opacity: 1,
      });
    });
    meshNodes.forEach(([hx, hy], k) => {
      const p = meshNodeAt(k, t);
      const b = rippleAt(t, Math.hypot(hx - last.x, hy - last.y));
      set(dots[k], { cx: f(p.x), cy: f(p.y), r: f(2.5 + 1.5 * b), fill: mix(C.lineStrong, C.paper, b), opacity: f(p.o) });
    });
    set(edgesG, { opacity: f(1 - focus) });
    set(dotsG, { opacity: f(1 - focus) });

    const drawn = progress(t) * pathLength;
    set(path, { d: drawn > 0 ? pathTo(drawn).map((p, i) => `${i ? 'L' : 'M'}${f(p.x)},${f(p.y)}`).join(' ') : '', opacity: f(1 - focus) });
    set(startDot, { opacity: f(clamp((t - 0.3) / 0.15) * (1 - focus)) });

    const sparks: string[] = [];
    nodes.forEach((part, i) => {
      const n = work[i];
      const u = t - hitTimes[i];
      const big = i === work.length - 1;
      const s = u <= 0 ? 0 : Math.max(0, 1 + spring(u, -1));
      set(part.core, { transform: `translate(${n.x} ${n.y}) scale(${s.toFixed(3)}) translate(${-n.x} ${-n.y})` });
      set(part.halo, { transform: `translate(${n.x} ${n.y}) scale(${(u <= 0 ? 0 : easeOut(u / 0.35)).toFixed(3)}) translate(${-n.x} ${-n.y})` });
      part.label.textContent = decode(n.label, t, hitTimes[i], i + 1);
      const np = easeOut(clamp((u - 0.32) / 0.25));
      set(part.note, { opacity: f(np), transform: `translate(0 ${f((1 - np) * 6)})` });
      set(part.g, { opacity: f(big ? 1 : 1 - focus) });
      if (u <= 0 || u >= 1.1) return;
      const rings: [number, number][] = big ? [[0, 120], [0.09, 70]] : [[0, 46]];
      for (const [delay, size] of rings) {
        const v = clamp((u - delay) / (big ? 0.9 : 0.6));
        if (v <= 0 || v >= 1) continue;
        sparks.push(`<circle cx="${n.x}" cy="${n.y}" r="${f(6 + size * easeOut(v))}" fill="none" stroke="${C.signal}" stroke-width="${f(2.4 * (1 - v))}" opacity="${f(0.9 * (1 - v))}"/>`);
      }
      if (u < 0.18) sparks.push(`<circle cx="${n.x}" cy="${n.y}" r="${big ? 22 : 14}" fill="${C.paper}" opacity="${f(0.7 * (1 - u / 0.18))}" filter="url(#hero-fx-glow)"/>`);
      const count = big ? 16 : 9;
      for (let k = 0; k < count; k++) {
        const life = 0.5 + hash(i * 31 + k, 5) * 0.25;
        if (u > life) continue;
        const ang = hash(i * 31 + k, 6) * Math.PI * 2;
        const speed = (big ? 120 : 80) + hash(i * 31 + k, 7) * (big ? 130 : 70);
        const x = n.x + Math.cos(ang) * speed * u;
        const y = n.y + Math.sin(ang) * speed * u + 70 * u * u;
        const tx = x - Math.cos(ang) * speed * 0.04;
        const ty = y - (Math.sin(ang) * speed + 140 * u) * 0.04;
        sparks.push(`<line x1="${f(tx)}" y1="${f(ty)}" x2="${f(x)}" y2="${f(y)}" stroke="${k % 3 ? C.signal : C.paper}" stroke-width="1.6" stroke-linecap="round" opacity="${f(1 - u / life)}"/>`);
      }
    });
    fx.innerHTML = sparks.join('');

    const tail: string[] = [];
    if (t >= T0 - 0.05 && t <= T1 + 0.12) {
      const fade = 1 - clamp((t - T1) / 0.12);
      for (let k = 14; k >= 0; k--) {
        const p = pathPoint(drawn - k * 4.2);
        const wgt = 1 - k / 15;
        tail.push(`<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(1.2 + 3.2 * wgt)}" fill="${mix(C.signal, C.paper, wgt)}" opacity="${f(wgt * wgt * fade)}"/>`);
      }
      const head = pathPoint(drawn);
      tail.push(`<circle cx="${f(head.x)}" cy="${f(head.y)}" r="${f(11 + 14 * focus)}" fill="${C.signal}" opacity="${f((0.55 + 0.3 * focus) * fade)}" filter="url(#hero-fx-glow-wide)"/>`);
      tail.push(`<circle cx="${f(head.x)}" cy="${f(head.y)}" r="4.5" fill="${C.paper}" opacity="${f(fade)}"/>`);
    }
    comet.innerHTML = tail.join('');

    const b: string[] = [];
    if (t >= SPARK0 && t <= SPARK1 + 0.05) {
      const p = sparkProgress(t);
      const fade = 1 - clamp((t - SPARK1) / 0.05);
      for (let k = 18; k >= 0; k--) {
        const q = bez(clamp(p - k * 0.012));
        const wgt = 1 - k / 19;
        b.push(`<circle cx="${f(q.x)}" cy="${f(q.y)}" r="${f(1 + 3.4 * wgt)}" fill="${mix(C.signal, C.paper, wgt)}" opacity="${f(wgt * wgt * fade)}"/>`);
      }
      const hd = bez(p);
      b.push(`<circle cx="${f(hd.x)}" cy="${f(hd.y)}" r="14" fill="${C.signal}" opacity="${f(0.6 * fade)}" filter="url(#hero-burst-blur6)"/>`);
      b.push(`<circle cx="${f(hd.x)}" cy="${f(hd.y)}" r="4.5" fill="${C.paper}" opacity="${f(fade)}"/>`);
    }
    const flare = statFlare(t);
    if (flare > 0.01) {
      b.push(`<ellipse cx="${f(stat.x)}" cy="${f(stat.y)}" rx="${f(stat.w * 0.71)}" ry="${f(stat.h * 1.29)}" fill="${C.signal}" opacity="${f(0.5 * flare)}" filter="url(#hero-burst-blur18)"/>`);
      const u = t - SPARK1;
      if (u > 0 && u < 0.55) {
        const v = easeOut(u / 0.55);
        const lin = u / 0.55;
        b.push(`<ellipse cx="${f(stat.x)}" cy="${f(stat.y)}" rx="${f(stat.w * (0.54 + 0.6 * v))}" ry="${f(stat.h * (0.71 + 1.43 * v))}" fill="none" stroke="${C.signal}" stroke-width="${f(2.2 * (1 - lin))}" opacity="${f(0.8 * (1 - lin))}"/>`);
      }
    }
    const v = ringProgress(t);
    const live = t > T_LAST && v < 1;
    set(flash, { opacity: f(t > T_LAST ? 0.2 * Math.max(0, 1 - (t - T_LAST) / 0.7) : 0) });
    const ring = live ? 20 + (ringMax - 20) * easeOut(v) : 0;
    if (live) {
      b.push(`<circle cx="${f(impact.x)}" cy="${f(impact.y)}" r="${f(ring)}" fill="none" stroke="${C.signal}" stroke-width="34" opacity="${f(0.14 * (1 - v))}" filter="url(#hero-burst-soft)"/>`);
      b.push(`<circle cx="${f(impact.x)}" cy="${f(impact.y)}" r="${f(ring)}" fill="none" stroke="${C.signal}" stroke-width="${f(0.5 + 3 * (1 - v))}" opacity="${f(0.75 * (1 - v))}"/>`);
      const v2 = clamp((t - T_LAST - 0.12) / 1.3);
      if (v2 > 0 && v2 < 1) {
        b.push(`<circle cx="${f(impact.x)}" cy="${f(impact.y)}" r="${f(20 + (ringMax * 0.75 - 20) * easeOut(v2))}" fill="none" stroke="${C.paper}" stroke-width="${f(0.4 + 1.6 * (1 - v2))}" opacity="${f(0.4 * (1 - v2))}"/>`);
      }
    }
    burstFx.innerHTML = b.join('');

    stats.forEach((el, j) => {
      const d = Math.hypot(statCentres[j].x - impact.x, statCentres[j].y - impact.y);
      const sweep = live ? Math.exp(-Math.pow((ring - d) / 90, 2)) * (1 - v) : 0;
      const heat = Math.max(j === 0 ? 0.65 * flare : 0, 0.55 * sweep);
      el.style.color = heat > 0.01 ? mix(C.signal, C.paper, heat) : '';
      if (j === 0) {
        el.style.transform = flare > 0.01 ? `scale(${(1 + 0.07 * flare).toFixed(4)})` : '';
        el.style.textShadow = flare > 0.01 ? `0 0 ${f(18 * flare)}px rgba(224, 168, 78, ${f(0.8 * flare)})` : '';
      }
    });
  };

  const finish = (): void => {
    layer.remove();
    burst.replaceChildren();
    statics.forEach((el) => el.style.removeProperty('visibility'));
    stats.forEach((el) => {
      el.style.removeProperty('color');
      el.style.removeProperty('transform');
      el.style.removeProperty('text-shadow');
      el.style.removeProperty('transform-origin');
    });
  };

  graph.setAttribute('data-hero-scripted', '');
  statics.forEach((el) => el.style.setProperty('visibility', 'hidden'));
  root.querySelector('[data-hero-pending]')?.removeAttribute('data-hero-pending');

  return { duration: DURATION, seek, finish };
}
