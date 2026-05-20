import { root } from "./directory";

async function openWriter(name: string, keepExistingData = false) {
  const r = await root();
  const handle = await r.getFileHandle(name, { create: true });
  return await handle.createWritable({ keepExistingData });
}

export async function sequential(name: string): Promise<string> {
  const w = await openWriter(name);
  await w.write("aaa");
  await w.write("bbb");
  await w.write("ccc");
  await w.close();
  return "aaabbbccc";
}

export async function seekAndWrite(name: string): Promise<string> {
  const w = await openWriter(name, true);
  await w.write("0123456789");
  await w.seek(3);
  await w.write("XXX");
  await w.close();
  return "012XXX6789";
}

export async function truncate(name: string, size: number): Promise<number> {
  const w = await openWriter(name, true);
  await w.truncate(size);
  await w.close();
  return size;
}

export async function writeParams(name: string): Promise<string> {
  const w = await openWriter(name);
  await w.write({ type: "write", position: 0, data: "head-" });
  await w.write({ type: "write", position: 5, data: "tail" });
  await w.close();
  return "head-tail";
}

export async function writeBlob(name: string): Promise<number> {
  const w = await openWriter(name);
  const blob = new Blob(["blob-payload"], { type: "text/plain" });
  await w.write(blob);
  await w.close();
  return blob.size;
}

export async function writeBuffer(name: string): Promise<number> {
  const w = await openWriter(name);
  const data = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
  await w.write(data);
  await w.close();
  return data.byteLength;
}
