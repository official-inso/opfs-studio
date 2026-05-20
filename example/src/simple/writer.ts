export type WriteData = string | Uint8Array | ArrayBuffer | Blob;

async function ensureDir(
  root: FileSystemDirectoryHandle,
  parts: string[],
): Promise<FileSystemDirectoryHandle> {
  let dir = root;
  for (const seg of parts) {
    dir = await dir.getDirectoryHandle(seg, { create: true });
  }
  return dir;
}

export async function ensureDirPath(path: string): Promise<string> {
  const root = await navigator.storage.getDirectory();
  const parts = path.split("/").filter(Boolean);
  await ensureDir(root, parts);
  return path;
}

export async function writeToOpfs(
  path: string,
  data: WriteData,
): Promise<{ path: string; size: number }> {
  const root = await navigator.storage.getDirectory();
  const parts = path.split("/").filter(Boolean);
  const name = parts.pop();
  if (!name) throw new Error(`Invalid path: "${path}"`);
  const dir = await ensureDir(root, parts);
  const file = await dir.getFileHandle(name, { create: true });
  const writer = await file.createWritable();

  let size = 0;
  if (typeof data === "string") {
    await writer.write(data);
    size = new Blob([data]).size;
  } else if (data instanceof Blob) {
    await writer.write(data);
    size = data.size;
  } else if (data instanceof Uint8Array) {
    await writer.write(data);
    size = data.byteLength;
  } else {
    await writer.write(data);
    size = data.byteLength;
  }
  await writer.close();
  return { path, size };
}
