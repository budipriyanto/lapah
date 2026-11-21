import path from "node:path";
import { unstable_cache } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { NEXTCLOUD_DIR } from "@/utils/nextcloud";

export const runtime = "nodejs";
export const maxDuration = 60;

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  svg: "image/svg+xml",
};

const SAFE_FILENAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const THUMB_WIDTH = 640;
const THUMB_MAX_WIDTH = 800;
const MAX_ACTIVE_FETCHES = 6;
const MAX_MEMORY_BYTES = 64 * 1024 * 1024;

interface CacheEntry {
  data: Buffer;
}

interface MemoryState {
  cache: Map<string, CacheEntry>;
  bytes: number;
}

interface QueueState {
  active: number;
  waiters: Array<() => void>;
}

const globalState = globalThis as typeof globalThis & {
  __ncImageMemory?: MemoryState;
  __ncImageQueue?: QueueState;
};

const memory =
  globalState.__ncImageMemory ??
  (globalState.__ncImageMemory = { cache: new Map(), bytes: 0 });

const queue =
  globalState.__ncImageQueue ??
  (globalState.__ncImageQueue = { active: 0, waiters: [] });

function thumbFilename(file: string): string {
  if (new RegExp(`-${THUMB_WIDTH}\\.webp$`, "i").test(file)) return file;
  const ext = path.extname(file);
  const stem = ext ? file.slice(0, -ext.length) : file;
  return `${stem}-${THUMB_WIDTH}.webp`;
}

function memoryGet(file: string): Buffer | null {
  const entry = memory.cache.get(file);
  if (!entry) return null;
  memory.cache.delete(file);
  memory.cache.set(file, entry);
  return entry.data;
}

function memorySet(file: string, data: Buffer): void {
  const existing = memory.cache.get(file);
  if (existing) {
    memory.bytes -= existing.data.length;
    memory.cache.delete(file);
  }

  memory.cache.set(file, { data });
  memory.bytes += data.length;

  while (memory.bytes > MAX_MEMORY_BYTES && memory.cache.size > 1) {
    const oldestKey = memory.cache.keys().next().value;
    if (!oldestKey) break;
    const oldest = memory.cache.get(oldestKey);
    if (oldest) memory.bytes -= oldest.data.length;
    memory.cache.delete(oldestKey);
  }
}

async function withLimit<T>(task: () => Promise<T>): Promise<T> {
  if (queue.active >= MAX_ACTIVE_FETCHES) {
    await new Promise<void>((resolve) => queue.waiters.push(resolve));
  }

  queue.active += 1;

  try {
    return await task();
  } finally {
    queue.active = Math.max(0, queue.active - 1);
    const next = queue.waiters.shift();
    if (next) next();
  }
}

function nextcloudUrl(file: string): string {
  const base = process.env.NEXTCLOUD_URL?.replace(/\/+$/, "");
  const username = process.env.NEXTCLOUD_USERNAME;
  const password = process.env.NEXTCLOUD_PASSWORD;

  if (!base || !username || !password) {
    throw new Error("Nextcloud credentials are not configured");
  }

  const dir = NEXTCLOUD_DIR.split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");

  if (/\/remote\.php\/dav\/files\/[^/]+$/i.test(base)) {
    return `${base}/${dir}/${encodeURIComponent(file)}`;
  }

  return `${base}/remote.php/dav/files/${encodeURIComponent(username)}/${dir}/${encodeURIComponent(file)}`;
}

function authHeader(): string {
  const username = process.env.NEXTCLOUD_USERNAME ?? "";
  const password = process.env.NEXTCLOUD_PASSWORD ?? "";
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

async function fetchFromNextcloud(file: string): Promise<string> {
  const response = await fetch(nextcloudUrl(file), {
    headers: { Authorization: authHeader() },
    cache: "no-store",
    signal: AbortSignal.timeout(55_000),
  });

  if (!response.ok) {
    throw new Error(`Nextcloud merespons ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) {
    throw new Error("File Nextcloud kosong");
  }

  return buffer.toString("base64");
}

const getFileFromCache = unstable_cache(
  async (file: string) => fetchFromNextcloud(file),
  ["nc-image-v2"],
  { revalidate: false },
);

async function loadFile(file: string): Promise<Buffer> {
  const cached = memoryGet(file);
  if (cached) return cached;

  const base64 = await withLimit(() => getFileFromCache(file));
  const data = Buffer.from(base64, "base64");
  memorySet(file, data);
  return data;
}

export async function GET(req: NextRequest) {
  const file = req.nextUrl.searchParams.get("file") ?? "";
  const w = req.nextUrl.searchParams.get("w");

  if (!file) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (
    file.includes("/") ||
    file.includes("\\") ||
    file.includes("..") ||
    !SAFE_FILENAME.test(file)
  ) {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }

  const parsedWidth = parseInt(w || "0", 10);
  const width =
    Number.isFinite(parsedWidth) && parsedWidth > 0
      ? Math.min(Math.max(parsedWidth, 50), 1200)
      : 0;

  const target = width > 0 && width <= THUMB_MAX_WIDTH ? thumbFilename(file) : file;
  let servedFile = target;
  let data: Buffer;

  try {
    data = await loadFile(target);
  } catch {
    if (target === file) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    servedFile = file;

    try {
      data = await loadFile(file);
    } catch {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const ext = path.extname(servedFile).slice(1).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || "application/octet-stream";

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": data.length.toString(),
    },
  });
}
