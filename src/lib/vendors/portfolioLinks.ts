import type { PortfolioLink, PortfolioProvider } from "@/lib/types/vendors";

const PROVIDER_HOSTS: [string, PortfolioProvider][] = [
  ["soundcloud.com", "soundcloud"],
  ["mixcloud.com", "mixcloud"],
  ["open.spotify.com", "spotify"],
  ["spotify.com", "spotify"],
  ["youtube.com", "youtube"],
  ["youtu.be", "youtube"],
  ["vimeo.com", "vimeo"],
  ["instagram.com", "instagram"],
  ["tiktok.com", "tiktok"],
  ["behance.net", "behance"],
  ["dribbble.com", "dribbble"],
  ["drive.google.com", "google_drive"],
];

/** Best-effort provider detection from a URL's hostname — never fetches the URL, purely string matching. */
export function detectProvider(url: string): PortfolioProvider {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    const match = PROVIDER_HOSTS.find(([host]) => hostname === host || hostname.endsWith(`.${host}`));
    if (match) return match[1];
    return "website";
  } catch {
    return "other";
  }
}

export function isValidPortfolioUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function buildPortfolioLink(input: { url: string; title: string; description: string; displayOrder: number }): PortfolioLink {
  return {
    id: crypto.randomUUID(),
    url: input.url.trim(),
    title: input.title.trim(),
    description: input.description.trim(),
    provider: detectProvider(input.url),
    displayOrder: input.displayOrder,
  };
}
