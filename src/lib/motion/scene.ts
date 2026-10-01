/** A deterministic animation: every frame is a function of time. */
export interface Scene {
  readonly duration: number;
  seek(t: number): void;
  finish(): void;
}

export interface PlayOptions {
  raf?: (cb: FrameRequestCallback) => number;
  cancel?: (id: number) => void;
  now?: () => number;
  isHidden?: () => boolean;
}

export interface Playback {
  stop(): void;
  readonly done: Promise<void>;
}

/** Runs a scene on animation frames; always ends by calling finish() exactly once. */
export function play(scene: Scene, opts: PlayOptions = {}): Playback {
  const raf = opts.raf ?? ((cb: FrameRequestCallback) => requestAnimationFrame(cb));
  const cancel = opts.cancel ?? ((id: number) => cancelAnimationFrame(id));
  const now = opts.now ?? (() => performance.now());
  const isHidden = opts.isHidden ?? (() => document.visibilityState === 'hidden');

  let frame = 0;
  let ended = false;
  let resolve: () => void = () => {};
  const done = new Promise<void>((r) => {
    resolve = r;
  });
  const start = now();

  const end = () => {
    if (ended) return;
    ended = true;
    cancel(frame);
    try {
      scene.finish();
    } finally {
      resolve();
    }
  };

  const tick = () => {
    if (ended) return;
    const t = (now() - start) / 1000;
    if (t >= scene.duration || isHidden()) {
      end();
      return;
    }
    try {
      scene.seek(t);
    } catch {
      end();
      return;
    }
    frame = raf(tick);
  };

  try {
    scene.seek(0);
    frame = raf(tick);
  } catch {
    end();
  }
  return { stop: end, done };
}
