import { describe, expect, it } from 'vitest';
import { play, type Scene } from './scene';

function harness(hidden = () => false) {
  let time = 0;
  let queue: FrameRequestCallback[] = [];
  return {
    opts: {
      raf: (cb: FrameRequestCallback) => {
        queue.push(cb);
        return queue.length;
      },
      cancel: () => {
        queue = [];
      },
      now: () => time,
      isHidden: hidden,
    },
    advance(ms: number) {
      time += ms;
      const q = queue;
      queue = [];
      q.forEach((cb) => cb(time));
    },
  };
}

function recorder(duration = 1, failAt = Infinity) {
  const seen: number[] = [];
  let finished = 0;
  const scene: Scene = {
    duration,
    seek(t) {
      if (t >= failAt) throw new Error('boom');
      seen.push(t);
    },
    finish() {
      finished++;
    },
  };
  return { scene, seen, finished: () => finished };
}

describe('play', () => {
  it('seeks from zero upward and finishes exactly once at the end', () => {
    const h = harness();
    const r = recorder(1);
    play(r.scene, h.opts);
    for (let i = 0; i < 20; i++) h.advance(100);
    expect(r.seen[0]).toBe(0);
    expect(r.seen.every((t, i) => i === 0 || t > r.seen[i - 1])).toBe(true);
    expect(Math.max(...r.seen)).toBeLessThan(1);
    expect(r.finished()).toBe(1);
  });

  it('finishes as soon as the tab is hidden', () => {
    let hidden = false;
    const h = harness(() => hidden);
    const r = recorder(5);
    play(r.scene, h.opts);
    h.advance(100);
    hidden = true;
    h.advance(100);
    expect(r.finished()).toBe(1);
  });

  it('finishes when a frame throws', () => {
    const h = harness();
    const r = recorder(5, 0.25);
    play(r.scene, h.opts);
    for (let i = 0; i < 10; i++) h.advance(100);
    expect(r.finished()).toBe(1);
    expect(Math.max(...r.seen)).toBeLessThan(0.25);
  });

  it('stop() finishes once, however often it is called', async () => {
    const h = harness();
    const r = recorder(5);
    const playback = play(r.scene, h.opts);
    playback.stop();
    playback.stop();
    await playback.done;
    expect(r.finished()).toBe(1);
  });

  it('stop() does not throw when finish() throws', async () => {
    const h = harness();
    let finished = 0;
    const scene: Scene = {
      duration: 5,
      seek() {},
      finish() {
        finished++;
        throw new Error('boom');
      },
    };
    const playback = play(scene, h.opts);
    playback.stop();
    await playback.done;
    expect(finished).toBe(1);
  });

  it('natural completion does not throw when finish() throws', async () => {
    const h = harness();
    let finished = 0;
    const scene: Scene = {
      duration: 1,
      seek() {},
      finish() {
        finished++;
        throw new Error('boom');
      },
    };
    const playback = play(scene, h.opts);
    for (let i = 0; i < 20; i++) h.advance(100);
    await playback.done;
    expect(finished).toBe(1);
  });
});
