import { log, run } from "../logger";
import * as quota from "./opfs/quota";
import * as directory from "./opfs/directory";
import * as file from "./opfs/file";
import * as writable from "./opfs/writable";
import * as nested from "./opfs/nested";
import * as stress from "./opfs/stress";
import * as sync from "./opfs/sync";

const $ = <T extends HTMLElement = HTMLInputElement>(id: string): T | null =>
  document.getElementById(id) as T | null;

const val = (id: string, fallback = ""): string =>
  ($(id) as HTMLInputElement | null)?.value ?? fallback;

const actions: Record<string, () => Promise<unknown> | unknown> = {
  "quota:estimate": () => run("quota.estimate", quota.estimate),
  "quota:persist": () => run("quota.persist", quota.persist),
  "quota:persisted": () => run("quota.persisted", quota.persisted),

  "dir:create": () => {
    const name = val("dir-name", "my-dir") || "my-dir";
    return run(`dir.create("${name}")`, () => directory.createDir(name));
  },
  "dir:remove": () => {
    const name = val("dir-name", "my-dir") || "my-dir";
    return run(`dir.remove("${name}", recursive)`, () =>
      directory.removeRecursive(name),
    );
  },
  "dir:entries": () => run("dir.entries()", directory.iterEntries),
  "dir:keys": () => run("dir.keys()", directory.iterKeys),
  "dir:values": () => run("dir.values()", directory.iterValues),
  "dir:resolve": () => {
    const name = val("file-name", "hello.txt") || "hello.txt";
    return run(`dir.resolve("${name}")`, () => directory.resolveOf(name));
  },

  "file:create": () => {
    const name = val("file-name", "hello.txt") || "hello.txt";
    const content = val("file-content");
    return run(`file.create("${name}", ${content.length}B)`, () =>
      file.createWrite(name, content),
    );
  },
  "file:read-text": () => {
    const name = val("file-name", "hello.txt") || "hello.txt";
    return run(`file.readText("${name}")`, () => file.readText(name));
  },
  "file:read-binary": () => {
    const name = val("file-name", "hello.txt") || "hello.txt";
    return run(`file.readBinary("${name}")`, () => file.readBinary(name));
  },
  "file:delete": () => {
    const name = val("file-name", "hello.txt") || "hello.txt";
    return run(`file.delete("${name}")`, () => file.deleteFile(name));
  },
  "file:move": () => {
    const from = val("move-from");
    const to = val("move-to");
    return run(`file.move("${from}" → "${to}")`, () => file.moveFile(from, to));
  },

  "write:sequential": () => {
    const name = val("write-file", "stream.txt") || "stream.txt";
    return run(`write.sequential("${name}")`, () => writable.sequential(name));
  },
  "write:seek": () => {
    const name = val("write-file", "stream.txt") || "stream.txt";
    return run(`write.seek("${name}")`, () => writable.seekAndWrite(name));
  },
  "write:truncate": () => {
    const name = val("write-file", "stream.txt") || "stream.txt";
    return run(`write.truncate("${name}", 5)`, () =>
      writable.truncate(name, 5),
    );
  },
  "write:params": () => {
    const name = val("write-file", "stream.txt") || "stream.txt";
    return run(`write.params("${name}")`, () => writable.writeParams(name));
  },
  "write:blob": () => {
    const name = val("write-file", "stream.txt") || "stream.txt";
    return run(`write.blob("${name}")`, () => writable.writeBlob(name));
  },
  "write:buffer": () => {
    const name = val("write-file", "stream.txt") || "stream.txt";
    return run(`write.buffer("${name}")`, () => writable.writeBuffer(name));
  },

  "sync:spawn": () => run("sync.spawn", sync.spawn),
  "sync:write": () => run("sync.write", sync.syncWrite),
  "sync:read": () => run("sync.read", sync.syncRead),
  "sync:size": () => run("sync.size", sync.syncSize),
  "sync:truncate": () => run("sync.truncate(4)", () => sync.syncTruncate(4)),
  "sync:close": () => run("sync.close", sync.syncClose),

  "nested:create": () => run("nested.create a/b/c/d.txt", nested.createTree),
  "nested:walk": () => run("nested.walk", nested.walkTree),
  "nested:remove": () => run("nested.remove a recursive", nested.removeTree),

  "stress:create": () => {
    const n = Number(val("stress-count", "100")) || 100;
    return run(`stress.create(${n})`, () => stress.createMany(n));
  },
  "stress:fill": () => run("stress.fill until quota", stress.fillUntilQuota),
};

export function bootstrapAdvanced(): void {
  const root = document.getElementById("tab-advanced");
  if (!root) return;
  root.querySelectorAll<HTMLButtonElement>("button[data-act]").forEach((btn) => {
    const act = btn.dataset.act;
    if (!act) return;
    btn.addEventListener("click", () => {
      const fn = actions[act];
      if (!fn) {
        log("err", `unknown action: ${act}`);
        return;
      }
      try {
        const result = fn();
        if (result instanceof Promise) result.catch(() => void 0);
      } catch {
        // run() already logs errors
      }
    });
  });
}
