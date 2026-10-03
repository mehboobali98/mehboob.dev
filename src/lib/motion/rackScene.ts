import type { Scene } from './scene';
import { createOverlayScene, pickVisibleGraphic } from './overlay';
import { timeline } from './rackTimeline';

/** The rack editor slot-logic scene over its panel. */
export const createScene = (host: HTMLElement): Scene | null => createOverlayScene(host, timeline, pickVisibleGraphic);
