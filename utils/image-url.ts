export const NC_IMAGE_CARD_WIDTH = 640;

export function withImageWidth(src: string, width?: number): string;
export function withImageWidth(
  src: string | undefined,
  width?: number,
): string | undefined;
export function withImageWidth(
  src: string | undefined,
  width?: number,
): string | undefined {
  if (!src || !src.startsWith("/api/nc-image")) return src;

  const url = new URL(src, "https://local.invalid");
  if (width && width > 0) {
    url.searchParams.set("w", String(width));
  }

  return `${url.pathname}?${url.searchParams.toString()}`;
}
