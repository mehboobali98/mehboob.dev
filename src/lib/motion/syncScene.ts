import { clamp, easeInOut, easeOut, lerp, mix } from './math';
import type { Scene } from './scene';
import {
  A0, A1, ARRIVE, DROP0, DURATION, LANDED, REWIND0, REWIND1, SCAN0, SCAN1, afterFill, clockOpacity, countShown, crawl,
  dimAt, dropAt, gatherAt, hoursAt, letterAt, pingPhase, scanY, tailIn,
} from './syncTimeline';

const NS = 'http://www.w3.org/2000/svg';
const C = { void: '#07090C', ink: '#0F1319', lineStrong: '#556274', quiet: '#8590A2', paper: '#F0EDE6', mysql: '#3FA7C0' };

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Row {
  dd: HTMLElement;
  figure: HTMLElement;
  unit: HTMLElement;
  bar: HTMLElement;
}

const f = (n: number): string => n.toFixed(2);

function rowOf(dd: HTMLElement): Row | null {
  const figure = dd.querySelector<HTMLElement>('.runtime-figure');
  const unit = dd.querySelector<HTMLElement>('.runtime-unit');
  const bar = dd.querySelector<HTMLElement>('.runtime-bar');
  return figure && unit && bar ? { dd, figure, unit, bar } : null;
}

