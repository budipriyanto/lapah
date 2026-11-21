import { NextResponse } from "next/server";
import { requireAdmin } from "@/utils/admin-auth";
import { getSyncPreview } from "@/utils/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    return NextResponse.json(await getSyncPreview());
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal memuat preview sinkronisasi",
      },
      { status: 500 },
    );
  }
}
