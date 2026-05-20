import { base64ToUint8 } from "@/shared/base64";
import type {
  MsgFromContent,
  MsgToContent,
} from "../shared/messaging";
import type { WatchOptions } from "../shared/types";
import {
  takeSnapshot,
  readText,
  writeText,
  writeBytes,
  createFile,
  createDir,
  renamePath,
  readBytes,
  getRoot,
  removePath,
} from "./opfs-watcher";
import { createWatchLoop } from "./watch-loop";

const watchOptions: WatchOptions = {
  intervalMs: 1500,
  recursive: true,
  maxEntries: 5000,
};

function post(msg: MsgFromContent): void {
  // Tag every snapshot with the page origin so the panel can show which tab
  // the editor is bound to (no "tabs" permission needed).
  if (msg.kind === "snapshot" && msg.data && typeof msg.data === "object") {
    (msg.data as { origin?: string }).origin = location.origin;
  }
  chrome.runtime.sendMessage<MsgFromContent>(msg).catch(() => void 0);
}

const loop = createWatchLoop({ options: watchOptions, post });

async function withPausedLoop<T>(fn: () => Promise<T>): Promise<T> {
  const wasRunning = loop.isWatching();
  if (wasRunning) loop.pause();
  try {
    return await fn();
  } finally {
    if (wasRunning) {
      // refresh snapshot so resume picks up the change exactly once
      await loop.runOnce();
      loop.resume();
    }
  }
}

chrome.runtime.onMessage.addListener(
  (msg: MsgToContent, _sender, sendResponse) => {
    (async () => {
      try {
        switch (msg.kind) {
          case "start-watch":
            loop.start();
            sendResponse({ ok: true });
            break;
          case "stop-watch":
            loop.stop();
            sendResponse({ ok: true });
            break;
          case "tab-unloaded": {
            const snap = await takeSnapshot(watchOptions);
            loop.setLatest(snap);
            post({ kind: "snapshot", data: snap });
            sendResponse({ ok: true });
            break;
          }
          case "list": {
            const snap = await takeSnapshot(watchOptions);
            loop.setLatest(snap);
            post({ kind: "snapshot", data: snap });
            sendResponse({ ok: true });
            break;
          }
          case "remove-path": {
            try {
              const { path, recursive } = (msg.data ?? {}) as {
                path?: string;
                recursive?: boolean;
              };
              if (!path || typeof path !== "string") {
                throw new DOMException("Path is empty", "SyntaxError");
              }

              await withPausedLoop(async () => {
                await removePath(path, Boolean(recursive));
              });

              const snap = loop.getLatest() ?? (await takeSnapshot(watchOptions));
              loop.setLatest(snap);
              post({ kind: "snapshot", data: snap });
              sendResponse({ ok: true, path });
            } catch (e) {
              const message =
                e instanceof DOMException
                  ? `${e.name}: ${e.message}`
                  : e instanceof Error
                    ? `${e.name || "Error"}: ${e.message}`
                    : String(e);
              sendResponse({ ok: false, error: message });
            }
            break;
          }

          case "read-file": {
            const { path } = (msg.data ?? {}) as { path?: string };
            if (!path || typeof path !== "string") {
              throw new DOMException("Path is empty", "SyntaxError");
            }
            post({ kind: "file-read-start", data: null });
            const content = await readText(path);
            const bytes = await readBytes(path);
            post({ kind: "file-read", data: { path, content, bytes } });
            sendResponse({ ok: true });
            break;
          }
          case "write-file": {
            const { path, content, createIfMissing } = msg.data as {
              path: string;
              content: string;
              createIfMissing: boolean;
            };
            const meta = await withPausedLoop(() =>
              writeText(path, content, createIfMissing)
            );
            post({ kind: "write-result", data: { path, ok: true, ...meta } });
            sendResponse({ ok: true });
            break;
          }
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
                  message: `decoded size mismatch: ${path} (${bytes.byteLength} != ${expectedSize})`,
                },
              });
            }

            const meta = await withPausedLoop(() =>
              writeBytes(path, bytes, createIfMissing)
            );

            const verified = await (async () => {
              const root = await getRoot();
              const parts = path.split("/").filter(Boolean);
              const name = parts.pop() ?? "";
              let dir = root;
              for (const seg of parts) dir = await dir.getDirectoryHandle(seg);
              const fh = await dir.getFileHandle(name);
              const f = await fh.getFile();
              return { size: f.size, lastModified: f.lastModified };
            })();

            if (verified.size !== bytes.byteLength) {
              post({
                kind: "error",
                data: {
                  message: `post-write size mismatch: ${path} (${verified.size} != ${bytes.byteLength})`,
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
            await withPausedLoop(() => createFile(path, content ?? ""));
            post({ kind: "create-result", data: { ok: true, path } });
            sendResponse({ ok: true });
            break;
          }
          case "create-dir": {
            const { path } = msg.data as { path: string };
            await withPausedLoop(() => createDir(path));
            post({ kind: "create-result", data: { ok: true, path } });
            sendResponse({ ok: true });
            break;
          }
          case "rename-path": {
            const { from, to } = msg.data as { from: string; to: string };
            await withPausedLoop(() => renamePath(from, to));
            post({ kind: "rename-result", data: { ok: true, from, to } });
            sendResponse({ ok: true });
            break;
          }
          default: {
            sendResponse({
              ok: false,
              error: `Unknown kind: ${String((msg as { kind?: unknown })?.kind)}`,
            });
            break;
          }
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
post({ kind: "watch-status", data: { watching: loop.isWatching() } });

export {};
