import { describe, expect, it } from "vitest";
import { EVENT_TYPE_LABELS } from "../labels";
import { getEventTypeLabel, getEventTypesAlphabetical, searchEventTypes } from "../eventTypes";

describe("getEventTypesAlphabetical", () => {
  it("returns every event type", () => {
    expect(getEventTypesAlphabetical()).toHaveLength(Object.keys(EVENT_TYPE_LABELS).length);
  });

  it("sorts by the visible label, not the slug", () => {
    const labels = getEventTypesAlphabetical().map((option) => option.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
    // Slug order would put popup ("Pop-up") after photo_video_shoot; label
    // order is what matters here, so assert the readable result directly.
    expect(labels[0]).toBe("Brand activation");
  });
});

describe("searchEventTypes", () => {
  it("returns everything for an empty query", () => {
    expect(searchEventTypes("")).toHaveLength(Object.keys(EVENT_TYPE_LABELS).length);
  });

  it("ignores surrounding whitespace", () => {
    expect(searchEventTypes("   ")).toHaveLength(Object.keys(EVENT_TYPE_LABELS).length);
  });

  it("matches case-insensitively on a substring", () => {
    expect(searchEventTypes("WEDD").map((o) => o.value)).toEqual(["wedding"]);
  });

  it("matches mid-label, not just the start", () => {
    expect(searchEventTypes("activation").map((o) => o.value)).toEqual(["brand_activation"]);
  });

  it("can return several matches, still alphabetical", () => {
    const result = searchEventTypes("p");
    expect(result.length).toBeGreaterThan(1);
    const labels = result.map((o) => o.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
  });

  it("returns nothing when no label matches", () => {
    expect(searchEventTypes("zzzzz")).toEqual([]);
  });
});

describe("getEventTypeLabel", () => {
  it("resolves a selected value to its label", () => {
    expect(getEventTypeLabel("dinner")).toBe("Dinner");
  });

  it("returns an empty string when nothing is selected", () => {
    expect(getEventTypeLabel(null)).toBe("");
  });
});
