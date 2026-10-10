import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

let sharpCache: typeof import('sharp').default | null = null;

async function getSharp(): Promise<typeof import('sharp').default | null> {
  if (!sharpCache) {
    try {
      sharpCache = (await import('sharp')).default;
    } catch (e) {
      console.warn(
        'Sharp tidak tersedia, upload disimpan tanpa optimasi server:',
        e instanceof Error ? e.message : e
      );
      return null;
    }
  }
  return sharpCache;
}

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'public/uploads';
const UPLOAD_MAX_SIZE = parseInt(process.env.UPLOAD_MAX_SIZE || '5242880'); // 5MB
const ALLOWED_EXTENSIONS = (process.env.UPLOAD_ALLOWED_EXTENSIONS || 'jpg,jpeg,png,webp,gif')
  .split(',')
  .map(ext => ext.trim().toLowerCase());

/**
 * Validate file extension
 */
function isValidExtension(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase().slice(1);
  return ALLOWED_EXTENSIONS.includes(ext);
}

/**
 * Generate safe filename
 */
function generateFilename(originalName: string, slug: string, order: string): string {
  const ext = path.extname(originalName);
  const safeSlug = slug.replace(/[^a-z0-9-]/g, '').slice(0, 50) || 'untitled';
  const safeOrder = order.replace(/[^0-9]/g, '') || '0';
  const timestamp = Date.now();
  return `${safeSlug}-${safeOrder}-${timestamp}${ext}`;
}

/**
 * Convert absolute/relative file path to public URL (/uploads/...)
 * path.join di Windows menghasilkan backslash — normalisasi dulu.
 */
function toPublicUrl(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const idx = normalized.indexOf('public/');
  const rel = idx >= 0
    ? normalized.slice(idx + 'public/'.length)
    : normalized;
  return '/' + rel.replace(/^\/+/, '');
}

/**
 * Optimize image with Sharp
 */
export async function optimizeImage(
  buffer: Buffer,
  width: number = 1200,
  quality: number = 80
): Promise<Buffer> {
  const sharp = await getSharp();
  if (!sharp) return buffer;
  return await sharp(buffer)
    .resize(width, undefined, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();
}

/**
 * Main upload handler
 * Catatan: terima FormData yang sudah dibaca di route handler
 * (req.body hanya bisa dibaca sekali).
 */
export async function handleUpload(
  formData: FormData,
  category: 'destinations' | 'events'
): Promise<NextResponse> {
  try {
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file size
    const size = file.size;
    if (size > UPLOAD_MAX_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File size exceeds limit (${(size / 1024 / 1024).toFixed(2)}MB > 5MB)`,
          details: { maxSize: UPLOAD_MAX_SIZE, uploadedSize: size },
        },
        { status: 400 }
      );
    }

    // Validate file extension
    const filename = file.name;
    if (!isValidExtension(filename)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Get form data
    const slug = (formData.get('slug') as string) || 'untitled';
    const order = (formData.get('order') as string) || '0';

    // Generate safe filename
    const safeFilename = generateFilename(filename, slug, order);

    const originalBuffer = Buffer.from(await file.arrayBuffer());
    const sharp = await getSharp();

    let finalBuffer: Buffer;
    let finalName: string;
    if (!sharp) {
      finalBuffer = originalBuffer;
      finalName = safeFilename;
    } else {
      const meta = await sharp(originalBuffer).metadata();
      const alreadyOptimized = meta.format === 'webp' && (meta.width ?? 0) <= 1200;
      if (alreadyOptimized) {
        finalBuffer = originalBuffer;
        finalName = safeFilename;
      } else {
        finalBuffer = await optimizeImage(originalBuffer);
        finalName = `${path.basename(safeFilename, path.extname(safeFilename))}.webp`;
      }
    }

    const dirPath = path.join(UPLOAD_DIR, category);
    await fs.mkdir(dirPath, { recursive: true });
    const filePath = path.join(dirPath, finalName);
    await fs.writeFile(filePath, finalBuffer);
    const stats = await fs.stat(filePath);
    const url = toPublicUrl(filePath);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: finalName.replace(/\.[^.]+$/, ''),
          imageUrl: url,
          fileName: finalName,
          fileSize: stats.size,
          uploadedAt: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    );
  }
}
