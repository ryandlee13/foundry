import type { BookingMessageThread, ChatMessage, MessageThread, ProposalMessageThread } from "@/lib/types/vendors";
import { createNotification } from "./notifications";

/**
 * Browser-local message threads. Two kinds, sharing one store:
 *  - ProposalMessageThread: anchored to a vendor proposal, created only via
 *    getOrCreateThreadForProposal — called from exactly two places,
 *    startConversation() and finalizeDeal() (see engagements.ts). A vendor
 *    can never create one.
 *  - BookingMessageThread: anchored to a confirmed venue booking, created
 *    only via getOrCreateThreadForBooking — called from exactly one place,
 *    startBookingConversation() (see bookingWorkflow.ts). An organizer can
 *    never create one — only the venue owner initiates.
 * Both are idempotent by their anchor id and never duplicated.
 */
const THREADS_KEY = "foundry.messages.threads";
const MESSAGES_KEY = "foundry.messages.messages";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Threads written before the `kind` discriminator existed have no `kind`
 * field and would narrow to neither branch of the union, breaking the inbox
 * for every existing user. Every thread that ever existed before this was a
 * proposal thread (booking threads are new), so a record with a proposalId
 * and no kind backfills as `kind: "proposal"`, with `vendorOwnerId` renamed
 * to `counterpartyId`. Returns null for anything unrecognizable, which
 * getThreadsRaw() drops.
 */
export function normalizeStoredThread(raw: unknown): MessageThread | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;

  if (typeof record.id !== "string" || typeof record.organizerId !== "string" || typeof record.createdAt !== "string") {
    return null;
  }

  const counterpartyId =
    typeof record.counterpartyId === "string"
      ? record.counterpartyId
      : typeof record.vendorOwnerId === "string"
        ? record.vendorOwnerId
        : undefined;
  if (!counterpartyId) return null;

  const kind = record.kind === "booking" ? "booking" : "proposal";

  if (kind === "booking") {
    if (typeof record.bookingId !== "string" || typeof record.venueId !== "string") return null;
    const thread: BookingMessageThread = {
      kind: "booking",
      id: record.id,
      organizerId: record.organizerId,
      counterpartyId,
      createdAt: record.createdAt,
      bookingId: record.bookingId,
      venueId: record.venueId,
    };
    return thread;
  }

  if (typeof record.proposalId !== "string" || typeof record.eventNeedId !== "string") return null;
  const thread: ProposalMessageThread = {
    kind: "proposal",
    id: record.id,
    organizerId: record.organizerId,
    counterpartyId,
    createdAt: record.createdAt,
    proposalId: record.proposalId,
    eventNeedId: record.eventNeedId,
    engagementId: typeof record.engagementId === "string" ? record.engagementId : null,
  };
  return thread;
}

export function isProposalThread(thread: MessageThread): thread is ProposalMessageThread {
  return thread.kind === "proposal";
}

export function isBookingThread(thread: MessageThread): thread is BookingMessageThread {
  return thread.kind === "booking";
}

function getThreadsRaw(): MessageThread[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(THREADS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    return parsed.map(normalizeStoredThread).filter((thread): thread is MessageThread => thread !== null);
  } catch {
    return [];
  }
}

