import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const w = req.nextUrl.searchParams.get("w");

  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
    if (!parsed.hostname.endsWith("lampungtimurkab.go.id")) {
      return NextResponse.json({ error: "Domain not allowed" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const width = Math.min(Math.max(parseInt(w || "0") || 640, 50), 1200);

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return NextResponse.json({ error: "Fetch failed" }, { status: 502 });

    const buffer = Buffer.from(await res.arrayBuffer());

    const result = await sharp(buffer)
      .resize(width, undefined, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    return new NextResponse(result, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400",
        "Content-Length": result.length.toString(),
      },
    });
  } catch {
    const fallback = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const buffer = await fallback.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": fallback.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "Content-Length": buffer.byteLength.toString(),
      },
    });
  }
}
