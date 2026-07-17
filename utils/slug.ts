export function slugify(text: string, existing: string[] = []): string {
  let slug = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!slug) slug = "untitled";
  if (existing.includes(slug)) {
    let i = 1;
    while (existing.includes(`${slug}-${i}`)) i++;
    slug = `${slug}-${i}`;
  }
  return slug;
}
