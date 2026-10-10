import { describe, expect, it } from "vitest";
import {
  attachmentAnchorId,
  attachmentKindOf,
  CLUSTER_WINDOW_MS,
  groupMessages,
  hasAttachment,
} from "../messageGroups";
import type { BookingProposalAttachment, ChatMessage } from "@/lib/types/vendors";

function message(overrides: Partial<ChatMessage> & { id: string; createdAt: string }): ChatMessage {
  return {
    threadId: "t-1",
    senderId: "a-1",
    body: "hello",
    readBy: [],
    ...overrides,
  };
}

const PROPOSAL: BookingProposalAttachment = {
  kind: "revised_terms",
  status: "sent",
  startTime: "18:00",
  endTime: "23:00",
  hourlyRate: 300,
  depositAmount: null,
  note: "",
} as BookingProposalAttachment;

describe("groupMessages", () => {
  it("returns nothing for an empty thread", () => {
    expect(groupMessages([])).toEqual([]);
  });

  it("clusters consecutive messages from one sender inside the window", () => {
    const days = groupMessages([
      message({ id: "m1", createdAt: "2026-10-09T19:00:00" }),
      message({ id: "m2", createdAt: "2026-10-09T19:02:00" }),
      message({ id: "m3", createdAt: "2026-10-09T19:04:00" }),
    ]);

    expect(days).toHaveLength(1);
    expect(days[0].clusters).toHaveLength(1);
    expect(days[0].clusters[0].messages.map((m) => m.id)).toEqual(["m1", "m2", "m3"]);
    // The cluster is stamped once, at its start.
    expect(days[0].clusters[0].startedAt).toBe("2026-10-09T19:00:00");
  });

  it("breaks a cluster when the sender changes", () => {
    const days = groupMessages([
      message({ id: "m1", createdAt: "2026-10-09T19:00:00", senderId: "a-1" }),
      message({ id: "m2", createdAt: "2026-10-09T19:01:00", senderId: "a-2" }),
      message({ id: "m3", createdAt: "2026-10-09T19:02:00", senderId: "a-1" }),
    ]);
    expect(days[0].clusters.map((c) => c.senderId)).toEqual(["a-1", "a-2", "a-1"]);
  });

  it("breaks a cluster on a gap wider than the window", () => {
    const start = new Date("2026-10-09T19:00:00");
    const justInside = new Date(start.getTime() + CLUSTER_WINDOW_MS);
    const justOutside = new Date(justInside.getTime() + CLUSTER_WINDOW_MS + 1000);

    const days = groupMessages([
      message({ id: "m1", createdAt: start.toISOString() }),
      message({ id: "m2", createdAt: justInside.toISOString() }),
      message({ id: "m3", createdAt: justOutside.toISOString() }),
    ]);

    expect(days[0].clusters).toHaveLength(2);
    expect(days[0].clusters[0].messages.map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(days[0].clusters[1].messages.map((m) => m.id)).toEqual(["m3"]);
  });

  it("measures the gap from the previous message, not the cluster start", () => {
    // Three messages 4 minutes apart: 8 minutes end-to-end, but never a gap
    // wider than the window, so they stay one cluster.
    const days = groupMessages([
      message({ id: "m1", createdAt: "2026-10-09T19:00:00" }),
      message({ id: "m2", createdAt: "2026-10-09T19:04:00" }),
      message({ id: "m3", createdAt: "2026-10-09T19:08:00" }),
    ]);
    expect(days[0].clusters).toHaveLength(1);
  });

  it("splits days on the local calendar, not UTC", () => {
    const days = groupMessages([
      message({ id: "m1", createdAt: "2026-10-09T23:30:00" }),
      message({ id: "m2", createdAt: "2026-10-10T00:10:00" }),
    ]);
    expect(days).toHaveLength(2);
    expect(days[0].dayKey).toBe("2026-10-09");
    expect(days[1].dayKey).toBe("2026-10-10");
  });

  it("never clusters across a day boundary even inside the time window", () => {
    // 20 minutes apart but either side of midnight.
    const days = groupMessages([
      message({ id: "m1", createdAt: "2026-10-09T23:55:00" }),
      message({ id: "m2", createdAt: "2026-10-10T00:05:00" }),
    ]);
    expect(days).toHaveLength(2);
    expect(days[0].clusters).toHaveLength(1);
    expect(days[1].clusters).toHaveLength(1);
  });

  it("gives a message carrying an offer its own cluster", () => {
    const days = groupMessages([
      message({ id: "m1", createdAt: "2026-10-09T19:00:00" }),
      message({ id: "m2", createdAt: "2026-10-09T19:01:00", proposal: PROPOSAL }),
      message({ id: "m3", createdAt: "2026-10-09T19:02:00" }),
    ]);
    // An offer is a landmark — folded into a run of chat it gets skimmed past.
    expect(days[0].clusters).toHaveLength(3);
    expect(days[0].clusters[1].messages[0].id).toBe("m2");
  });

  it("keeps every message exactly once", () => {
    const input = [
      message({ id: "m1", createdAt: "2026-10-08T19:00:00" }),
      message({ id: "m2", createdAt: "2026-10-09T19:00:00" }),
      message({ id: "m3", createdAt: "2026-10-09T19:01:00" }),
      message({ id: "m4", createdAt: "2026-10-09T21:00:00", senderId: "a-2" }),
    ];
    const flattened = groupMessages(input).flatMap((d) => d.clusters.flatMap((c) => c.messages));
    expect(flattened.map((m) => m.id)).toEqual(["m1", "m2", "m3", "m4"]);
  });
});

describe("attachment helpers", () => {
  it("detects an attachment", () => {
    expect(hasAttachment(message({ id: "m1", createdAt: "2026-10-09T19:00:00" }))).toBe(false);
    expect(hasAttachment(message({ id: "m2", createdAt: "2026-10-09T19:00:00", proposal: PROPOSAL }))).toBe(true);
  });

  it("names the attachment kind, preferring a contract", () => {
    expect(attachmentKindOf(message({ id: "m1", createdAt: "2026-10-09T19:00:00" }))).toBeNull();
    expect(
      attachmentKindOf(message({ id: "m2", createdAt: "2026-10-09T19:00:00", proposal: PROPOSAL }))
    ).toBe("proposal");
  });

  it("builds a stable anchor id so the pointer and the card agree", () => {
    expect(attachmentAnchorId("m-42")).toBe("offer-card-m-42");
  });
});
