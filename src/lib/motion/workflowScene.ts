import type { Scene } from './scene';
import { createOverlayScene, pickVisibleGraphic } from './overlay';
import { timeline } from './workflowTimeline';

/** The workflow run scene over its case-study panel. */
export const createScene = (host: HTMLElement): Scene | null => createOverlayScene(host, timeline, pickVisibleGraphic);
