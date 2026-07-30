import { describe, expect, it } from "vitest";
import { filterPublicPortfolioItems } from "../eventPortfolio";

describe("filterPublicPortfolioItems", () => {
  it("keeps only items the vendor opted to display publicly", () => {
    const items = [
      { id: "a", displayPublicly: true },
      { id: "b", displayPublicly: false },
      { id: "c", displayPublicly: true },
    ];
    expect(filterPublicPortfolioItems(items).map((i) => i.id)).toEqual(["a", "c"]);
  });

  it("defaults to nothing public when no items are marked", () => {
    const items = [{ id: "a", displayPublicly: false }];
    expect(filterPublicPortfolioItems(items)).toEqual([]);
  });

  it("returns an empty array for no items", () => {
    expect(filterPublicPortfolioItems([])).toEqual([]);
  });
});
