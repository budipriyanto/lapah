import crypto from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import { createNextcloudClient, NEXTCLOUD_DIR } from "@/utils/nextcloud";
import {
  SOURCE_BASE_URL,
  fetchSourceDestinations,
  fetchSourceEvents,
  fetchSourceReviews,
  normalizeSourceImages,
  resolveSourceImageUrl,
  toBoolean,
  toDateOnly,
  toInteger,
  toIsoTimestamp,
  toNullableString,
  toNumberOrNull,
  type SourceDestination,
  type SourceEvent,
  type SourceImage,
} from "@/utils/source-api";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const ALLOWED_IMAGE_FORMATS = new Set(["jpeg", "png", "webp", "gif", "avif"]);
const THUMB_WIDTH = 640;
const THUMB_QUALITY = 78;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type NextcloudClient = ReturnType<typeof createNextcloudClient>;

export type SyncPhase =
  | "destinations"
  | "events"
  | "reviews"
  | "cleanup"
  | "finalize";

export interface SyncPhaseSummary {
  inserted: number;
  updated: number;
  deleted: number;
  imagesCopied: number;
  imagesSkipped: number;
  failed: number;
}

export interface SyncRunInput {
  runId?: string;
  phase: SyncPhase;
  offset?: number;
  limit?: number;
  confirmMirror?: boolean;
  force?: boolean;
  error?: string;
}

export interface SyncItemResult {
  slug: string;
  title: string;
  action: "inserted" | "updated" | "failed";
  imagesCopied: number;
  imagesSkipped: number;
  error?: string;
}

export interface SyncRunResult {
  runId: string;
  phase: SyncPhase;
  nextOffset: number;
  done: boolean;
  summary: SyncPhaseSummary;
  details: SyncItemResult[];
  errors: string[];
}

interface LocalCatalogRow {
  id: string;
  title?: string;
  slug: string;
  source_id?: string | null;
}

interface LocalOnlyItem {
  id: string;
  title: string;
  slug: string;
}

interface EnsureAssetResult {
  nextcloudFile: string;
  size: number | null;
  copied: boolean;
}

export type ThumbnailStatus = "created" | "exists" | "skipped" | "failed";

export interface ThumbnailBackfillResult {
  offset: number;
  nextOffset: number;
  done: boolean;
  total: number;
  created: number;
  skipped: number;
  failed: number;
  errors: string[];
}

interface DownloadedImage {
  buffer: Buffer;
  ext: string;
  mime: string;
  checksum: string;
}