function saveThreads(threads: MessageThread[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
}

function getMessagesRaw(): ChatMessage[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(MESSAGES_KEY);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function saveMessages(messages: ChatMessage[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
}

export function getThreadById(id: string): MessageThread | undefined {
  return getThreadsRaw().find((thread) => thread.id === id);
}

export function getThreadForEngagement(engagementId: string): ProposalMessageThread | undefined {
  return getThreadsRaw().find(
    (thread): thread is ProposalMessageThread => isProposalThread(thread) && thread.engagementId === engagementId
  );
}

export function getThreadForProposal(proposalId: string): ProposalMessageThread | undefined {
  return getThreadsRaw().find(
    (thread): thread is ProposalMessageThread => isProposalThread(thread) && thread.proposalId === proposalId
  );
}

export function getThreadForBooking(bookingId: string): BookingMessageThread | undefined {
  return getThreadsRaw().find(
    (thread): thread is BookingMessageThread => isBookingThread(thread) && thread.bookingId === bookingId
  );
}

export function getThreadsForParticipant(accountId: string): MessageThread[] {
  return getThreadsRaw().filter((thread) => thread.organizerId === accountId || thread.counterpartyId === accountId);
}

/**
 * Idempotent by proposalId — called from startConversation() (thread starts
 * with engagementId: null) and from finalizeDeal() (reuses the existing
 * thread if one exists, or creates one if the organizer finalized without
 * ever starting a conversation first).
 */
export function getOrCreateThreadForProposal(input: {
  proposalId: string;
  eventNeedId: string;
  organizerId: string;
  counterpartyId: string;
}): ProposalMessageThread {
  const existing = getThreadForProposal(input.proposalId);
  if (existing) return existing;

  const thread: ProposalMessageThread = {
    kind: "proposal",
    id: crypto.randomUUID(),
    proposalId: input.proposalId,
    eventNeedId: input.eventNeedId,
    engagementId: null,
    organizerId: input.organizerId,
    counterpartyId: input.counterpartyId,
    createdAt: new Date().toISOString(),
  };
  saveThreads([...getThreadsRaw(), thread]);
  return thread;
}

/**
 * Idempotent by bookingId. The venue-side mirror of getOrCreateThreadForProposal.
 * Callers are responsible for the "host only, confirmed bookings only" gate —
 * see startBookingConversation() in bookingWorkflow.ts and docs/SECURITY.md's
 * "Chat unlock timing".
 */
export function getOrCreateThreadForBooking(input: {
  bookingId: string;
  venueId: string;
  organizerId: string;
  venueOwnerId: string;
}): BookingMessageThread {
  const existing = getThreadForBooking(input.bookingId);
  if (existing) return existing;

  const thread: BookingMessageThread = {
    kind: "booking",
    id: crypto.randomUUID(),
    bookingId: input.bookingId,
    venueId: input.venueId,
    organizerId: input.organizerId,
    counterpartyId: input.venueOwnerId,
    createdAt: new Date().toISOString(),
  };
  saveThreads([...getThreadsRaw(), thread]);
  return thread;
}

/**
 * Upgrades an existing proposal-anchored thread in place once that proposal
 * is finalized — never creates a new thread. Narrows via isProposalThread()
 * before comparing proposalId so a booking thread (which has no proposalId)
 * can never accidentally match.
 */
export function attachEngagementToThread(proposalId: string, engagementId: string): ProposalMessageThread | undefined {
  const threads = getThreadsRaw();
  const index = threads.findIndex((thread) => isProposalThread(thread) && thread.proposalId === proposalId);
  if (index === -1) return undefined;

  const target = threads[index];
  if (!isProposalThread(target)) return undefined;

  const updated: ProposalMessageThread = { ...target, engagementId };
  const next = [...threads];
  next[index] = updated;
  saveThreads(next);
  return updated;
}

export function isThreadParticipant(thread: MessageThread, accountId: string): boolean {
  return thread.organizerId === accountId || thread.counterpartyId === accountId;
}

export function getMessagesForThread(threadId: string): ChatMessage[] {
  return getMessagesRaw()
    .filter((message) => message.threadId === threadId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function sendMessage(input: { threadId: string; senderId: string; body: string }): ChatMessage {
  const message: ChatMessage = {
    id: crypto.randomUUID(),
    threadId: input.threadId,
    senderId: input.senderId,
    body: input.body.trim(),
    createdAt: new Date().toISOString(),
    readBy: [input.senderId],
  };
  saveMessages([...getMessagesRaw(), message]);

  const thread = getThreadById(input.threadId);
  if (thread) {
    const recipientId = thread.organizerId === input.senderId ? thread.counterpartyId : thread.organizerId;
    createNotification({
      recipientId,
      type: "new_message",
      title: "New message",
      body: input.body.length > 80 ? `${input.body.slice(0, 80)}…` : input.body,
      link: `/dashboard/messages/${input.threadId}`,
    });
  }

  return message;
}

export function markThreadRead(threadId: string, readerId: string): void {
  const messages = getMessagesRaw();
  const next = messages.map((message) =>
    message.threadId === threadId && !message.readBy.includes(readerId)
      ? { ...message, readBy: [...message.readBy, readerId] }
      : message
  );
  saveMessages(next);
}

export function getUnreadMessageCount(threadId: string, readerId: string): number {
  return getMessagesForThread(threadId).filter((message) => !message.readBy.includes(readerId)).length;
}
