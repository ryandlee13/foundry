import { describe, expect, it } from "vitest";
import {
  getConversationStarters,
  type StarterRole,
  type StarterThreadKind,
} from "../conversationStarters";

const KINDS: StarterThreadKind[] = ["booking", "proposal", "event"];
const ROLES: StarterRole[] = ["organizer", "venue_owner", "vendor"];

describe("getConversationStarters", () => {
  it("offers the planner and the host their own openings on a booking thread", () => {
    expect(getConversationStarters("booking", "organizer")[0]).toContain("looking forward");
    expect(getConversationStarters("booking", "venue_owner")[0]).toContain("Thank you for requesting");
  });

  it("gives every party a line in the three-way room", () => {
    for (const role of ROLES) {
      expect(getConversationStarters("event", role).length).toBeGreaterThan(0);
    }
  });

  it("returns an empty list for a role that can't be in that thread", () => {
    // A vendor is never a party to a booking thread, and a venue operator is
    // never a party to a proposal thread.
    expect(getConversationStarters("booking", "vendor")).toEqual([]);
    expect(getConversationStarters("proposal", "venue_owner")).toEqual([]);
  });

  it("never returns more than two suggestions", () => {
    for (const kind of KINDS) {
      for (const role of ROLES) {
        expect(getConversationStarters(kind, role).length).toBeLessThanOrEqual(2);
      }
    }
  });

  it("keeps every suggestion distinct", () => {
    const all = KINDS.flatMap((kind) => ROLES.flatMap((role) => getConversationStarters(kind, role)));
    expect(new Set(all).size).toBe(all.length);
  });
});