function emptySummary(): SyncPhaseSummary {
  return {
    inserted: 0,
    updated: 0,
    deleted: 0,
    imagesCopied: 0,
    imagesSkipped: 0,
    failed: 0,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function toUuidOrNull(value: unknown): string | null {
  return isUuid(value) ? value : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

let nextcloudDirPromise: Promise<void> | null = null;

async function ensureNextcloudDir(dav: NextcloudClient): Promise<void> {
  if (!nextcloudDirPromise) {
    nextcloudDirPromise = (async () => {
      try {
        await dav.getDirectoryContents(NEXTCLOUD_DIR);
      } catch {
        await dav.createDirectory(NEXTCLOUD_DIR);
      }
    })().catch((error) => {
      nextcloudDirPromise = null;
      throw error;
    });
  }

  return nextcloudDirPromise;
}

function assertSourceImageUrl(url: string): void {
  let allowed: URL;
  let target: URL;

  try {
    allowed = new URL(SOURCE_BASE_URL);
    target = new URL(url);
  } catch {
    throw new Error("URL gambar sumber tidak valid");
  }

  if (target.origin !== allowed.origin) {
    throw new Error("URL gambar bukan berasal dari sumber");
  }

  if (!target.pathname.includes("/uploads/")) {
    throw new Error("Path gambar sumber tidak valid");
  }
}

async function downloadImage(url: string): Promise<DownloadedImage> {
  assertSourceImageUrl(url);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Gambar merespons ${response.status}`);
    }

    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > MAX_IMAGE_BYTES) {
      throw new Error("Ukuran gambar melebihi 15 MB");
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
      throw new Error("Ukuran gambar melebihi 15 MB");
    }

    const buffer = Buffer.from(arrayBuffer);
    const metadata = await sharp(buffer).metadata();
    const format = metadata.format;

    if (!format || !ALLOWED_IMAGE_FORMATS.has(format)) {
      throw new Error(`Format gambar tidak didukung: ${format ?? "unknown"}`);
    }

    const ext = format === "jpeg" ? "jpg" : format;
    const mime = format === "jpeg" ? "image/jpeg" : `image/${format}`;
    const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

    return { buffer, ext, mime, checksum };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Timeout mengunduh ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function safeFilename(remoteUrl: string, ext: string): string {
  let basename = "gambar";

  try {
    const parsed = new URL(remoteUrl);
    basename = decodeURIComponent(path.basename(parsed.pathname));
  } catch {
    basename = path.basename(remoteUrl);
  }

  const stem =
    basename
      .replace(/\.[^.]+$/, "")
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/\.{2,}/g, ".")
      .replace(/^[^A-Za-z0-9]+/, "")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "gambar";

  return `${stem}.${ext}`;
}

function thumbFilename(filename: string): string {
  if (new RegExp(`-${THUMB_WIDTH}\\.webp$`, "i").test(filename)) {
    return filename;
  }

  const ext = path.extname(filename);
  const stem = ext ? filename.slice(0, -ext.length) : filename;
  return `${stem}-${THUMB_WIDTH}.webp`;
}

async function fileExists(dav: NextcloudClient, filename: string): Promise<boolean> {
  try {
    return await dav.exists(`${NEXTCLOUD_DIR}/${filename}`);
  } catch {
    return false;
  }
}

async function putThumbnail(
  dav: NextcloudClient,
  source: Buffer,
  filename: string,
): Promise<ThumbnailStatus> {
  const target = thumbFilename(filename);

  if (target === filename) {
    return "skipped";
  }

  try {
    const resized = await sharp(source)
      .resize(THUMB_WIDTH, undefined, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: THUMB_QUALITY })
      .toBuffer();

    await dav.putFileContents(`${NEXTCLOUD_DIR}/${target}`, resized, {
      overwrite: true,
    });

    return "created";
  } catch {
    return "failed";
  }
}

async function ensureThumbnail(
  dav: NextcloudClient,
  remoteUrl: string,
  filename: string,
  original?: Buffer,
): Promise<ThumbnailStatus> {
  const target = thumbFilename(filename);

  if (await fileExists(dav, target)) {
    return "exists";
  }

  try {
    const source = original ?? (await downloadImage(remoteUrl)).buffer;
    return await putThumbnail(dav, source, filename);
  } catch {
    return "failed";
  }
}

export async function ensureUploadedThumbnail(
  source: Buffer,
  filename: string,
): Promise<ThumbnailStatus> {
  try {
    const dav = createNextcloudClient();
    await ensureNextcloudDir(dav);
    return await putThumbnail(dav, source, filename);
  } catch {
    return "failed";
  }
}

async function ensureAsset(
  supabase: SupabaseClient,
  image: SourceImage,
  sourceType: "destination" | "event",
  sourceSlug: string,
  sourceLabel: string,
  sourceOrder: number,
): Promise<EnsureAssetResult> {
  const remoteUrl = resolveSourceImageUrl(image.image_url);
  const dav = createNextcloudClient();
  await ensureNextcloudDir(dav);

  const { data: existing } = await supabase
    .from("assets")
    .select("*")
    .eq("remote_url", remoteUrl)
    .maybeSingle();

  if (existing) {
    const exists = await fileExists(dav, existing.nextcloud_file);

    if (exists) {
      await ensureThumbnail(dav, remoteUrl, existing.nextcloud_file);

      return {
        nextcloudFile: existing.nextcloud_file,
        size: existing.size ?? null,
        copied: false,
      };
    }

    const downloaded = await downloadImage(remoteUrl);
    await dav.putFileContents(
      `${NEXTCLOUD_DIR}/${existing.nextcloud_file}`,
      downloaded.buffer,
      { overwrite: true },
    );

    await supabase
      .from("assets")
      .update({
        size: downloaded.buffer.length,
        mime: downloaded.mime,
        checksum: downloaded.checksum,
      })
      .eq("id", existing.id);

    await ensureThumbnail(
      dav,
      remoteUrl,
      existing.nextcloud_file,
      downloaded.buffer,
    );

    return {
      nextcloudFile: existing.nextcloud_file,
      size: downloaded.buffer.length,
      copied: true,
    };
  }

  const downloaded = await downloadImage(remoteUrl);
  const safeName = safeFilename(remoteUrl, downloaded.ext);
  let filename = safeName;

  if (await fileExists(dav, filename)) {
    filename = `${downloaded.checksum.slice(0, 12)}-${safeName}`;
  }

  if (await fileExists(dav, filename)) {
    filename = `${downloaded.checksum.slice(0, 12)}-${Date.now()}-${safeName}`;
  }

  try {
    await dav.putFileContents(`${NEXTCLOUD_DIR}/${filename}`, downloaded.buffer, {
      overwrite: false,
    });
  } catch {
    filename = `${downloaded.checksum.slice(0, 12)}-${Date.now()}-${safeName}`;
    await dav.putFileContents(`${NEXTCLOUD_DIR}/${filename}`, downloaded.buffer, {
      overwrite: false,
    });
  }

  const assetId = crypto.randomUUID();
  const { error } = await supabase.from("assets").insert({
    id: assetId,
    remote_url: remoteUrl,
    nextcloud_file: filename,
    filename,
    mime: downloaded.mime,
    size: downloaded.buffer.length,
    checksum: downloaded.checksum,
    source_type: sourceType,
    source_slug: sourceSlug,
    source_label: sourceLabel,
    is_hero_source: toBoolean(image.is_hero),
    source_order: sourceOrder,
  });

  if (error) {
    if (error.code === "23505") {
      const { data: raced } = await supabase
        .from("assets")
        .select("*")
        .eq("remote_url", remoteUrl)
        .maybeSingle();

      if (raced) {
        await ensureThumbnail(dav, remoteUrl, raced.nextcloud_file);

        return {
          nextcloudFile: raced.nextcloud_file,
          size: raced.size ?? null,
          copied: false,
        };
      }
    }

    throw new Error(error.message);
  }

  await ensureThumbnail(dav, remoteUrl, filename, downloaded.buffer);

  return {
    nextcloudFile: filename,
    size: downloaded.buffer.length,
    copied: true,
  };
}

function destinationPayload(destination: SourceDestination, sourceId: string) {
  return {
    title: destination.title,
    slug: destination.slug,
    category: destination.category,
    subcategory: toNullableString(destination.subcategory),
    description: toNullableString(destination.description),
    location: toNullableString(destination.location),
    address: toNullableString(destination.address),
    latitude: toNumberOrNull(destination.latitude),
    longitude: toNumberOrNull(destination.longitude),
    price_range: toNullableString(destination.price_range),
    opening_hours: toNullableString(destination.opening_hours),
    contact_phone: toNullableString(destination.contact_phone),
    contact_email: toNullableString(destination.contact_email),
    website_url: toNullableString(destination.website_url),
    rating_avg: toNumberOrNull(destination.rating_avg) ?? 0,
    review_count: toInteger(destination.review_count, 0),
    created_at: toIsoTimestamp(destination.created_at) ?? new Date().toISOString(),
    updated_at: toIsoTimestamp(destination.updated_at) ?? new Date().toISOString(),
    created_by: toUuidOrNull(destination.created_by),
    source_id: sourceId,
  };
}

function eventPayload(event: SourceEvent, sourceId: string) {
  return {
    title: event.title,
    slug: event.slug,
    location: toNullableString(event.location),
    description: toNullableString(event.description),
    date_start: toDateOnly(event.date_start),
    date_end: toDateOnly(event.date_end),
    time: toNullableString(event.time),
    created_at: toIsoTimestamp(event.created_at) ?? new Date().toISOString(),
    updated_at: toIsoTimestamp(event.updated_at) ?? new Date().toISOString(),
    created_by: toUuidOrNull(event.created_by),
    source_id: sourceId,
  };
}

async function findLocalDestination(
  supabase: SupabaseClient,
  destination: SourceDestination,
) {
  if (isUuid(destination.id)) {
    const { data } = await supabase
      .from("destinations")
      .select("*")
      .eq("source_id", destination.id)
      .maybeSingle();

    if (data) return data;
  }

  const { data } = await supabase
    .from("destinations")
    .select("*")
    .eq("slug", destination.slug)
    .maybeSingle();

  return data ?? null;
}

async function findLocalEvent(supabase: SupabaseClient, event: SourceEvent) {
  if (isUuid(event.id)) {
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("source_id", event.id)
      .maybeSingle();

    if (data) return data;
  }

  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("slug", event.slug)
    .maybeSingle();

  return data ?? null;
}

async function replaceDestinationImages(
  supabase: SupabaseClient,
  destinationId: string,
  destination: SourceDestination,
): Promise<Pick<SyncPhaseSummary, "imagesCopied" | "imagesSkipped" | "failed"> & {
  errors: string[];
}> {
  const images = normalizeSourceImages(destination.images);
  const rows: Record<string, unknown>[] = [];
  const errors: string[] = [];
  let imagesCopied = 0;
  let imagesSkipped = 0;

  for (const [index, image] of images.entries()) {
    try {
      const asset = await ensureAsset(
        supabase,
        image,
        "destination",
        destination.slug,
        destination.title,
        toInteger(image.image_order, index),
      );

      if (asset.copied) imagesCopied++;
      else imagesSkipped++;

      rows.push({
        id: crypto.randomUUID(),
        destination_id: destinationId,
        source_id: toUuidOrNull(image.id),
        image_url: `/api/nc-image?file=${encodeURIComponent(asset.nextcloudFile)}`,
        is_hero: toBoolean(image.is_hero),
        image_order: toInteger(image.image_order, index),
        image_size: asset.size ?? toNumberOrNull(image.image_size),
        created_at: toIsoTimestamp(image.created_at) ?? new Date().toISOString(),
      });
    } catch (error) {
      errors.push(
        `${destination.slug} gambar ${index + 1}: ${errorMessage(error)}`,
      );
    }
  }

  if (images.length > 0 && rows.length === 0) {
    return {
      imagesCopied,
      imagesSkipped,
      failed: errors.length,
      errors,
    };
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("destination_images").insert(rows);
    if (error) {
      throw new Error(`Gagal menyimpan gambar destinasi: ${error.message}`);
    }

    const newIds = rows
      .map((row) => row.id)
      .filter((id): id is string => typeof id === "string");

    const { error: deleteError } = await supabase
      .from("destination_images")
      .delete()
      .eq("destination_id", destinationId)
      .not("id", "in", `(${newIds.join(",")})`);

    if (deleteError) {
      throw new Error(`Gagal membersihkan gambar lama: ${deleteError.message}`);
    }
  } else {
    const { error } = await supabase
      .from("destination_images")
      .delete()
      .eq("destination_id", destinationId);

    if (error) {
      throw new Error(`Gagal membersihkan gambar lama: ${error.message}`);
    }
  }

  return {
    imagesCopied,
    imagesSkipped,
    failed: errors.length,
    errors,
  };
}

async function replaceEventImages(
  supabase: SupabaseClient,
  eventId: string,
  event: SourceEvent,
): Promise<Pick<SyncPhaseSummary, "imagesCopied" | "imagesSkipped" | "failed"> & {
  errors: string[];
}> {
  const images = normalizeSourceImages(event.images);
  const rows: Record<string, unknown>[] = [];
  const errors: string[] = [];
  let imagesCopied = 0;
  let imagesSkipped = 0;

  for (const [index, image] of images.entries()) {
    try {
      const asset = await ensureAsset(
        supabase,
        image,
        "event",
        event.slug,
        event.title,
        toInteger(image.image_order, index),
      );

      if (asset.copied) imagesCopied++;
      else imagesSkipped++;

      rows.push({
        id: crypto.randomUUID(),
        event_id: eventId,
        source_id: toUuidOrNull(image.id),
        image_url: `/api/nc-image?file=${encodeURIComponent(asset.nextcloudFile)}`,
        is_hero: toBoolean(image.is_hero),
        image_order: toInteger(image.image_order, index),
        image_size: asset.size ?? toNumberOrNull(image.image_size),
        created_at: toIsoTimestamp(image.created_at) ?? new Date().toISOString(),
      });
    } catch (error) {
      errors.push(`${event.slug} gambar ${index + 1}: ${errorMessage(error)}`);
    }
  }

  if (images.length > 0 && rows.length === 0) {
    return {
      imagesCopied,
      imagesSkipped,
      failed: errors.length,
      errors,
    };
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("event_images").insert(rows);
    if (error) {
      throw new Error(`Gagal menyimpan gambar event: ${error.message}`);
    }

    const newIds = rows
      .map((row) => row.id)
      .filter((id): id is string => typeof id === "string");

    const { error: deleteError } = await supabase
      .from("event_images")
      .delete()
      .eq("event_id", eventId)
      .not("id", "in", `(${newIds.join(",")})`);

    if (deleteError) {
      throw new Error(`Gagal membersihkan gambar lama: ${deleteError.message}`);
    }
  } else {
    const { error } = await supabase
      .from("event_images")
      .delete()
      .eq("event_id", eventId);

    if (error) {
      throw new Error(`Gagal membersihkan gambar lama: ${error.message}`);
    }
  }

  return {
    imagesCopied,
    imagesSkipped,
    failed: errors.length,
    errors,
  };
}

async function syncDestination(
  supabase: SupabaseClient,
  destination: SourceDestination,
): Promise<SyncPhaseSummary & { errors: string[] }> {
  if (!isUuid(destination.id)) {
    throw new Error("ID destinasi sumber bukan UUID yang valid");
  }
  if (!destination.title || !destination.slug) {
    throw new Error("Destinasi sumber tidak memiliki title/slug");
  }

  const payload = destinationPayload(destination, destination.id);
  const local = await findLocalDestination(supabase, destination);
  let inserted = 0;
  let updated = 0;
  let id: string;

  if (local) {
    const { error } = await supabase
      .from("destinations")
      .update(payload)
      .eq("id", local.id);

    if (error) throw new Error(error.message);
    id = local.id;
    updated = 1;
  } else {
    const { error } = await supabase
      .from("destinations")
      .insert({ id: destination.id, ...payload });

    if (error) throw new Error(error.message);
    id = destination.id;
    inserted = 1;
  }

  const images = await replaceDestinationImages(supabase, id, destination);

  return {
    inserted,
    updated,
    deleted: 0,
    imagesCopied: images.imagesCopied,
    imagesSkipped: images.imagesSkipped,
    failed: images.failed,
    errors: images.errors,
  };
}

async function syncEvent(
  supabase: SupabaseClient,
  event: SourceEvent,
): Promise<SyncPhaseSummary & { errors: string[] }> {
  if (!isUuid(event.id)) {
    throw new Error("ID event sumber bukan UUID yang valid");
  }
  if (!event.title || !event.slug) {
    throw new Error("Event sumber tidak memiliki title/slug");
  }

  const payload = eventPayload(event, event.id);
  if (!payload.date_start) {
    throw new Error("date_start event tidak valid");
  }

  const local = await findLocalEvent(supabase, event);
  let inserted = 0;
  let updated = 0;
  let id: string;

  if (local) {
    const { error } = await supabase
      .from("events")
      .update(payload)
      .eq("id", local.id);

    if (error) throw new Error(error.message);
    id = local.id;
    updated = 1;
  } else {
    const { error } = await supabase
      .from("events")
      .insert({ id: event.id, ...payload });

    if (error) throw new Error(error.message);
    id = event.id;
    inserted = 1;
  }

  const images = await replaceEventImages(supabase, id, event);

  return {
    inserted,
    updated,
    deleted: 0,
    imagesCopied: images.imagesCopied,
    imagesSkipped: images.imagesSkipped,
    failed: images.failed,
    errors: images.errors,
  };
}

async function syncReviews(
  supabase: SupabaseClient,
): Promise<
  SyncPhaseSummary & { errors: string[]; details: SyncItemResult[] }
> {
  const reviews = await fetchSourceReviews();
  const summary = emptySummary();
  const errors: string[] = [];
  const details: SyncItemResult[] = [];

  if (reviews.length === 0) {
    return { ...summary, errors, details };
  }

  const { data: localDestinations } = await supabase
    .from("destinations")
    .select("*");

  const bySourceId = new Map<string, LocalCatalogRow>();
  const bySlug = new Map<string, LocalCatalogRow>();

  for (const row of (localDestinations ?? []) as LocalCatalogRow[]) {
    if (row.source_id) bySourceId.set(row.source_id, row);
    bySlug.set(row.slug, row);
  }

  const ids = reviews.map((review) => review.id).filter(isUuid);
  const existingIds = new Set<string>();

  if (ids.length > 0) {
    const { data: existing } = await supabase
      .from("reviews")
      .select("id")
      .in("id", ids);

    for (const row of existing ?? []) {
      existingIds.add(row.id);
    }
  }

  for (const review of reviews) {
    if (!isUuid(review.id)) {
      summary.failed++;
      const message = `Review ${review.id}: ID bukan UUID yang valid`;
      errors.push(message);
      details.push({
        slug: review.dest_slug ?? review.destination_id,
        title: review.user_name ?? "Ulasan",
        action: "failed",
        imagesCopied: 0,
        imagesSkipped: 0,
        error: message,
      });
      continue;
    }

    const localDestination =
      bySourceId.get(review.destination_id) ??
      (review.dest_slug ? bySlug.get(review.dest_slug) : undefined);

    if (!localDestination) {
      summary.failed++;
      const message = `Review ${review.id}: destinasi ${review.dest_slug ?? review.destination_id} tidak ditemukan`;
      errors.push(message);
      details.push({
        slug: review.dest_slug ?? review.destination_id,
        title: review.user_name ?? "Ulasan",
        action: "failed",
        imagesCopied: 0,
        imagesSkipped: 0,
        error: message,
      });
      continue;
    }

    const payload = {
      id: review.id,
      destination_id: localDestination.id,
      user_id: toUuidOrNull(review.user_id),
      user_name: toNullableString(review.user_name) ?? "Anonymous",
      rating: toInteger(review.rating, 0),
      comment: toNullableString(review.comment),
      is_verified: toBoolean(review.is_verified),
      status: toNullableString(review.status) ?? "approved",
      created_at:
        toIsoTimestamp(review.created_at) ?? new Date().toISOString(),
      updated_at:
        toIsoTimestamp(review.updated_at) ?? new Date().toISOString(),
    };

    const { error } = await supabase
      .from("reviews")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      summary.failed++;
      const message = `Review ${review.id}: ${error.message}`;
      errors.push(message);
      details.push({
        slug: review.dest_slug ?? review.destination_id,
        title: review.user_name ?? "Ulasan",
        action: "failed",
        imagesCopied: 0,
        imagesSkipped: 0,
        error: message,
      });
      continue;
    }

    const isUpdate = existingIds.has(review.id);
    if (isUpdate) summary.updated++;
    else summary.inserted++;

    details.push({
      slug: review.dest_slug ?? review.destination_id,
      title: review.user_name ?? "Ulasan",
      action: isUpdate ? "updated" : "inserted",
      imagesCopied: 0,
      imagesSkipped: 0,
    });
  }

  return { ...summary, errors, details };
}

function matchLocalRows(
  localRows: LocalCatalogRow[],
  sourceRows: { id: string; slug: string }[],
): {
  newCount: number;
  updateCount: number;
  localOnly: LocalOnlyItem[];
} {
  const bySourceId = new Map<string, LocalCatalogRow>();
  const bySlug = new Map<string, LocalCatalogRow>();

  for (const row of localRows) {
    if (row.source_id) bySourceId.set(row.source_id, row);
    bySlug.set(row.slug, row);
  }

  const matchedIds = new Set<string>();
  let updateCount = 0;

  for (const source of sourceRows) {
    const local = bySourceId.get(source.id) ?? bySlug.get(source.slug);
    if (local) {
      matchedIds.add(local.id);
      updateCount++;
    }
  }

  const localOnly = localRows
    .filter((row) => !matchedIds.has(row.id))
    .map((row) => ({
      id: row.id,
      title: row.title ?? row.slug,
      slug: row.slug,
    }));

  return {
    newCount: Math.max(0, sourceRows.length - updateCount),
    updateCount,
    localOnly,
  };
}

async function cleanupMirror(
  supabase: SupabaseClient,
  force: boolean,
): Promise<{
  deletedDestinations: number;
  deletedEvents: number;
  sourceDestinations: number;
  sourceEvents: number;
  errors: string[];
}> {
  const [sourceDestinations, sourceEvents] = await Promise.all([
    fetchSourceDestinations(),
    fetchSourceEvents(),
  ]);

  if (sourceDestinations.length === 0 || sourceEvents.length === 0) {
    throw new Error(
      "Sumber mengembalikan data kosong; cleanup mirror dibatalkan",
    );
  }

  const { data: lastRun } = await supabase
    .from("sync_runs")
    .select("summary")
    .eq("status", "completed")
    .eq("mode", "mirror")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const previous = (lastRun?.summary ?? {}) as {
    source?: { destinations?: number; events?: number };
  };

  if (
    !force &&
    typeof previous.source?.destinations === "number" &&
    sourceDestinations.length < previous.source.destinations * 0.5
  ) {
    throw new Error(
      "Jumlah destinasi sumber turun drastis; cleanup dibatalkan. Periksa sumber terlebih dahulu.",
    );
  }

  if (
    !force &&
    typeof previous.source?.events === "number" &&
    sourceEvents.length < previous.source.events * 0.5
  ) {
    throw new Error(
      "Jumlah event sumber turun drastis; cleanup dibatalkan. Periksa sumber terlebih dahulu.",
    );
  }

  const { data: localDestinationRows } = await supabase
    .from("destinations")
    .select("*");
  const { data: localEventRows } = await supabase
    .from("events")
    .select("*");

  const sourceDestinationIds = new Set(
    sourceDestinations.map((row) => row.id),
  );
  const sourceDestinationSlugs = new Set(
    sourceDestinations.map((row) => row.slug),
  );
  const sourceEventIds = new Set(sourceEvents.map((row) => row.id));
  const sourceEventSlugs = new Set(sourceEvents.map((row) => row.slug));

  const deleteDestinationIds = (
    (localDestinationRows ?? []) as LocalCatalogRow[]
  )
    .filter((row) =>
      row.source_id
        ? !sourceDestinationIds.has(row.source_id)
        : !sourceDestinationSlugs.has(row.slug),
    )
    .map((row) => row.id);

  const deleteEventIds = ((localEventRows ?? []) as LocalCatalogRow[])
    .filter((row) =>
      row.source_id ? !sourceEventIds.has(row.source_id) : !sourceEventSlugs.has(row.slug),
    )
    .map((row) => row.id);

  if (deleteDestinationIds.length > 0) {
    await supabase
      .from("destination_images")
      .delete()
      .in("destination_id", deleteDestinationIds);
    await supabase
      .from("reviews")
      .delete()
      .in("destination_id", deleteDestinationIds);

    const { error } = await supabase
      .from("destinations")
      .delete()
      .in("id", deleteDestinationIds);

    if (error) {
      throw new Error(`Gagal menghapus destinasi lokal: ${error.message}`);
    }
  }

  if (deleteEventIds.length > 0) {
    await supabase.from("event_images").delete().in("event_id", deleteEventIds);

    const { error } = await supabase
      .from("events")
      .delete()
      .in("id", deleteEventIds);

    if (error) {
      throw new Error(`Gagal menghapus event lokal: ${error.message}`);
    }
  }

  return {
    deletedDestinations: deleteDestinationIds.length,
    deletedEvents: deleteEventIds.length,
    sourceDestinations: sourceDestinations.length,
    sourceEvents: sourceEvents.length,
    errors: [],
  };
}

export async function getSyncPreview() {
  const supabase = createAdminClient();

  const [sourceDestinations, sourceEvents, sourceReviews] = await Promise.all([
    fetchSourceDestinations(),
    fetchSourceEvents(),
    fetchSourceReviews(),
  ]);

  const { data: localDestinationData, error: destinationError } = await supabase
    .from("destinations")
    .select("*");
  if (destinationError) throw new Error(destinationError.message);

  const { data: localEventData, error: eventError } = await supabase
    .from("events")
    .select("*");
  if (eventError) throw new Error(eventError.message);

  const { data: assetRows, error: assetError } = await supabase
    .from("assets")
    .select("remote_url");
  if (assetError) {
    throw new Error(
      `Tabel assets belum siap. Jalankan migrasi Supabase terlebih dahulu. (${assetError.message})`,
    );
  }

  const localDestinations = (localDestinationData ?? []) as LocalCatalogRow[];
  const localEvents = (localEventData ?? []) as LocalCatalogRow[];
  const destinationStats = matchLocalRows(
    localDestinations,
    sourceDestinations,
  );
  const eventStats = matchLocalRows(localEvents, sourceEvents);

  const assetUrls = new Set(
    (assetRows ?? []).map((row) => row.remote_url as string),
  );
  const sourceImageUrls = new Set<string>();

  for (const destination of sourceDestinations) {
    for (const image of normalizeSourceImages(destination.images)) {
      sourceImageUrls.add(resolveSourceImageUrl(image.image_url));
    }
  }
  for (const event of sourceEvents) {
    for (const image of normalizeSourceImages(event.images)) {
      sourceImageUrls.add(resolveSourceImageUrl(image.image_url));
    }
  }

  return {
    sourceBaseUrl: SOURCE_BASE_URL,
    generatedAt: new Date().toISOString(),
    source: {
      destinations: sourceDestinations.length,
      events: sourceEvents.length,
      reviews: sourceReviews.length,
      images: sourceImageUrls.size,
    },
    destinations: {
      total: sourceDestinations.length,
      new: destinationStats.newCount,
      update: destinationStats.updateCount,
      delete: destinationStats.localOnly.length,
      localOnly: destinationStats.localOnly,
    },
    events: {
      total: sourceEvents.length,
      new: eventStats.newCount,
      update: eventStats.updateCount,
      delete: eventStats.localOnly.length,
      localOnly: eventStats.localOnly,
    },
    local: {
      destinations: localDestinations.length,
      events: localEvents.length,
    },
    assets: {
      existing: assetUrls.size,
      missing: [...sourceImageUrls].filter((url) => !assetUrls.has(url)).length,
    },
  };
}

async function getOrCreateRun(
  supabase: SupabaseClient,
  input: SyncRunInput,
): Promise<{ id: string }> {
  if (input.runId) {
    const { data, error } = await supabase
      .from("sync_runs")
      .select("id, status")
      .eq("id", input.runId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("Sesi sinkronisasi tidak ditemukan");
    if (data.status !== "running") {
      throw new Error("Sesi sinkronisasi sudah selesai");
    }

    return { id: data.id };
  }

  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: running } = await supabase
    .from("sync_runs")
    .select("id")
    .eq("status", "running")
    .gte("started_at", cutoff)
    .limit(1);

  if (running && running.length > 0 && !input.force) {
    throw new Error(
      "Sinkronisasi lain sedang berjalan. Tunggu hingga selesai atau gunakan force.",
    );
  }

  const id = crypto.randomUUID();
  const { error } = await supabase.from("sync_runs").insert({
    id,
    mode: "mirror",
    status: "running",
    summary: {},
  });

  if (error) throw new Error(error.message);
  return { id };
}

async function mergeRunSummary(
  supabase: SupabaseClient,
  runId: string,
  phase: SyncPhase,
  summary: SyncPhaseSummary,
  extra?: Record<string, unknown>,
): Promise<void> {
  const { data } = await supabase
    .from("sync_runs")
    .select("summary")
    .eq("id", runId)
    .maybeSingle();

  const current = (data?.summary ?? {}) as Record<string, unknown>;
  const phases = {
    ...((current.phases as Record<string, unknown> | undefined) ?? {}),
  };
  const previous = (phases[phase] as Partial<SyncPhaseSummary> | undefined) ?? {};

  phases[phase] = {
    inserted: (previous.inserted ?? 0) + summary.inserted,
    updated: (previous.updated ?? 0) + summary.updated,
    deleted: (previous.deleted ?? 0) + summary.deleted,
    imagesCopied: (previous.imagesCopied ?? 0) + summary.imagesCopied,
    imagesSkipped: (previous.imagesSkipped ?? 0) + summary.imagesSkipped,
    failed: (previous.failed ?? 0) + summary.failed,
  };

  await supabase
    .from("sync_runs")
    .update({ summary: { ...current, ...(extra ?? {}), phases } })
    .eq("id", runId);
}

async function finalizeRun(
  supabase: SupabaseClient,
  input: SyncRunInput,
): Promise<SyncRunResult> {
  if (!input.runId) {
    throw new Error("runId wajib diisi untuk finalize");
  }

  const { data: existing, error: findError } = await supabase
    .from("sync_runs")
    .select("id")
    .eq("id", input.runId)
    .maybeSingle();

  if (findError) throw new Error(findError.message);
  if (!existing) throw new Error("Sesi sinkronisasi tidak ditemukan");

  const status = input.error ? "failed" : "completed";
  const { error } = await supabase
    .from("sync_runs")
    .update({
      status,
      error: input.error ?? null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", input.runId);

  if (error) throw new Error(error.message);

  return {
    runId: input.runId,
    phase: "finalize",
    nextOffset: 0,
    done: true,
    summary: emptySummary(),
    details: [],
    errors: [],
  };
}

export async function runSync(input: SyncRunInput): Promise<SyncRunResult> {
  const supabase = createAdminClient();

  if (input.phase === "finalize") {
    return finalizeRun(supabase, input);
  }

  const run = await getOrCreateRun(supabase, input);
  const summary = emptySummary();
  const details: SyncItemResult[] = [];
  const errors: string[] = [];
  let nextOffset = 0;
  let done = false;
  let extra: Record<string, unknown> | undefined;

  try {
    if (input.phase === "destinations") {
      const source = await fetchSourceDestinations();
      const limit = clamp(input.limit ?? 3, 1, 5);
      const offset = Math.max(0, input.offset ?? 0);
      const batch = source.slice(offset, offset + limit);

      for (const destination of batch) {
        try {
          const result = await syncDestination(supabase, destination);
          summary.inserted += result.inserted;
          summary.updated += result.updated;
          summary.imagesCopied += result.imagesCopied;
          summary.imagesSkipped += result.imagesSkipped;
          summary.failed += result.failed;
          errors.push(...result.errors);
          details.push({
            slug: destination.slug,
            title: destination.title,
            action: result.inserted > 0 ? "inserted" : "updated",
            imagesCopied: result.imagesCopied,
            imagesSkipped: result.imagesSkipped,
          });
        } catch (error) {
          const message = errorMessage(error);
          summary.failed++;
          errors.push(`${destination.slug}: ${message}`);
          details.push({
            slug: destination.slug,
            title: destination.title,
            action: "failed",
            imagesCopied: 0,
            imagesSkipped: 0,
            error: message,
          });
        }
      }

      nextOffset = offset + batch.length;
      done = nextOffset >= source.length;
    } else if (input.phase === "events") {
      const source = await fetchSourceEvents();
      const limit = clamp(input.limit ?? 3, 1, 5);
      const offset = Math.max(0, input.offset ?? 0);
      const batch = source.slice(offset, offset + limit);

      for (const event of batch) {
        try {
          const result = await syncEvent(supabase, event);
          summary.inserted += result.inserted;
          summary.updated += result.updated;
          summary.imagesCopied += result.imagesCopied;
          summary.imagesSkipped += result.imagesSkipped;
          summary.failed += result.failed;
          errors.push(...result.errors);
          details.push({
            slug: event.slug,
            title: event.title,
            action: result.inserted > 0 ? "inserted" : "updated",
            imagesCopied: result.imagesCopied,
            imagesSkipped: result.imagesSkipped,
          });
        } catch (error) {
          const message = errorMessage(error);
          summary.failed++;
          errors.push(`${event.slug}: ${message}`);
          details.push({
            slug: event.slug,
            title: event.title,
            action: "failed",
            imagesCopied: 0,
            imagesSkipped: 0,
            error: message,
          });
        }
      }

      nextOffset = offset + batch.length;
      done = nextOffset >= source.length;
    } else if (input.phase === "reviews") {
      const result = await syncReviews(supabase);
      summary.inserted = result.inserted;
      summary.updated = result.updated;
      summary.failed = result.failed;
      errors.push(...result.errors);
      details.push(...result.details);
      nextOffset = summary.inserted + summary.updated + summary.failed;
      done = true;
    } else if (input.phase === "cleanup") {
      if (!input.confirmMirror) {
        throw new Error("Cleanup mirror memerlukan konfirmasi");
      }

      const result = await cleanupMirror(supabase, Boolean(input.force));
      summary.deleted =
        result.deletedDestinations + result.deletedEvents;
      errors.push(...result.errors);
      extra = {
        source: {
          destinations: result.sourceDestinations,
          events: result.sourceEvents,
        },
      };
      done = true;
    } else {
      throw new Error(`Phase tidak dikenal: ${input.phase}`);
    }
  } catch (error) {
    await supabase
      .from("sync_runs")
      .update({
        status: "failed",
        error: errorMessage(error),
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    throw error;
  }

  await mergeRunSummary(supabase, run.id, input.phase, summary, extra);

  return {
    runId: run.id,
    phase: input.phase,
    nextOffset,
    done,
    summary,
    details,
    errors,
  };
}

export async function listSyncRuns(limit = 20) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sync_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listAssets(limit = 200) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function ensureAssetThumbnail(asset: {
  remote_url: string;
  nextcloud_file: string;
}): Promise<ThumbnailStatus> {
  const dav = createNextcloudClient();
  await ensureNextcloudDir(dav);
  return ensureThumbnail(dav, asset.remote_url, asset.nextcloud_file);
}

export async function backfillAssetThumbnails(
  input: { offset?: number; limit?: number } = {},
): Promise<ThumbnailBackfillResult> {
  const supabase = createAdminClient();
  const offset = Math.max(0, input.offset ?? 0);
  const limit = clamp(input.limit ?? 3, 1, 6);

  const { count, error: countError } = await supabase
    .from("assets")
    .select("id", { count: "exact", head: true });

  if (countError) throw new Error(countError.message);

  const total = count ?? 0;

  const { data, error } = await supabase
    .from("assets")
    .select("remote_url, nextcloud_file")
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);

  let created = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const asset of data ?? []) {
    try {
      const status = await ensureAssetThumbnail(asset);

      if (status === "created") {
        created += 1;
      } else if (status === "failed") {
        failed += 1;
        errors.push(`${asset.nextcloud_file}: gagal membuat thumbnail`);
      } else {
        skipped += 1;
      }
    } catch (error) {
      failed += 1;
      errors.push(`${asset.nextcloud_file}: ${errorMessage(error)}`);
    }
  }

  const processed = data?.length ?? 0;

  return {
    offset,
    nextOffset: offset + processed,
    done: offset + processed >= total,
    total,
    created,
    skipped,
    failed,
    errors,
  };
}
