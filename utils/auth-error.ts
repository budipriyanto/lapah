type AuthErrorLike =
  | {
      message?: unknown;
      status?: number;
      code?: string;
    }
  | null
  | undefined;

export function authErrorMessage(error: AuthErrorLike, fallback: string): string {
  const raw = typeof error?.message === "string" ? error.message.trim() : "";

  if (raw && raw !== "{}" && raw !== "[object Object]") {
    if (/email address not authorized/i.test(raw)) {
      return "Email ini belum diizinkan oleh SMTP bawaan Supabase. Aktifkan custom SMTP atau gunakan email anggota tim.";
    }
    return raw;
  }

  if (error?.status) {
    return `${fallback} (HTTP ${error.status})`;
  }

  return fallback;
}