/** Builds the sync runtime-panel scene over the live panel, or returns null if the markup isn't there. */
export function createSyncScene(panel: HTMLElement): Scene | null {
  const rows = Array.from(panel.querySelectorAll<HTMLElement>(':scope > dl > dd')).map(rowOf);
  if (rows.length !== 2 || rows.some((r) => !r)) return null;
  const [before, after] = rows as [Row, Row];

  const panelRect = panel.getBoundingClientRect();
  const originX = panelRect.left + panel.clientLeft;
  const originY = panelRect.top + panel.clientTop;
  const rel = (el: Element): Box => {
    const r = el.getBoundingClientRect();
    return { x: r.left - originX, y: r.top - originY, w: r.width, h: r.height };
  };
  const width = panel.clientWidth;
  const height = panel.clientHeight;
  const bar1 = rel(before.bar);
  const bar2 = rel(after.bar);
  const fig1 = rel(before.figure);

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  Object.assign(host.style, { position: 'absolute', inset: '0', pointerEvents: 'none', overflow: 'hidden', borderRadius: 'inherit', zIndex: '2' });
  panel.append(host);

  const standIn = (row: Row): HTMLElement => {
    const box = rel(row.dd);
    const shell = row.dd.parentElement!.cloneNode(false) as HTMLElement;
    const clone = row.dd.cloneNode(true) as HTMLElement;
    clone.querySelector('.runtime-bar')?.remove();
    clone.style.margin = '0';
    Object.assign(shell.style, { position: 'absolute', left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, margin: '0' });
    shell.append(clone);
    host.append(shell);
    return clone;
  };

  const s1 = standIn(before);
  const fig1El = s1.querySelector<HTMLElement>('.runtime-figure')!;
  const unit1 = s1.querySelector<HTMLElement>('.runtime-unit')!;
  const text1 = before.figure.textContent ?? '';
  const cut = text1.search(/[–-]/);
  const count = document.createElement('span');
  const tail = document.createElement('span');
  count.textContent = cut > 0 ? text1.slice(0, cut) : text1;
  tail.textContent = cut > 0 ? text1.slice(cut) : '';
  count.style.display = 'inline-block';
  tail.style.display = 'inline-block';
  fig1El.replaceChildren(count, tail);
  unit1.style.display = 'inline-block';
  const countW = count.getBoundingClientRect().width;
  const tailW = tail.getBoundingClientRect().width;
  count.style.width = `${countW}px`;

  const s2 = standIn(after);
  const fig2El = s2.querySelector<HTMLElement>('.runtime-figure')!;
  s2.querySelector<HTMLElement>('.runtime-unit')!.style.visibility = 'hidden';
  const letters = [...(after.figure.textContent ?? '')].map((ch) => {
    const sp = document.createElement('span');
    sp.textContent = ch === ' ' ? '\u00a0' : ch;
    sp.style.display = 'inline-block';
    return sp;
  });
  fig2El.replaceChildren(...letters);

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${f(width)} ${f(height)}`);
  Object.assign(svg.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' });
  svg.innerHTML =
    `<defs><filter id="sync-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5"/></filter>` +
    `<filter id="sync-glow-wide" x="-100%" y="-300%" width="300%" height="700%"><feGaussianBlur stdDeviation="9"/></filter>` +
    `<linearGradient id="sync-scan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.mysql}" stop-opacity="0"/>` +
    `<stop offset="0.8" stop-color="${C.mysql}" stop-opacity="0.22"/><stop offset="1" stop-color="${C.mysql}" stop-opacity="0.9"/></linearGradient></defs><g></g>`;
  const layer = svg.querySelector('g')!;
  host.append(svg);

  before.figure.style.visibility = 'hidden';
  before.unit.style.visibility = 'hidden';
  after.figure.style.visibility = 'hidden';
  before.bar.style.transformOrigin = '0 50%';
  after.bar.style.transformOrigin = '0 50%';

  const showClock = width >= 520;
  const clock = { x: bar1.x + bar1.w - 80, y: fig1.y + 20, r: 40 };
  const dots = Math.min(22, Math.floor(bar1.w / 13));
  const spacing = Math.min(52, bar1.w / 5);
  const home = (b: number) => ({ x: bar1.x + bar1.w - 80 - (3 - b) * spacing, y: bar1.y + 42 });
  const midY = bar1.y + bar1.h / 2;

  const effects = (t: number): string[] => {
    const out: string[] = [];
    const p = crawl(t);
    const headX = bar1.x + p * bar1.w;

    if (t >= A0 && t < DROP0 + 0.6) {
      const sweep = scanY(t, height);
      for (let i = 0; i < dots; i++) {
        let x = headX - 6 - i * 13;
        if (x < bar1.x - 4 && t < A1) continue;
        x = Math.max(x, bar1.x + 4);
        const lit = t >= SCAN0 && sweep >= midY ? 1 : 0;
        const g = gatherAt(i, dots, t);
        const b = i % 4;
        const slot = Math.floor(i / 4);
        const hb = home(b);
        const hx = hb.x + (slot % 3) * 9 - 9;
        const hy = hb.y + Math.floor(slot / 3) * 9 - 4;
        let px = lerp(x, hx, easeInOut(g));
        let py = lerp(midY, hy, easeInOut(g)) - Math.sin(Math.PI * g) * 26;
        if (t >= DROP0) {
          const d = dropAt(b, t);
          if (d >= 1) continue;
          if (d > 0) {
            px = lerp(px, bar2.x + bar2.w * ((b + 0.5) / 4), d);
            py = lerp(py, bar2.y + bar2.h / 2, d);
          }
        }
        const size = g > 0 && g < 1 ? 6 : 5;
        out.push(`<rect x="${f(px - size / 2)}" y="${f(py - size / 2)}" width="${size}" height="${size}" rx="1.2" fill="${mix(C.quiet, C.mysql, Math.max(lit, g))}"/>`);
      }
      const ping = pingPhase(t);
      if (ping !== null) {
        for (let k = 0; k < 3; k++) {
          const pf = ping * 3 - k;
          if (pf <= 0 || pf >= 1) continue;
          const hx = headX - 6 - k * 13;
          out.push(`<line x1="${f(hx)}" y1="${f(bar1.y - 5 - pf * 10)}" x2="${f(hx)}" y2="${f(bar1.y - 14 - pf * 26)}" stroke="${C.paper}" stroke-width="1.8" stroke-linecap="round" opacity="${f(0.9 * (1 - pf))}"/>`);
          out.push(`<circle cx="${f(hx)}" cy="${f(bar1.y - 16 - pf * 30)}" r="2" fill="${C.paper}" opacity="${f(0.9 * (1 - pf))}"/>`);
        }
      }
      if (t >= SCAN0 + 0.3 && t <= DROP0) {
        const g = clamp((t - SCAN0 - 0.3) / 0.15) * (1 - clamp((t - DROP0 + 0.05) / 0.1));
        for (let b = 0; b < 4; b++) {
          const hb = home(b);
          out.push(`<rect x="${f(hb.x - 16)}" y="${f(hb.y - 11)}" width="32" height="22" rx="4" fill="none" stroke="${C.mysql}" stroke-width="1.2" opacity="${f(0.8 * g)}"/>`);
        }
      }
    }

    if (t >= SCAN0 && t <= SCAN1 + 0.05) {
      const y = scanY(t, height);
      out.push(`<rect x="0" y="${f(y - 60)}" width="${f(width)}" height="60" fill="url(#sync-scan)"/>`);
      out.push(`<line x1="0" y1="${f(y)}" x2="${f(width)}" y2="${f(y)}" stroke="${C.mysql}" stroke-width="1.5" opacity="0.95"/>`);
    }
    const dim = dimAt(t);
    if (dim > 0) out.push(`<rect x="0" y="0" width="${f(width)}" height="${f(height)}" fill="${C.void}" opacity="${f(dim)}"/>`);

    ARRIVE.forEach((a, k) => {
      const u = t - a;
      if (u <= 0 || u > 0.35) return;
      const x = bar2.x + bar2.w * ((k + 1) / 4);
      out.push(`<circle cx="${f(x)}" cy="${f(bar2.y + bar2.h / 2)}" r="${f(4 + 16 * easeOut(u / 0.35))}" fill="none" stroke="${C.mysql}" stroke-width="${f(1.8 * (1 - u / 0.35))}" opacity="${f(0.9 * (1 - u / 0.35))}"/>`);
    });
    const fu = t - LANDED;
    if (fu > 0 && fu < 0.75) {
      const v = fu / 0.75;
      const x = bar2.x + bar2.w;
      const y = bar2.y + bar2.h / 2;
      const r = 10 + 0.64 * width * easeOut(v);
      out.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="none" stroke="${C.mysql}" stroke-width="${f(0.6 + 3 * (1 - v))}" opacity="${f(0.75 * (1 - v))}"/>`);
      out.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="none" stroke="${C.mysql}" stroke-width="22" opacity="${f(0.12 * (1 - v))}" filter="url(#sync-glow)"/>`);
      out.push(`<rect x="${f(bar2.x - 4)}" y="${f(bar2.y - 4)}" width="${f(bar2.w + 8)}" height="${f(bar2.h + 8)}" rx="4" fill="${C.mysql}" opacity="${f(0.6 * Math.exp(-fu * 4))}" filter="url(#sync-glow-wide)"/>`);
    }

    const co = showClock ? clockOpacity(t) : 0;
    if (co > 0.005) {
      const hours = hoursAt(t);
      const rewinding = t > REWIND0 && t < REWIND1;
      const rim = mix(C.lineStrong, C.mysql, clamp((t - REWIND0) / 0.3));
      const appear = easeOut((t - 0.1) / 0.25);
      const gone = easeInOut((t - 3.05) / 0.35);
      const sc = lerp(0.85, 1, appear) * lerp(1, 0.85, gone);
      const g: string[] = [];
      g.push(`<circle cx="${f(clock.x)}" cy="${f(clock.y)}" r="${clock.r}" fill="${C.ink}" fill-opacity="0.45" stroke="${rim}" stroke-width="2"/>`);
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        g.push(`<line x1="${f(clock.x + Math.sin(a) * (clock.r - 7))}" y1="${f(clock.y - Math.cos(a) * (clock.r - 7))}" x2="${f(clock.x + Math.sin(a) * (clock.r - 3))}" y2="${f(clock.y - Math.cos(a) * (clock.r - 3))}" stroke="${C.lineStrong}" stroke-width="${k % 3 ? 1 : 1.8}"/>`);
      }
      if ((t > A0 && t < A1) || rewinding) {
        for (let k = 1; k <= 7; k++) {
          const am = (hoursAt(t - k * 0.012) % 1) * Math.PI * 2;
          g.push(`<line x1="${f(clock.x)}" y1="${f(clock.y)}" x2="${f(clock.x + Math.sin(am) * (clock.r - 9))}" y2="${f(clock.y - Math.cos(am) * (clock.r - 9))}" stroke="${rewinding ? C.mysql : C.quiet}" stroke-width="2" stroke-linecap="round" opacity="${f(0.3 * (1 - k / 8))}"/>`);
        }
      }
      const am = (hours % 1) * Math.PI * 2;
      const ah = (hours / 12) * Math.PI * 2;
      g.push(`<line x1="${f(clock.x)}" y1="${f(clock.y)}" x2="${f(clock.x + Math.sin(am) * (clock.r - 9))}" y2="${f(clock.y - Math.cos(am) * (clock.r - 9))}" stroke="${t > REWIND0 ? C.mysql : C.quiet}" stroke-width="2.2" stroke-linecap="round"/>`);
      g.push(`<line x1="${f(clock.x)}" y1="${f(clock.y)}" x2="${f(clock.x + Math.sin(ah) * (clock.r - 18))}" y2="${f(clock.y - Math.cos(ah) * (clock.r - 18))}" stroke="${C.paper}" stroke-width="3.4" stroke-linecap="round"/>`);
      g.push(`<circle cx="${f(clock.x)}" cy="${f(clock.y)}" r="3.2" fill="${C.paper}"/>`);
      const pu = t - REWIND1;
      if (pu > 0 && pu < 0.5) g.push(`<circle cx="${f(clock.x)}" cy="${f(clock.y)}" r="${f(clock.r + 30 * easeOut(pu / 0.5))}" fill="none" stroke="${C.mysql}" stroke-width="${f(2 * (1 - pu / 0.5))}" opacity="${f(0.8 * (1 - pu / 0.5))}"/>`);
      out.push(`<g opacity="${f(co)}" transform="translate(${f(clock.x)} ${f(clock.y)}) scale(${sc.toFixed(4)}) translate(${f(-clock.x)} ${f(-clock.y)})">${g.join('')}</g>`);
    }
    return out;
  };

  const seek = (t: number): void => {
    before.bar.style.transform = `scaleX(${crawl(t).toFixed(4)})`;
    after.bar.style.transform = `scaleX(${afterFill(t).toFixed(4)})`;
    count.textContent = String(countShown(t));
    const ti = tailIn(t);
    tail.style.opacity = ti.tail.toFixed(3);
    tail.style.transform = `translateX(${f(-(1 - ti.tail) * 12)}px)`;
    unit1.style.transform = `translateX(${f(-(1 - ti.unit) * tailW)}px)`;
    letters.forEach((sp, i) => {
      const l = letterAt(i, t);
      sp.style.opacity = l.o.toFixed(3);
      sp.style.transform = `translateY(${(l.y * 0.53).toFixed(3)}em)`;
    });
    const fu = t - LANDED;
    fig2El.style.textShadow = fu > 0 ? `0 0 ${f(26 * Math.exp(-fu * 3))}px rgba(63, 167, 192, ${f(0.9 * Math.exp(-fu * 2.4))})` : 'none';
    layer.innerHTML = effects(t).join('');
  };

  const finish = (): void => {
    host.remove();
    for (const el of [before.figure, before.unit, after.figure]) el.style.removeProperty('visibility');
    for (const el of [before.bar, after.bar]) {
      el.style.removeProperty('transform');
      el.style.removeProperty('transform-origin');
    }
  };

  return { duration: DURATION, seek, finish };
}
