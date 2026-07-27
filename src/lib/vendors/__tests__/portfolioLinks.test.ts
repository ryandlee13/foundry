import { describe, expect, it } from "vitest";
import { detectProvider, isValidPortfolioUrl } from "../portfolioLinks";

describe("detectProvider", () => {
  it.each([
    ["https://soundcloud.com/some-dj", "soundcloud"],
    ["https://www.mixcloud.com/some-dj", "mixcloud"],
    ["https://open.spotify.com/artist/123", "spotify"],
    ["https://www.youtube.com/watch?v=abc", "youtube"],
    ["https://youtu.be/abc", "youtube"],
    ["https://vimeo.com/12345", "vimeo"],
    ["https://www.instagram.com/someone", "instagram"],
    ["https://www.tiktok.com/@someone", "tiktok"],
    ["https://www.behance.net/someone", "behance"],
    ["https://dribbble.com/someone", "dribbble"],
    ["https://drive.google.com/drive/folders/abc", "google_drive"],
  ] as const)("detects %s as %s", (url, expected) => {
    expect(detectProvider(url)).toBe(expected);
  });

  it("falls back to 'website' for an unrecognized but valid URL", () => {
    expect(detectProvider("https://janedoephoto.com")).toBe("website");
  });

  it("falls back to 'other' for an unparseable URL", () => {
    expect(detectProvider("not a url")).toBe("other");
  });
});

describe("isValidPortfolioUrl", () => {
  it("accepts http and https URLs", () => {
    expect(isValidPortfolioUrl("https://example.com")).toBe(true);
    expect(isValidPortfolioUrl("http://example.com")).toBe(true);
  });

  it("rejects non-http(s) schemes and garbage input", () => {
    expect(isValidPortfolioUrl("javascript:alert(1)")).toBe(false);
    expect(isValidPortfolioUrl("not a url")).toBe(false);
  });
});
