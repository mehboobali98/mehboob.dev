import type { Scene } from './scene';
import { createOverlayScene, pickVisibleGraphic } from './overlay';
import { timeline } from './cmdbTimeline';

/** The CMDB traversal scene over its case-study panel. */
export const createScene = (host: HTMLElement): Scene | null => createOverlayScene(host, timeline, pickVisibleGraphic);
