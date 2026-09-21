import { describe, expect, it } from "vitest";
import { VENDOR_SKILLS, getSkillExampleTitle, getSkillsAlphabetical, searchSkills } from "../skills";

describe("skill catalog", () => {
  it("gives every skill its own service example", () => {
    const examples = VENDOR_SKILLS.map((skill) => skill.exampleServiceTitle);
    expect(examples.every((example) => example.length > 0)).toBe(true);
    // A shared placeholder is the exact bug this field exists to prevent
    // (a photographer being shown a DJ example).
    expect(new Set(examples).size).toBe(examples.length);
  });

  it("looks up an example by slug", () => {
    expect(getSkillExampleTitle("photographer")).toBe("Half-day event photo coverage");
    expect(getSkillExampleTitle("dj")).toBe("4-hour open-format DJ set");
  });
});

describe("getSkillsAlphabetical", () => {
  it("sorts by display name", () => {
    const names = getSkillsAlphabetical().map((skill) => skill.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("keeps the stored catalog itself alphabetical", () => {
    // The array order is what a reader of skills.ts sees, so it shouldn't
    // disagree with what every picker renders.
    const stored = VENDOR_SKILLS.map((skill) => skill.name);
    expect(stored).toEqual([...stored].sort((a, b) => a.localeCompare(b)));
  });

  it("returns the whole catalog", () => {
    expect(getSkillsAlphabetical()).toHaveLength(VENDOR_SKILLS.length);
  });
});

describe("catalog scope", () => {
  it("offers exactly the thirteen launch categories", () => {
    expect(getSkillsAlphabetical().map((skill) => skill.slug)).toEqual([
      "bartender",
      "caterer",
      "chef",
      "content_creator",
      "decorator",
      "dj",
      "florist",
      "graphic_designer",
      "lighting_technician",
      "photo_booth",
      "photographer",
      "security",
      "videographer",
    ]);
  });

  it("still allows remote-only for the two desk-based categories", () => {
    // remoteEligibility.ts keys off this, so dropping "other" (which was
    // remote-eligible) must not have removed the last remote option.
    const remote = VENDOR_SKILLS.filter((skill) => skill.remoteEligible).map((s) => s.slug);
    expect(remote).toEqual(["content_creator", "graphic_designer"]);
  });
});

describe("searchSkills", () => {
  it("returns everything unpicked when the query is empty", () => {
    expect(searchSkills("", [])).toHaveLength(VENDOR_SKILLS.length);
  });

  it("excludes already-selected skills", () => {
    const result = searchSkills("", ["dj"]);
    expect(result.map((s) => s.slug)).not.toContain("dj");
    expect(result).toHaveLength(VENDOR_SKILLS.length - 1);
  });

  it("matches on name, case-insensitively", () => {
    expect(searchSkills("photo", []).map((s) => s.slug)).toContain("photographer");
    expect(searchSkills("PHOTO", []).map((s) => s.slug)).toContain("photographer");
  });

  it("matches on description so a synonym still finds the skill", () => {
    expect(searchSkills("music", []).map((s) => s.slug)).toContain("dj");
  });

  it("ignores surrounding whitespace", () => {
    expect(searchSkills("  florist  ", []).map((s) => s.slug)).toContain("florist");
  });

  it("returns nothing for a query that matches no skill", () => {
    expect(searchSkills("zzzzz", [])).toEqual([]);
  });
});
