import { NextResponse } from "next/server";
import { requireAdmin } from "@/utils/admin-auth";
import { listAssets } from "@/utils/sync";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    return NextResponse.json({ assets: await listAssets(200) });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Gagal memuat asset",
      },
      { status: 500 },
    );
  }
}
