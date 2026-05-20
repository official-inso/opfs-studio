import type { MsgFromContent, OpfsSnapshot } from "../shared/messaging";
import type { WatchOptions } from "../shared/types";
import { takeSnapshot, diffSnapshots } from "./opfs-watcher";

const INTERVAL_SMALL = 1500;
const INTERVAL_MEDIUM = 3000;
const INTERVAL_LARGE = 5000;

const THRESHOLD_MEDIUM = 500;
const THRESHOLD_LARGE = 2000;

export interface WatchLoopHandle {
  start(): void;
  stop(): void;
  pause(): void;
  resume(): void;
  runOnce(): Promise<OpfsSnapshot | null>;
  isWatching(): boolean;
  getLatest(): OpfsSnapshot | null;
  setLatest(snap: OpfsSnapshot | null): void;
}

export interface CreateLoopArgs {
  options: WatchOptions;
  post: (msg: MsgFromContent) => void;
}

export function createWatchLoop({ options, post }: CreateLoopArgs): WatchLoopHandle {
  let timer: number | null = null;
  let ticking = false;
  let watching = false;
  let paused = false;
  let latest: OpfsSnapshot | null = null;

  function intervalForSize(count: number): number {
    if (count > THRESHOLD_LARGE) return INTERVAL_LARGE;
    if (count > THRESHOLD_MEDIUM) return INTERVAL_MEDIUM;
    return INTERVAL_SMALL;
  }

  async function runTick(): Promise<OpfsSnapshot | null> {
    if (ticking) return null;
    ticking = true;
    try {
      const snap = await takeSnapshot(options);
      if (!watching) return snap;
      const events = diffSnapshots(latest, snap);
      latest = snap;
      if (events.length > 0) {
        post({ kind: "watch-events", data: events });
      }
      return snap;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      post({ kind: "error", data: { message } });
      return null;
    } finally {
      ticking = false;
    }
  }

  function schedule(): void {
    if (!watching || paused) return;
    const size = latest?.files.length ?? 0;
    const delay = intervalForSize(size);
    timer = self.setTimeout(loopIteration, delay);
  }

  async function loopIteration(): Promise<void> {
    timer = null;
    if (!watching || paused) return;
    await runTick();
    if (watching && !paused) schedule();
  }

  return {
    start() {
      if (watching) return;
      watching = true;
      paused = false;
      post({ kind: "watch-status", data: { watching: true } });
      void (async () => {
        await runTick();
        if (watching && !paused) schedule();
      })();
    },
    stop() {
      watching = false;
      paused = false;
      latest = null;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      post({ kind: "watch-status", data: { watching: false } });
    },
    pause() {
      paused = true;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    },
    resume() {
      if (!watching) return;
      paused = false;
      if (timer === null) schedule();
    },
    async runOnce() {
      return await runTick();
    },
    isWatching() {
      return watching;
    },
    getLatest() {
      return latest;
    },
    setLatest(snap) {
      latest = snap;
    },
  };
}
