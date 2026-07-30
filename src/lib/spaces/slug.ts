export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Appends -2, -3, etc. until the slug doesn't collide with an existing one. */
export function uniqueSlug(name: string, existingSlugs: string[]): string {
  const base = slugify(name) || "space";
  if (!existingSlugs.includes(base)) return base;

  let counter = 2;
  let candidate = `${base}-${counter}`;
  while (existingSlugs.includes(candidate)) {
    counter += 1;
    candidate = `${base}-${counter}`;
  }
  return candidate;
}
