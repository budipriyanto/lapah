import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/utils/admin-auth";
import { runSync, type SyncPhase, type SyncRunInput } from "@/utils/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

const PHASES: SyncPhase[] = [
  "destinations",
  "events",
  "reviews",
  "cleanup",
  "finalize",
];

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  let body: Partial<SyncRunInput>;

  try {
    const raw = (await req.json()) as unknown;
    if (!raw || typeof raw !== "object") {
      return NextResponse.json(
        { error: "Body JSON tidak valid" },
        { status: 400 },
      );
    }
    body = raw as Partial<SyncRunInput>;
  } catch {
    return NextResponse.json(
      { error: "Body JSON tidak valid" },
      { status: 400 },
    );
  }

  if (!body.phase || !PHASES.includes(body.phase)) {
    return NextResponse.json(
      { error: "Phase sinkronisasi tidak valid" },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await runSync(body as SyncRunInput));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Sinkronisasi gagal",
      },
      { status: 500 },
    );
  }
}
