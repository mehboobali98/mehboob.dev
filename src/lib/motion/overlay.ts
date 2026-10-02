import type { Scene } from './scene';
import { FX_DEFS, type ViewBox } from './fx';

export type Layout = 'desktop' | 'phone';

export interface Timeline {
  duration(layout: Layout): number;
  draw(t: number, layout: Layout, vb: ViewBox): string;
  viewBoxWidth(layout: Layout): number;
}

const NS = 'http://www.w3.org/2000/svg';

/** The overlay's viewBox, in the graphic's own units, covering the host's padding box. */
export function overlayBox(ref: { left: number; top: number; width: number }, inner: { left: number; top: number; width: number; height: number }, vbWidth: number): ViewBox {
  const k = ref.width / vbWidth;
  return { x: (inner.left - ref.left) / k, y: (inner.top - ref.top) / k, w: inner.width / k, h: inner.height / k };
}

/** The displayed scene graphic inside host, and which layout it is. */
export function pickVisibleGraphic(host: HTMLElement): { ref: SVGSVGElement; layout: Layout } | null {
  const ref = Array.from(host.querySelectorAll<SVGSVGElement>('svg[data-scene-graphic]')).find((s) => s.getClientRects().length > 0);
  if (!ref) return null;
  return { ref, layout: ref.dataset.layout === 'phone' ? 'phone' : 'desktop' };
}

/** Builds a scene that draws the timeline over host and hands back to the real graphic on finish. */
export function createOverlayScene(host: HTMLElement, timeline: Timeline, pick: (host: HTMLElement) => { ref: SVGSVGElement; layout: Layout } | null): Scene | null {
  const picked = pick(host);
  if (!picked) return null;
  const { ref, layout } = picked;
  const h = host.getBoundingClientRect();
  const r = ref.getBoundingClientRect();
  const vb = overlayBox(r, { left: h.left + host.clientLeft, top: h.top + host.clientTop, width: host.clientWidth, height: host.clientHeight }, timeline.viewBoxWidth(layout));
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  svg.setAttribute('class', 'scene-overlay');
  svg.innerHTML = `<defs>${FX_DEFS}</defs><g></g>`;
  const group = svg.lastElementChild as SVGGElement;
  host.append(svg);
  const prevOpacity = ref.style.opacity;
  ref.style.opacity = '0';
  let done = false;
  return {
    duration: timeline.duration(layout),
    seek(t: number) {
      group.innerHTML = timeline.draw(t, layout, vb);
    },
    finish() {
      if (done) return;
      done = true;
      svg.remove();
      ref.style.opacity = prevOpacity;
    },
  };
}
