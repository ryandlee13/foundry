import { describe, expect, it } from "vitest";
import { canFillPosition, computeFilledPosition } from "../eventNeeds";

describe("canFillPosition (over-acceptance guard)", () => {
  it("allows filling when positions remain", () => {
    expect(canFillPosition({ positionsFilled: 1, positionsAvailable: 3 })).toBe(true);
  });

  it("blocks filling once positions are exhausted", () => {
    expect(canFillPosition({ positionsFilled: 3, positionsAvailable: 3 })).toBe(false);
  });

  it("blocks filling if somehow already over capacity", () => {
    expect(canFillPosition({ positionsFilled: 4, positionsAvailable: 3 })).toBe(false);
  });
});

describe("computeFilledPosition", () => {
  it("increments positionsFilled and keeps status when positions remain", () => {
    const result = computeFilledPosition({ positionsFilled: 0, positionsAvailable: 2, status: "published" });
    expect(result).toEqual({ positionsFilled: 1, status: "published" });
  });

  it("auto-closes to 'filled' once the last position is taken", () => {
    const result = computeFilledPosition({ positionsFilled: 1, positionsAvailable: 2, status: "published" });
    expect(result).toEqual({ positionsFilled: 2, status: "filled" });
  });

  it("marks filled immediately for single-position needs", () => {
    const result = computeFilledPosition({ positionsFilled: 0, positionsAvailable: 1, status: "published" });
    expect(result).toEqual({ positionsFilled: 1, status: "filled" });
  });
});
