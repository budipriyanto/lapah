import { stdin, stdout, loadEnvFile } from "node:process";
import { createClient } from "@supabase/supabase-js";

function promptHidden(question) {
  return new Promise((resolve) => {
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let value = "";

    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off("data", onData);
    };

    const onData = (char) => {
      if (char === "\r" || char === "\n") {
        cleanup();
        stdout.write("\n");
        resolve(value);
        return;
      }
      if (char === "\u0003") {
        cleanup();
        stdout.write("\nDibatalkan.\n");
        process.exitCode = 1;
        resolve(null);
        return;
      }
      if (char === "\u007f" || char === "\b") {
        value = value.slice(0, -1);
        return;
      }
      value += char;
    };

    stdin.on("data", onData);
  });
}

function maskEmail(value) {
  const [local, domain] = value.split("@");
  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(1, local.length - 2))}@${domain}`;
}

async function findUserByEmail(supabase, targetEmail) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) throw new Error(error.message);

    const found = data.users.find(
      (user) => user.email?.toLowerCase() === targetEmail,
    );
    if (found) return found;

    if (data.users.length < 1000) break;
  }

  return null;
}

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();

  if (!email || email === "--help") {
    console.log(
      "Usage: npm run reset-admin -- admin@email.com\n" +
        "Script ini hanya mengubah password user yang punya role admin di user_roles.",
    );
    return;
  }

  try {
    loadEnvFile();
  } catch {
    throw new Error("File .env tidak ditemukan. Jalankan dari root project.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY kosong.",
    );
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const user = await findUserByEmail(supabase, email);
  if (!user) {
    throw new Error(`User dengan email ${email} tidak ditemukan.`);
  }

  const { data: role, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (roleError) throw new Error(roleError.message);

  if (role?.role !== "admin") {
    throw new Error(`User ${maskEmail(email)} bukan admin. Password tidak diubah.`);
  }

  const password = await promptHidden("Password admin baru: ");
  if (password === null) return;

  if (password.length < 6) {
    throw new Error("Password minimal 6 karakter.");
  }

  const confirm = await promptHidden("Ulangi password baru: ");
  if (confirm === null) return;

  if (password !== confirm) {
    throw new Error("Password tidak cocok.");
  }

  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password,
    ...(user.email_confirmed_at ? {} : { email_confirm: true }),
  });

  if (error) throw new Error(error.message);

  console.log(`Password admin ${maskEmail(email)} berhasil diubah.`);
}

main().catch((error) => {
  console.error(
    "Gagal reset password:",
    error instanceof Error ? error.message : String(error),
  );
  process.exitCode = 1;
});
