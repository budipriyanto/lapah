import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { authErrorMessage } from "@/utils/auth-error";

function safeNext(value: string | null): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return "/";
  }
  return value;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  const isRecovery =
    searchParams.get("type") === "recovery" ||
    next.startsWith("/auth/reset-password");

  const authError =
    searchParams.get("error_description") ||
    searchParams.get("error_code") ||
    searchParams.get("error");

  if (authError) {
    const target = isRecovery ? "/auth/lupa-password" : "/auth/login";
    const url = new URL(target, request.url);
    url.searchParams.set("error", authError);
    return NextResponse.redirect(url);
  }

  if (!code) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (!error) {
    if (isRecovery) {
      return NextResponse.redirect(
        new URL("/auth/reset-password", request.url),
      );
    }
    return NextResponse.redirect(new URL(next, request.url));
  }

  const url = new URL(
    isRecovery ? "/auth/lupa-password" : "/auth/login",
    request.url,
  );
  url.searchParams.set(
    "error",
    authErrorMessage(
      error,
      isRecovery
        ? "Gagal memverifikasi tautan reset."
        : "Gagal memverifikasi tautan.",
    ),
  );
  return NextResponse.redirect(url);
}
