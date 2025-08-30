import type {
  OpfsFileMeta,
  OpfsSnapshot,
  WatchEvent,
} from "../shared/messaging";
import type { WatchOptions } from "../shared/types";

type DirHandle = FileSystemDirectoryHandle;
type FileHandle = FileSystemFileHandle;
type FSHandle = FileSystemHandle;

interface StorageManagerWithDirectory extends StorageManager {
  getDirectory(): Promise<DirHandle>;
}

export async function getRoot(): Promise<DirHandle> {
  const storage = navigator.storage as StorageManagerWithDirectory | undefined;
  if (!storage || typeof storage.getDirectory !== "function") {
    throw new Error(
      "OPFS (navigator.storage.getDirectory) Unavailable on this page"
    );
  }
  return storage.getDirectory();
}

export async function readMeta(
  handle: FileHandle | DirHandle,
  path: string
): Promise<OpfsFileMeta> {
  const kind = (handle as FSHandle).kind;
  if (kind === "directory")
    return { path, size: 0, lastModified: 0, isDirectory: true };
  const file = await (handle as FileHandle).getFile();
  return {
    path,
    size: file.size,
    lastModified: file.lastModified,
    isDirectory: false,
  };
}

interface DirIter {
  entries(): AsyncIterable<[string, FSHandle]>;
}
interface DirKeys {
  keys(): AsyncIterable<string>;
}

export async function listRecursive(
  dir: DirHandle,
  { recursive, maxEntries }: Pick<WatchOptions, "recursive" | "maxEntries">,
  prefix: string = ""
): Promise<OpfsFileMeta[]> {
  const out: OpfsFileMeta[] = [];
  if ("entries" in (dir as unknown as DirIter)) {
    for await (const [name, entry] of (dir as unknown as DirIter).entries()) {
      const path = prefix ? `${prefix}/${name}` : name;
      if (entry.kind === "directory") {
        out.push(await readMeta(entry as DirHandle, path));
        if (recursive) {
          const child = await dir.getDirectoryHandle(name);
          out.push(
            ...(await listRecursive(child, { recursive, maxEntries }, path))
          );
        }
      } else {
        out.push(await readMeta(entry as FileHandle, path));
      }
      if (out.length > maxEntries)
        throw new Error(`The file limit is exceeded (${maxEntries})`);
    }
  } else if ("keys" in (dir as unknown as DirKeys)) {
    for await (const name of (dir as unknown as DirKeys).keys()) {
      const path = prefix ? `${prefix}/${name}` : name;
      try {
        const d = await dir.getDirectoryHandle(name);
        out.push(await readMeta(d, path));
        if (recursive) {
          out.push(
            ...(await listRecursive(d, { recursive, maxEntries }, path))
          );
        }
      } catch {
        const f = await dir.getFileHandle(name);
        out.push(await readMeta(f, path));
      }
      if (out.length > maxEntries)
        throw new Error(`The file limit is exceeded (${maxEntries})`);
    }
  } else {
    throw new Error("DirectoryHandle without entries()/keys()");
  }
  return out;
}

export async function takeSnapshot(
  options: WatchOptions
): Promise<OpfsSnapshot> {
  const root = await getRoot();
  const files = await listRecursive(root, {
    recursive: options.recursive,
    maxEntries: options.maxEntries,
  });
  return { files, timestamp: Date.now() };
}

export function diffSnapshots(
  prev: OpfsSnapshot | null,
  next: OpfsSnapshot
): WatchEvent[] {
  if (!prev)
    return next.files
      .filter((f) => !f.isDirectory)
      .map((meta) => ({ type: "added", meta }));
  const p = new Map(prev.files.map((f) => [f.path, f]));
  const n = new Map(next.files.map((f) => [f.path, f]));
  const events: WatchEvent[] = [];
  for (const [path, mp] of p) {
    const mn = n.get(path);
    if (!mn) {
      if (!mp.isDirectory) events.push({ type: "removed", meta: mp });
    } else if (
      !mn.isDirectory &&
      (mp.size !== mn.size || mp.lastModified !== mn.lastModified)
    ) {
      events.push({ type: "modified", meta: mn });
    }
  }
  for (const [path, mn] of n)
    if (!p.has(path) && !mn.isDirectory)
      events.push({ type: "added", meta: mn });
  return events;
}

async function ensureParentDir(
  root: DirHandle,
  parts: string[]
): Promise<DirHandle> {
  let dir = root;
  for (const seg of parts) {
    try {
      dir = await dir.getDirectoryHandle(seg);
    } catch {
      dir = await dir.getDirectoryHandle(seg, { create: true });
    }
  }
  return dir;
}

