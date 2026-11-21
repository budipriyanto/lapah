import { NextResponse } from "next/server";
import { requireAdmin } from "@/utils/admin-auth";
import { listSyncRuns } from "@/utils/sync";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    return NextResponse.json({ runs: await listSyncRuns(20) });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal memuat riwayat sinkronisasi",
      },
      { status: 500 },
    );
  }
}
