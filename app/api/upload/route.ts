import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createNextcloudClient, NEXTCLOUD_DIR } from "@/utils/nextcloud";
import { ensureUploadedThumbnail } from "@/utils/sync";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: role } = await supabase.from("user_roles").select("role").eq("id", user.id).single();
  if (role?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const dav = createNextcloudClient();

  try {
    await dav.getDirectoryContents(NEXTCLOUD_DIR);
  } catch {
    await dav.createDirectory(NEXTCLOUD_DIR);
  }

  const ext = (file.name.split(".").pop() || "jpg")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 5) || "jpg";
  const slug = (formData.get("slug") as string) || "untitled";
  const order = (formData.get("order") as string) || "0";
  const safeSlug = slug.replace(/[^a-z0-9-]/g, "").slice(0, 50) || "untitled";
  const filename = `${safeSlug}-${order}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await dav.putFileContents(`${NEXTCLOUD_DIR}/${filename}`, buffer);

  await ensureUploadedThumbnail(buffer, filename);

  const url = `/api/nc-image?file=${encodeURIComponent(filename)}`;

  return NextResponse.json({ url });
}