export async function readText(path: string): Promise<string> {
  const root = await getRoot();
  const parts = path.split("/").filter(Boolean);
  let dir = root;
  for (let i = 0; i < parts.length - 1; i += 1)
    dir = await dir.getDirectoryHandle(parts[i]!);
  const fh = await dir.getFileHandle(parts.at(-1)!);
  const file = await fh.getFile();
  return file.text();
}

export async function writeText(
  path: string,
  content: string,
  createIfMissing: boolean
): Promise<{ size: number; lastModified: number }> {
  const root = await getRoot();
  const parts = path.split("/").filter(Boolean);
  const name = parts.pop() ?? "";
  const parent = await ensureParentDir(root, parts);
  const fh = await parent.getFileHandle(name, { create: createIfMissing });

  const w = await fh.createWritable();
  await w.write(content);
  await w.close();

  const f = await fh.getFile();
  return { size: f.size, lastModified: f.lastModified };
}

export async function writeBytes(
  path: string,
  data: Uint8Array | ArrayBufferLike,
  createIfMissing: boolean
): Promise<{ size: number; lastModified: number }> {
  const root = await getRoot();
  const parts = path.split("/").filter(Boolean);
  const name = parts.pop() ?? "";
  const parent = await ensureParentDir(root, parts);
  const fh = await parent.getFileHandle(name, { create: createIfMissing });

  const view: Uint8Array =
    data instanceof Uint8Array ? data : new Uint8Array(data);

  const ab: ArrayBuffer =
    view.buffer instanceof ArrayBuffer &&
    view.byteOffset === 0 &&
    view.byteLength === view.buffer.byteLength
      ? view.buffer
      : view.buffer instanceof ArrayBuffer
        ? view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength)
        : (() => {
            const copy = new Uint8Array(view.byteLength);
            copy.set(view);
            return copy.buffer;
          })();

  const w = await fh.createWritable();
  await w.write(ab);
  await w.truncate(ab.byteLength);
  await w.close();

  const f = await fh.getFile();
  return { size: f.size, lastModified: f.lastModified };
}

export async function createFile(
  path: string,
  content: string = ""
): Promise<{ size: number; lastModified: number }> {
  return writeText(path, content, true);
}

export async function createDir(path: string): Promise<void> {
  const root = await getRoot();
  const parts = path.split("/").filter(Boolean);
  await ensureParentDir(root, parts);
}

async function copyFile(
  srcDir: DirHandle,
  srcName: string,
  dstDir: DirHandle,
  dstName: string
): Promise<void> {
  const fh = await srcDir.getFileHandle(srcName);
  const file = await fh.getFile();
  const newFh = await dstDir.getFileHandle(dstName, { create: true });
  const w = await newFh.createWritable();
  await w.write(await file.arrayBuffer());
  await w.close();
}

async function copyDirRecursive(src: DirHandle, dst: DirHandle): Promise<void> {
  for await (const [name, entry] of (
    src as unknown as { entries(): AsyncIterable<[string, FSHandle]> }
  ).entries()) {
    if (entry.kind === "directory") {
      const s = await src.getDirectoryHandle(name);
      const d = await dst.getDirectoryHandle(name, { create: true });
      await copyDirRecursive(s, d);
    } else {
      await copyFile(src, name, dst, name);
    }
  }
}

export async function renamePath(from: string, to: string): Promise<void> {
  if (from === to) return;
  const root = await getRoot();
  const split = (p: string) => {
    const parts = p.split("/").filter(Boolean);
    const name = parts.pop() ?? "";
    return { parent: parts, name };
  };
  const F = split(from);
  const T = split(to);
  const fromParent = await ensureParentDir(root, F.parent);
  const toParent = await ensureParentDir(root, T.parent);
  try {
    const srcDir = await fromParent.getDirectoryHandle(F.name);
    const dstDir = await toParent.getDirectoryHandle(T.name, { create: true });
    await copyDirRecursive(srcDir, dstDir);
    await fromParent.removeEntry(F.name, { recursive: true });
  } catch {
    await copyFile(fromParent, F.name, toParent, T.name);
    await fromParent.removeEntry(F.name, { recursive: false });
  }
}

export async function readBytes(path: string): Promise<ArrayBuffer> {
  const root = await getRoot();
  const parts = path.split("/").filter(Boolean);
  let dir = root;
  for (let i = 0; i < parts.length - 1; i += 1)
    dir = await dir.getDirectoryHandle(parts[i]!);
  const fh = await dir.getFileHandle(parts.at(-1)!);
  const file = await fh.getFile();
  return file.arrayBuffer();
}
