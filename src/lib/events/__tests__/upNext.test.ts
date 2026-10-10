import { describe, expect, it } from "vitest";
import { selectUpNext, UP_NEXT_LIMIT, UP_NEXT_PRIORITY, type UpNextItem } from "../upNext";

function item(overrides: Partial<UpNextItem> & { id: string }): UpNextItem {
  return {
    title: "Do a thing",
    context: "Some event",
    href: `/x/${overrides.id}`,
    status: { tone: "act", label: "Your move" },
    priority: UP_NEXT_PRIORITY.housekeeping,
    ...overrides,
  };
}

describe("selectUpNext", () => {
  it("is empty for nothing outstanding", () => {
    expect(selectUpNext([])).toEqual([]);
  });

  it("puts the people blocking someone else first", () => {
    const result = selectUpNext([
      item({ id: "c", priority: UP_NEXT_PRIORITY.housekeeping }),
      item({ id: "a", priority: UP_NEXT_PRIORITY.blocking_someone }),
      item({ id: "b", priority: UP_NEXT_PRIORITY.terms }),
    ]);
    expect(result.map((entry) => entry.id)).toEqual(["a", "b", "c"]);
  });

  it("breaks ties by title so the order is stable between renders", () => {
    const result = selectUpNext([
      item({ id: "1", title: "Zebra", priority: UP_NEXT_PRIORITY.reply }),
      item({ id: "2", title: "Apple", priority: UP_NEXT_PRIORITY.reply }),
    ]);
    expect(result.map((entry) => entry.title)).toEqual(["Apple", "Zebra"]);
  });

  /*
   * The same action reaches this list by more than one route — an unanswered
   * contract is both an open offer and an unread thread — and showing it twice
   * makes the strip look padded with busywork.
   */
  it("de-duplicates by destination, keeping the first", () => {
    const result = selectUpNext([
      item({ id: "first", href: "/dashboard/messages/t-1", priority: UP_NEXT_PRIORITY.terms }),
      item({ id: "second", href: "/dashboard/messages/t-1", priority: UP_NEXT_PRIORITY.reply }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("first");
  });

  it("trims to the limit", () => {
    const many = Array.from({ length: 12 }, (_, index) => item({ id: `i-${index}` }));
    expect(selectUpNext(many)).toHaveLength(UP_NEXT_LIMIT);
    expect(selectUpNext(many, 2)).toHaveLength(2);
  });

  it("keeps the highest-priority items when trimming", () => {
    const result = selectUpNext(
      [
        ...Array.from({ length: 8 }, (_, index) =>
          item({ id: `low-${index}`, priority: UP_NEXT_PRIORITY.housekeeping })
        ),
        item({ id: "urgent", priority: UP_NEXT_PRIORITY.blocking_someone }),
      ],
      3
    );
    expect(result[0].id).toBe("urgent");
  });
});
