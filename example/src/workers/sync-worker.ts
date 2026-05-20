/// <reference lib="webworker" />

type Req =
  | { id: number; kind: "write"; name: string; data: ArrayBuffer }
  | { id: number; kind: "read"; name: string }
  | { id: number; kind: "size"; name: string }
  | { id: number; kind: "truncate"; name: string; size: number }
  | { id: number; kind: "close"; name: string };

type Res =
  | { id: number; ok: true; value: unknown }
  | { id: number; ok: false; error: string };

const handles = new Map<string, FileSystemSyncAccessHandle>();

async function open(name: string): Promise<FileSystemSyncAccessHandle> {
  let h = handles.get(name);
  if (h) return h;
  const root = await navigator.storage.getDirectory();
  const file = await root.getFileHandle(name, { create: true });
  h = await file.createSyncAccessHandle();
  handles.set(name, h);
  return h;
}

self.addEventListener("message", async (ev: MessageEvent<Req>) => {
  const msg = ev.data;
  const reply = (res: Res) => self.postMessage(res);
  try {
    switch (msg.kind) {
      case "write": {
        const h = await open(msg.name);
        const wrote = h.write(new Uint8Array(msg.data), { at: 0 });
        h.flush();
        reply({ id: msg.id, ok: true, value: { wrote } });
        break;
      }
      case "read": {
        const h = await open(msg.name);
        const size = h.getSize();
        const buf = new Uint8Array(size);
        const read = h.read(buf, { at: 0 });
        reply({
          id: msg.id,
          ok: true,
          value: { read, bytes: Array.from(buf) },
        });
        break;
      }
      case "size": {
        const h = await open(msg.name);
        reply({ id: msg.id, ok: true, value: { size: h.getSize() } });
        break;
      }
      case "truncate": {
        const h = await open(msg.name);
        h.truncate(msg.size);
        h.flush();
        reply({ id: msg.id, ok: true, value: { newSize: h.getSize() } });
        break;
      }
      case "close": {
        const h = handles.get(msg.name);
        if (h) {
          h.flush();
          h.close();
          handles.delete(msg.name);
        }
        reply({ id: msg.id, ok: true, value: { closed: msg.name } });
        break;
      }
    }
  } catch (e) {
    const err = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    reply({ id: msg.id, ok: false, error: err });
  }
});

self.postMessage({ id: -1, ok: true, value: { ready: true } });
