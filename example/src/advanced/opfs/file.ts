import { log } from "../../logger";
import { root } from "./directory";

export async function createWrite(name: string, content: string): Promise<number> {
  const r = await root();
  const handle = await r.getFileHandle(name, { create: true });
  const writer = await handle.createWritable();
  await writer.write(content);
  await writer.close();
  return content.length;
}

export async function readText(name: string): Promise<string> {
  const r = await root();
  const handle = await r.getFileHandle(name);
  const f = await handle.getFile();
  return await f.text();
}

export async function readBinary(name: string): Promise<Uint8Array> {
  const r = await root();
  const handle = await r.getFileHandle(name);
  const f = await handle.getFile();
  const buf = await f.arrayBuffer();
  return new Uint8Array(buf);
}

export async function deleteFile(name: string): Promise<string> {
  const r = await root();
  await r.removeEntry(name);
  return name;
}

type FileHandleWithMove = FileSystemFileHandle & {
  move?: (
    newParentOrName: FileSystemDirectoryHandle | string,
    newName?: string,
  ) => Promise<void>;
};

export async function moveFile(from: string, to: string): Promise<string> {
  const r = await root();
  const handle = (await r.getFileHandle(from)) as FileHandleWithMove;
  if (typeof handle.move === "function") {
    try {
      await handle.move(to);
      return `move() native → ${to}`;
    } catch (e) {
      log("warn", `move() failed (${(e as Error).message}), falling back to copy+delete`);
    }
  } else {
    log("warn", "FileSystemFileHandle.move() not supported, falling back to copy+delete");
  }
  const f = await handle.getFile();
  const dst = await r.getFileHandle(to, { create: true });
  const writer = await dst.createWritable();
  await writer.write(await f.arrayBuffer());
  await writer.close();
  await r.removeEntry(from);
  return `fallback copy+delete → ${to}`;
}
