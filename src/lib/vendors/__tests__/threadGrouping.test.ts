import { describe, expect, it } from "vitest";
import { groupThreadsByBooking } from "../threadGrouping";

interface Item {
  id: string;
  label: string;
}

describe("groupThreadsByBooking", () => {
  it("groups items sharing a bookingId together", () => {
    const groups = groupThreadsByBooking<Item>([
      { bookingId: "b1", item: { id: "t1", label: "DJ" } },
      { bookingId: "b1", item: { id: "t2", label: "Photographer" } },
      { bookingId: "b2", item: { id: "t3", label: "Florist" } },
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toEqual({ groupKey: "b1", items: [{ id: "t1", label: "DJ" }, { id: "t2", label: "Photographer" }] });
    expect(groups[1]).toEqual({ groupKey: "b2", items: [{ id: "t3", label: "Florist" }] });
  });

  it("falls back to the item's own id as a single-item group when bookingId is null", () => {
    const groups = groupThreadsByBooking<Item>([{ bookingId: null, item: { id: "t1", label: "Orphan" } }]);
    expect(groups).toEqual([{ groupKey: "t1", items: [{ id: "t1", label: "Orphan" }] }]);
  });

  it("preserves input order across and within groups", () => {
    const groups = groupThreadsByBooking<Item>([
      { bookingId: "b2", item: { id: "t3", label: "third" } },
      { bookingId: "b1", item: { id: "t1", label: "first" } },
      { bookingId: "b1", item: { id: "t2", label: "second" } },
    ]);
    expect(groups.map((g) => g.groupKey)).toEqual(["b2", "b1"]);
    expect(groups[1].items.map((i) => i.label)).toEqual(["first", "second"]);
  });

  it("returns an empty array for no items", () => {
    expect(groupThreadsByBooking([])).toEqual([]);
  });
});
