import { play, type Playback, type Scene } from './scene';
import { autoplayThreshold, fontsReady, isOnScreen, motionAllowed, onMotionChange, whenVisible } from './trigger';

export interface SceneModule {
  createScene(host: HTMLElement): Scene | null;
}

const landedOn = (host: HTMLElement): boolean => {
  const id = location.hash.slice(1);
  const target = id ? document.getElementById(id) : null;
  if (!target || !target.contains(host)) return false;
  return host.getBoundingClientRect().top - target.getBoundingClientRect().top < window.innerHeight;
};

/** Wires a lazily loaded scene to its host: autoplay once in view, Play when landed on, Replay after. */
export function mountScene(host: HTMLElement, button: HTMLButtonElement, name: string, load: () => Promise<SceneModule>): () => void {
  if (!motionAllowed()) return () => {};

  let mod: SceneModule | undefined;
  let playback: Playback | undefined;
  let armed: Scene | null = null;
  let watcher: { promise: Promise<void>; cancel(): void } | undefined;
  let frame = 0;
  let disposed = false;

  const create = (): Scene | null => {
    try {
      return mod?.createScene(host) ?? null;
    } catch {
      return null;
    }
  };
  const label = (text: 'Play' | 'Replay') => {
    button.textContent = text;
    button.setAttribute('aria-label', `${text} the ${name} animation`);
  };
  const leave = new IntersectionObserver((entries) => {
    if (entries.some((e) => !e.isIntersecting)) playback?.stop();
  });
  const start = (scene: Scene | null) => {
    if (!scene || disposed) return;
    const hadFocus = document.activeElement === button;
    button.hidden = true;
    playback = play(scene);
    leave.observe(host);
    playback.done.then(() => {
      leave.unobserve(host);
      if (disposed || !motionAllowed()) return;
      label('Replay');
      button.hidden = false;
      if (hadFocus) button.focus({ preventScroll: true });
    });
  };
  const replay = () => {
    playback?.stop();
    armed?.finish();
    armed = null;
    start(create());
  };
  const seekArmed = () => {
    if (!armed) return;
    try {
      armed.seek(0);
    } catch {
      armed.finish();
      armed = null;
    }
  };
  const onResize = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!armed) return;
      armed.finish();
      armed = create();
      seekArmed();
    });
  };
  const arm = () => {
    if (disposed) return;
    if (isOnScreen(host) || landedOn(host)) {
      label('Play');
      button.hidden = false;
      return;
    }
    armed = create();
    seekArmed();
    window.addEventListener('resize', onResize);
    watcher = whenVisible(host, autoplayThreshold(host.getBoundingClientRect().height, window.innerHeight));
    watcher.promise.then(() => {
      window.removeEventListener('resize', onResize);
      const scene = armed;
      armed = null;
      start(scene);
    });
  };
  const near = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      near.disconnect();
      Promise.all([load(), fontsReady()])
        .then(([m]) => {
          mod = m;
          arm();
        })
        .catch(() => {});
    },
    { rootMargin: '100% 0px' },
  );
  const unsubscribe = onMotionChange((allowed) => {
    if (allowed) return;
    playback?.stop();
    armed?.finish();
    armed = null;
    button.hidden = true;
  });

  button.addEventListener('click', replay);
  near.observe(host);

  return () => {
    disposed = true;
    near.disconnect();
    leave.disconnect();
    watcher?.cancel();
    playback?.stop();
    armed?.finish();
    if (frame) cancelAnimationFrame(frame);
    window.removeEventListener('resize', onResize);
    button.removeEventListener('click', replay);
    unsubscribe();
  };
}
