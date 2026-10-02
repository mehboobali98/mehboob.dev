/** True unless the visitor asked for reduced motion. */
export const motionAllowed = (): boolean => !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** True when any part of el is inside the viewport. */
export function isOnScreen(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.top < window.innerHeight && r.bottom > 0;
}

/** Resolves once el is at least `threshold` visible. */
export function whenVisible(el: Element, threshold = 0.4): { promise: Promise<void>; cancel(): void } {
  let observer: IntersectionObserver | undefined;
  let cancelled = false;
  const promise = new Promise<void>((resolve) => {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting && e.intersectionRatio >= threshold)) {
          observer?.disconnect();
          if (!cancelled) resolve();
        }
      },
      { threshold },
    );
    observer.observe(el);
  });
  return {
    promise,
    cancel() {
      cancelled = true;
      observer?.disconnect();
    },
  };
}

/** Resolves when web fonts have loaded, so measurements are final. */
export const fontsReady = (): Promise<void> => (document.fonts ? document.fonts.ready.then(() => undefined) : Promise.resolve());

/** Resolves on the next animation frame. */
export const nextFrame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));

/** Runs setup on every Astro page load and its teardown before the next swap. */
export function onAstroLifecycle(setup: () => (() => void) | void): void {
  let teardown: (() => void) | void;
  document.addEventListener('astro:page-load', () => {
    teardown?.();
    teardown = setup();
  });
  document.addEventListener('astro:before-swap', () => {
    teardown?.();
    teardown = undefined;
  });
}
