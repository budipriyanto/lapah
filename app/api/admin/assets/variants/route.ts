import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/utils/admin-auth";
import { backfillAssetThumbnails } from "@/utils/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await req.json().catch(() => ({}))) as {
      offset?: unknown;
      limit?: unknown;
    };

    const offset = Number(body.offset ?? 0);
    const limit = Number(body.limit ?? 3);

    return NextResponse.json(
      await backfillAssetThumbnails({
        offset: Number.isFinite(offset) ? offset : 0,
        limit: Number.isFinite(limit) ? limit : 3,
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal menyiapkan thumbnail",
      },
      { status: 500 },
    );
  }
}
