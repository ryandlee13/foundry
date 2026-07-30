import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "../slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Redline Loft")).toBe("redline-loft");
  });

  it("strips punctuation", () => {
    expect(slugify("Jordan's Garden & Grill!")).toBe("jordan-s-garden-grill");
  });

  it("collapses repeated separators and trims leading/trailing hyphens", () => {
    expect(slugify("  --Neon   Foundry--  ")).toBe("neon-foundry");
  });

  it("returns an empty string for input with no alphanumeric characters", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("uniqueSlug", () => {
  it("returns the plain slug when there's no collision", () => {
    expect(uniqueSlug("Neon Foundry", ["lantern-house"])).toBe("neon-foundry");
  });

  it("appends -2 on a single collision", () => {
    expect(uniqueSlug("Neon Foundry", ["neon-foundry"])).toBe("neon-foundry-2");
  });

  it("keeps incrementing past multiple collisions", () => {
    const existing = ["neon-foundry", "neon-foundry-2", "neon-foundry-3"];
    expect(uniqueSlug("Neon Foundry", existing)).toBe("neon-foundry-4");
  });

  it("falls back to a generic base when the name has no alphanumeric characters", () => {
    expect(uniqueSlug("!!!", [])).toBe("space");
  });
});
