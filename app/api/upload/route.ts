import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient, type FileStat } from "webdav";
import { NextRequest, NextResponse } from "next/server";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

interface PropEntry {
  tagName: string;
  textContent: string | null;
}

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

  const davUrl = process.env.NEXTCLOUD_URL!;
  const davUser = process.env.NEXTCLOUD_USERNAME!;
  const pass = process.env.NEXTCLOUD_PASSWORD!;
  const token = process.env.NEXTCLOUD_SHARE_TOKEN!;

  const dav = createClient(davUrl, {
    username: davUser,
    password: pass,
  });

  try {
    await dav.getDirectoryContents("/Lapah");
  } catch {
    await dav.createDirectory("/Lapah");
  }

  const ext = file.name.split(".").pop() || "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await dav.putFileContents(`/Lapah/${filename}`, buffer);

  const statResult = await dav.stat(`/Lapah/${filename}`);
  const st = statResult as FileStat & { props?: PropEntry[] };
  const fileId = st.props?.find((p) => p.tagName === "oc:fileid")?.textContent ?? "";

  const host = new URL(davUrl).origin;
  const encoded = encodeURIComponent(filename);
  const url = `${host}/index.php/apps/files_sharing/publicpreview/${token}?file=/${encoded}&fileId=${fileId}&x=640&y=480&a=true`;

  return NextResponse.json({ url });
}
