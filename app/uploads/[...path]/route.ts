import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'public/uploads';

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;

  if (!segments?.length) {
    return new NextResponse(null, { status: 404 });
  }

  const ext = path.extname(segments[segments.length - 1]).toLowerCase().slice(1);
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return new NextResponse(null, { status: 404 });
  }

  const uploadRoot = path.resolve(process.cwd(), UPLOAD_DIR);
  const requested = path.resolve(uploadRoot, segments.join('/'));
  if (!requested.startsWith(uploadRoot + path.sep)) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const buffer = await fs.readFile(requested);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
