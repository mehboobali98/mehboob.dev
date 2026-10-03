import type { Scene } from './scene';
import { createOverlayScene, type Layout } from './overlay';
import { timeline } from './agentsTimeline';

/** The validator diagram's graphic, with the phone timeline on narrow cards. */
export function pickAgentsLayout(host: HTMLElement): { ref: SVGSVGElement; layout: Layout } | null {
  const ref = host.querySelector<SVGSVGElement>('svg[data-scene-graphic]');
  return ref ? { ref, layout: host.clientWidth < 400 ? 'phone' : 'desktop' } : null;
}

/** The rmine-skills validator wall scene over its exhibit. */
export const createScene = (host: HTMLElement): Scene | null => createOverlayScene(host, timeline, pickAgentsLayout);
