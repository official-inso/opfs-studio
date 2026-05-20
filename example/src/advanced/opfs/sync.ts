import { log } from "../../logger";

const SYNC_FILE = "sync-test.bin";
const DEMO_PAYLOAD = new TextEncoder().encode("sync-handle-payload");

type Res =
  | { id: number; ok: true; value: unknown }
  | { id: number; ok: false; error: string };

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

export async function spawn(): Promise<string> {
  if (worker) return "already running";
  const w = new Worker(new URL("../../workers/sync-worker.ts", import.meta.url), {
    type: "module",
  });
  worker = w;
  w.addEventListener("message", (ev: MessageEvent<Res>) => {
    const m = ev.data;
    if (m.id === -1) {
      log("info", "worker ready");
      return;
    }
    const slot = pending.get(m.id);
    if (!slot) return;
    pending.delete(m.id);
    if (m.ok) slot.resolve(m.value);
    else slot.reject(new Error(m.error));
  });
  w.addEventListener("error", (e) => {
    log("err", `worker error: ${e.message}`);
  });
  return "spawned";
}

function call<T = unknown>(kind: string, payload: Record<string, unknown> = {}, transfer: Transferable[] = []): Promise<T> {
  if (!worker) return Promise.reject(new Error("worker not spawned"));
  const id = nextId++;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
    worker!.postMessage({ id, kind, name: SYNC_FILE, ...payload }, transfer);
  });
}

export async function syncWrite(): Promise<unknown> {
  await ensureSpawned();
  const buf = DEMO_PAYLOAD.slice().buffer;
  return await call("write", { data: buf }, [buf]);
}

export async function syncRead(): Promise<unknown> {
  await ensureSpawned();
  const res = (await call("read")) as { read: number; bytes: number[] };
  const text = new TextDecoder().decode(new Uint8Array(res.bytes));
  log("info", `decoded: "${text}"`);
  return { read: res.read, text };
}

export async function syncSize(): Promise<unknown> {
  await ensureSpawned();
  return await call("size");
}

export async function syncTruncate(size: number): Promise<unknown> {
  await ensureSpawned();
  return await call("truncate", { size });
}

export async function syncClose(): Promise<unknown> {
  await ensureSpawned();
  const res = await call("close");
  worker?.terminate();
  worker = null;
  pending.clear();
  return res;
}

async function ensureSpawned(): Promise<void> {
  if (!worker) await spawn();
}
