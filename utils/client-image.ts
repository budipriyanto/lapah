const DEFAULT_MAX_WIDTH = 1200;
const WEBP_QUALITY = 0.8;
const JPEG_QUALITY = 0.85;

export async function uploadImageFile(
  file: File,
  opts: { slug: string; order: number; category?: string }
): Promise<string> {
  const compressed = await compressImageForUpload(file);
  const fd = new FormData();
  fd.append("file", compressed);
  fd.append("slug", opts.slug);
  fd.append("order", String(opts.order));
  if (opts.category) fd.append("category", opts.category);

  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const json = await res.json().catch(() => null);
  const url = json?.data?.imageUrl;
  if (!res.ok || !json?.success || !url) {
    throw new Error(json?.error || `Upload gagal (HTTP ${res.status})`);
  }
  return url;
}

function renameWithExt(file: Blob, originalName: string, ext: string): File {
  const base = originalName.replace(/\.[^.]+$/, "") || "image";
  return new File([file], `${base}.${ext}`, {
    type: file.type,
    lastModified: Date.now(),
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function compressImageForUpload(
  file: File,
  maxWidth: number = DEFAULT_MAX_WIDTH
): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }

  try {
    const scale = Math.min(1, maxWidth / bitmap.width);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const webpBlob = await canvasToBlob(canvas, "image/webp", WEBP_QUALITY);
    if (webpBlob && webpBlob.type === "image/webp") {
      return renameWithExt(webpBlob, file.name, "webp");
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    const jpegBlob = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);
    if (jpegBlob) {
      return renameWithExt(jpegBlob, file.name, "jpg");
    }

    return file;
  } finally {
    bitmap.close();
  }
}
