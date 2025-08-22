import { base64ToUint8 } from "@/shared/base64";
import type {
  MsgFromContent,
  MsgToContent,
  OpfsSnapshot,
} from "../shared/messaging";
import type { WatchOptions } from "../shared/types";
import {
  diffSnapshots,
  takeSnapshot,
  readText,
  writeText,
  writeBytes,
  createFile,
  createDir,
  renamePath,
  readBytes,
  getRoot,
} from "./opfs-watcher";

let watchTimer: number | null = null;
let latest: OpfsSnapshot | null = null;
let watching = false;

const defaultOptions: WatchOptions = {
  intervalMs: 700,
  recursive: true,
  maxEntries: 5000,
};

function post(msg: MsgFromContent): void {
  chrome.runtime.sendMessage<MsgFromContent>(msg).catch(() => void 0);
}

async function tick(): Promise<void> {
  try {
    const snap = await takeSnapshot(defaultOptions);
    const events = diffSnapshots(latest, snap);
    latest = snap;
    if (events.length > 0) post({ kind: "watch-events", data: events });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    post({ kind: "error", data: { message } });
  }
}

function start(): void {
  if (watchTimer !== null) return;
  watching = true;
  post({ kind: "watch-status", data: { watching } });
  void tick();
  watchTimer = window.setInterval(() => void tick(), defaultOptions.intervalMs);
}
function stop(): void {
  if (watchTimer !== null) {
    clearInterval(watchTimer);
    watchTimer = null;
  }
  watching = false;
  post({ kind: "watch-status", data: { watching } });
}

chrome.runtime.onMessage.addListener(
  (msg: MsgToContent, _sender, sendResponse) => {
    (async () => {
      try {
        switch (msg.kind) {
          case "start-watch":
            start();
            sendResponse({ ok: true });
            break;
          case "stop-watch":
            stop();
            sendResponse({ ok: true });
            break;
          case "list": {
            const snap = await takeSnapshot(defaultOptions);
            latest = snap;
            post({ kind: "snapshot", data: snap });
            sendResponse({ ok: true });
            break;
          }
          case "read-file": {
            const { path } = msg.data as { path: string };
            const content = await readText(path);
            post({ kind: "file-read", data: { path, content } });
            sendResponse({ ok: true });
            break;
          }
          case "write-file": {
            const { path, content, createIfMissing } = msg.data as {
              path: string;
              content: string;
              createIfMissing: boolean;
            };
            const meta = await writeText(path, content, createIfMissing);
            post({ kind: "write-result", data: { path, ok: true, ...meta } });
            const snap = await takeSnapshot(defaultOptions);
            const events = diffSnapshots(latest, snap);
            latest = snap;
            if (events.length) post({ kind: "watch-events", data: events });
            sendResponse({ ok: true });
            break;
          }
          // case "write-bytes": {
          //   const { path, data, createIfMissing } = msg.data as {
          //     path: string;
          //     data: ArrayBuffer;
          //     createIfMissing: boolean;
          //   };
          //   const meta = await writeBytes(path, data, createIfMissing);
          //   post({ kind: "write-result", data: { path, ok: true, ...meta } });
          //   const snap = await takeSnapshot(defaultOptions); // <-- всегда шлём актуальный snap
          //   latest = snap;
          //   post({ kind: "snapshot", data: snap });
          //   sendResponse({ ok: true });
          //   break;
          // }
          case "write-bytes": {
            const { path, dataB64, expectedSize, createIfMissing } =
              msg.data as {
                path: string;
                dataB64: string;
                expectedSize: number;
                createIfMissing: boolean;
              };

            const bytes = base64ToUint8(dataB64);
            if (bytes.byteLength !== expectedSize) {
              post({
                kind: "error",
                data: {
                  message: `Размер после decode не совпал: ${path} (${bytes.byteLength} != ${expectedSize})`,
                },
              });
            }

            const meta = await writeBytes(path, bytes, createIfMissing);

            // Верификация: читаем обратно размер и сверяем
            const fhMeta = await (async () => {
              const root = await getRoot();
              const parts = path.split("/").filter(Boolean);
              const name = parts.pop() ?? "";
              let dir = root;
              for (const seg of parts) dir = await dir.getDirectoryHandle(seg);
              const fh = await dir.getFileHandle(name);
              const f = await fh.getFile();
              return { size: f.size, lastModified: f.lastModified };
            })();

            if (fhMeta.size !== bytes.byteLength) {
              post({
                kind: "error",
                data: {
                  message: `После записи размер 0/неверный: ${path} (${fhMeta.size} != ${bytes.byteLength})`,
                },
              });
            }

            post({ kind: "write-result", data: { path, ok: true, ...meta } });
            sendResponse({ ok: true });
            break;
          }
          case "create-file": {
            const { path, content } = msg.data as {
              path: string;
              content?: string;
            };
            await createFile(path, content ?? "");
            post({ kind: "create-result", data: { ok: true, path } });
            const snap = await takeSnapshot(defaultOptions);
            const events = diffSnapshots(latest, snap);
            latest = snap;
            if (events.length) post({ kind: "watch-events", data: events });
            sendResponse({ ok: true });
            break;
          }
          case "create-dir": {
            const { path } = msg.data as { path: string };
            await createDir(path);
            post({ kind: "create-result", data: { ok: true, path } });
            const snap = await takeSnapshot(defaultOptions);
            const events = diffSnapshots(latest, snap);
            latest = snap;
            if (events.length) post({ kind: "watch-events", data: events });
            sendResponse({ ok: true });
            break;
          }
          case "read-bytes": {
            const { path } = msg.data as { path: string };
            const bytes = await readBytes(path);
            sendResponse({ ok: true, bytes }); // <-- ответом, не только постом
            break;
          }
          case "rename-path": {
            const { from, to } = msg.data as { from: string; to: string };
            await renamePath(from, to);
            post({ kind: "rename-result", data: { ok: true, from, to } });
            const snap = await takeSnapshot(defaultOptions);
            const events = diffSnapshots(latest, snap);
            latest = snap;
            if (events.length) post({ kind: "watch-events", data: events });
            sendResponse({ ok: true });
            break;
          }
          default:
            sendResponse({ ok: false });
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        post({ kind: "error", data: { message } });
        sendResponse({ ok: false, error: message });
      }
    })();
    return true;
  }
);

post({ kind: "ready", data: null });
post({ kind: "watch-status", data: { watching } });

export {};
