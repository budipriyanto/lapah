import { createClient } from "webdav";

function normalizeDir(value: string | undefined): string {
  const raw = (value ?? "").trim().replace(/\\/g, "/");
  if (!raw) return "/Lapah";

  const normalized = `/${raw.replace(/^\/+/, "")}`
    .replace(/\/+/g, "/")
    .replace(/\/+$/, "");

  return normalized && normalized !== "/" ? normalized : "/Lapah";
}

export const NEXTCLOUD_DIR = normalizeDir(process.env.NEXTCLOUD_DIR);

export function createNextcloudClient() {
  const url = process.env.NEXTCLOUD_URL;
  const username = process.env.NEXTCLOUD_USERNAME;
  const password = process.env.NEXTCLOUD_PASSWORD;

  if (!url || !username || !password) {
    throw new Error("Nextcloud credentials are not configured");
  }

  return createClient(url, { username, password });
}
