import type {
  BookingContractAttachment,
  BookingMessageThread,
  BookingProposalAttachment,
  BookingProposalStatus,
  ChatMessage,
  DealProposalAttachment,
  EventMessageThread,
  MessageThread,
  ProposalMessageThread,
} from "@/lib/types/vendors";
import { createNotification } from "./notifications";

/**
 * Browser-local message threads. Three kinds, sharing one store:
 *  - ProposalMessageThread: anchored to a vendor proposal, created only via
 *    getOrCreateThreadForProposal — called from exactly two places,
 *    startConversation() and finalizeDeal() (see engagements.ts). A vendor
 *    can never create one.
 *  - BookingMessageThread: anchored to a confirmed venue booking, created
 *    only via getOrCreateThreadForBooking — called from exactly one place,
 *    startBookingConversation() (see bookingWorkflow.ts). An organizer can
 *    never create one — only the venue owner initiates.
 *  - EventMessageThread: the three-way room for one event, created only via
 *    getOrCreateEventThread — called from exactly one place, openEventRoom()
 *    (see spaces/eventRoom.ts), which is organizer-only and requires both a
 *    confirmed booking and a confirmed vendor. Neither a venue nor a vendor
 *    can create one.
 * All three are idempotent by their anchor id and never duplicated.
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

  // Checked before counterpartyId, which an event thread deliberately doesn't have.
  if (record.kind === "event") {
    if (typeof record.bookingId !== "string" || typeof record.venueId !== "string") return null;
    const participantIds = Array.isArray(record.participantIds)
      ? record.participantIds.filter((id): id is string => typeof id === "string")
      : [];
    const thread: EventMessageThread = {
      kind: "event",
      id: record.id,
      organizerId: record.organizerId,
      createdAt: record.createdAt,
      bookingId: record.bookingId,
      venueId: record.venueId,
      participantIds,
    };
    return thread;
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

export function isEventThread(thread: MessageThread): thread is EventMessageThread {
  return thread.kind === "event";
}

/**
 * Pure: every account in a thread, organizer first.
 *
 * The single place that answers "who is in this conversation". Two-party
 * threads have exactly two; the event room has N and grows as vendors confirm.
 * Read membership, delivery, and unread counts through this — comparing
 * against `counterpartyId` directly silently excludes everyone in an event
 * room except the venue operator.
 */
export function getThreadParticipantIds(thread: MessageThread): string[] {
  if (thread.kind === "event") {
    return [thread.organizerId, ...thread.participantIds.filter((id) => id !== thread.organizerId)];
  }
  return [thread.organizerId, thread.counterpartyId];
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

export function getEventThreadForBooking(bookingId: string): EventMessageThread | undefined {
  return getThreadsRaw().find(
    (thread): thread is EventMessageThread => isEventThread(thread) && thread.bookingId === bookingId
  );
}

export function getThreadsForParticipant(accountId: string): MessageThread[] {
  return getThreadsRaw().filter((thread) => getThreadParticipantIds(thread).includes(accountId));
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
 * Idempotent by bookingId. The three-way room for one event.
 *
 * Callers are responsible for the "organizer only, confirmed booking with at
 * least one confirmed vendor" gate — see openEventRoom() in
 * spaces/eventRoom.ts and docs/SECURITY.md's "Chat unlock timing". This is the
 * only kind of thread the organizer creates rather than receives, and that's
 * deliberate: it's their event, and the alternative is the group text off
 * Foundry that this exists to replace.
 */
export function getOrCreateEventThread(input: {
  bookingId: string;
  venueId: string;
  organizerId: string;
  participantIds: string[];
}): EventMessageThread {
  const existing = getEventThreadForBooking(input.bookingId);
  if (existing) return existing;

  const thread: EventMessageThread = {
    kind: "event",
    id: crypto.randomUUID(),
    bookingId: input.bookingId,
    venueId: input.venueId,
    organizerId: input.organizerId,
    participantIds: dedupeExcludingOrganizer(input.participantIds, input.organizerId),
    createdAt: new Date().toISOString(),
  };
  saveThreads([...getThreadsRaw(), thread]);
  return thread;
}

function dedupeExcludingOrganizer(ids: string[], organizerId: string): string[] {
  return [...new Set(ids)].filter((id) => id !== organizerId);
}

/**
 * Adds accounts to an existing event room, returning the ids actually added.
 *
 * Additive only — a vendor who confirmed later joins the room, but nobody is
 * ever silently removed from a conversation they've already been reading.
 * Removing a participant is a separate decision with its own consequences for
 * message history, and no UI asks for it yet.
 */
export function addEventThreadParticipants(threadId: string, accountIds: string[]): string[] {
  const threads = getThreadsRaw();
  const index = threads.findIndex((thread) => thread.id === threadId);
  if (index === -1) return [];

  const target = threads[index];
  if (!isEventThread(target)) return [];

  const existing = new Set(getThreadParticipantIds(target));
  const added = dedupeExcludingOrganizer(accountIds, target.organizerId).filter((id) => !existing.has(id));
  if (added.length === 0) return [];

  const updated: EventMessageThread = { ...target, participantIds: [...target.participantIds, ...added] };
  const next = [...threads];
  next[index] = updated;
  saveThreads(next);
  return added;
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
  return getThreadParticipantIds(thread).includes(accountId);
}

export function getMessagesForThread(threadId: string): ChatMessage[] {
  return getMessagesRaw()
    .filter((message) => message.threadId === threadId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function sendMessage(input: {
  threadId: string;
  senderId: string;
  body: string;
  /** Booking threads only — a venue owner's structured terms or deposit request. */
  proposal?: BookingProposalAttachment;
  /** Proposal threads only — a round of vendor deal terms from either side. */
  dealProposal?: DealProposalAttachment;
  /** Booking threads only — a formal agreement from the venue operator. */
  contract?: BookingContractAttachment;
}): ChatMessage {
  let stored = getMessagesRaw();

  /*
   * A new round of terms closes any still-open round on this thread. Without
   * this, an old counter stays acceptable forever and both sides can accept
   * different numbers, each believing theirs is the agreement.
   */
  if (input.dealProposal) {
    stored = stored.map((message) =>
      message.threadId === input.threadId && message.dealProposal?.status === "sent"
        ? { ...message, dealProposal: { ...message.dealProposal, status: "superseded" as const } }
        : message
    );
  }

  const message: ChatMessage = {
    id: crypto.randomUUID(),
    threadId: input.threadId,
    senderId: input.senderId,
    body: input.body.trim(),
    createdAt: new Date().toISOString(),
    readBy: [input.senderId],
    ...(input.proposal ? { proposal: input.proposal } : {}),
    ...(input.dealProposal ? { dealProposal: input.dealProposal } : {}),
    ...(input.contract ? { contract: input.contract } : {}),
  };
  saveMessages([...stored, message]);

  const thread = getThreadById(input.threadId);
  if (thread) {
    // Every other participant, not "the counterparty" — an event room has
    // several, and notifying only one of them is how someone misses the
    // message that moved their event.
    for (const recipientId of getThreadParticipantIds(thread).filter((id) => id !== input.senderId)) {
      createNotification({
        recipientId,
        type: "new_message",
        title: "New message",
        body: input.body.length > 80 ? `${input.body.slice(0, 80)}…` : input.body,
        link: `/dashboard/messages/${input.threadId}`,
      });
    }
  }

  return message;
}

/** Every round of deal terms on a thread, oldest first. Feed to resolveEffectiveDealTerms() (dealProposals.ts). */
export function getDealProposalsForThread(threadId: string): DealProposalAttachment[] {
  return getMessagesForThread(threadId)
    .map((message) => message.dealProposal)
    .filter((proposal): proposal is DealProposalAttachment => Boolean(proposal));
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

/**
 * Records the organizer's answer to a venue owner's proposal.
 *
 * Ownership-guarded: only the thread's organizer can respond, and only while
 * the proposal is still open — a decided proposal is an immutable record of
 * what both sides agreed, not a toggle. Accepting does NOT alter the booking
 * or move any money; see bookingProposals.ts for why that's deliberate.
 */
export function respondToBookingProposal(
  messageId: string,
  actorAccountId: string,
  status: Extract<BookingProposalStatus, "accepted" | "declined">
): ChatMessage | undefined {
  const messages = getMessagesRaw();
  const target = messages.find((message) => message.id === messageId);
  if (!target?.proposal || target.proposal.status !== "sent") return undefined;

  const thread = getThreadById(target.threadId);
  if (!thread || thread.organizerId !== actorAccountId) return undefined;

  const proposal: BookingProposalAttachment = {
    ...target.proposal,
    status,
    respondedAt: new Date().toISOString(),
  };
  const updated: ChatMessage = { ...target, proposal };
  saveMessages(messages.map((message) => (message.id === messageId ? updated : message)));

  createNotification({
    // Whoever sent the proposal, rather than the thread's counterparty: same
    // account on a booking thread, but reading it off the message can't pick
    // the wrong participant if this ever renders on another thread kind.
    recipientId: target.senderId,
    type: "new_message",
    title: status === "accepted" ? "Your proposal was accepted" : "Your proposal was declined",
    body: proposal.note,
    link: `/dashboard/messages/${target.threadId}`,
  });

  return updated;
}

/**
 * Records either side's answer to a round of vendor deal terms.
 *
 * Unlike respondToBookingProposal (organizer-only, because only a venue owner
 * sends those), either party may answer here — that symmetry is the point: a
 * planner can now counter a vendor and a vendor can counter back. Two guards
 * hold it together: you must be in the thread, and you can never respond to
 * your own round.
 *
 * Accepting records agreement on the numbers. It does NOT create the
 * engagement — finalizeDeal() still does, and reads the accepted round as its
 * starting point (see dealProposals.ts).
 */
export function respondToDealProposal(
  messageId: string,
  actorAccountId: string,
  status: Extract<DealProposalAttachment["status"], "accepted" | "declined">
): ChatMessage | undefined {
  const messages = getMessagesRaw();
  const target = messages.find((message) => message.id === messageId);
  if (!target?.dealProposal || target.dealProposal.status !== "sent") return undefined;
  if (target.senderId === actorAccountId) return undefined;

  const thread = getThreadById(target.threadId);
  if (!thread || !isThreadParticipant(thread, actorAccountId)) return undefined;

  const dealProposal: DealProposalAttachment = {
    ...target.dealProposal,
    status,
    respondedAt: new Date().toISOString(),
  };
  const updated: ChatMessage = { ...target, dealProposal };
  saveMessages(messages.map((message) => (message.id === messageId ? updated : message)));

  createNotification({
    recipientId: target.senderId,
    type: "deal_terms_proposed",
    title: status === "accepted" ? "Your terms were accepted" : "Your terms were declined",
    body: dealProposal.note,
    link: `/dashboard/messages/${target.threadId}`,
  });

  return updated;
}

/**
 * The planner countersigns a contract the host sent.
 *
 * Organizer-only and one-way: a signed contract is the record of what both
 * parties put their names to, not a toggle. Re-read bookingContracts.ts on
 * what this does and doesn't assert before changing anything here.
 */
export function signContract(
  messageId: string,
  actorAccountId: string,
  signature: string
): ChatMessage | undefined {
  const trimmed = signature.trim();
  if (trimmed.length < 2) return undefined;

  const messages = getMessagesRaw();
  const target = messages.find((message) => message.id === messageId);
  if (!target?.contract || target.contract.status !== "sent") return undefined;

  const thread = getThreadById(target.threadId);
  if (!thread || thread.organizerId !== actorAccountId) return undefined;

  const contract: BookingContractAttachment = {
    ...target.contract,
    status: "signed",
    organizerSignature: trimmed,
    organizerSignedAt: new Date().toISOString(),
  };
  const updated: ChatMessage = { ...target, contract };
  saveMessages(messages.map((message) => (message.id === messageId ? updated : message)));

  createNotification({
    recipientId: target.senderId,
    type: "contract_signed",
    title: "Your agreement was signed",
    body: `${trimmed} signed "${contract.title}".`,
    link: `/dashboard/messages/${target.threadId}`,
  });

  return updated;
}

/** The planner declines a contract, with an optional reason so the host can revise and resend. */
export function declineContract(
  messageId: string,
  actorAccountId: string,
  reason?: string
): ChatMessage | undefined {
  const messages = getMessagesRaw();
  const target = messages.find((message) => message.id === messageId);
  if (!target?.contract || target.contract.status !== "sent") return undefined;

  const thread = getThreadById(target.threadId);
  if (!thread || thread.organizerId !== actorAccountId) return undefined;

  const contract: BookingContractAttachment = {
    ...target.contract,
    status: "declined",
    declinedAt: new Date().toISOString(),
    declineReason: reason?.trim() || null,
  };
  const updated: ChatMessage = { ...target, contract };
  saveMessages(messages.map((message) => (message.id === messageId ? updated : message)));

  createNotification({
    recipientId: target.senderId,
    type: "contract_sent",
    title: "Your agreement wasn't signed",
    body: reason?.trim()
      ? `The planner declined "${contract.title}": ${reason.trim()}`
      : `The planner declined "${contract.title}". You can revise it and send a new one.`,
    link: `/dashboard/messages/${target.threadId}`,
  });

  return updated;
}

/** The host pulls back an unsigned contract — e.g. to correct a figure before the planner acts on it. */
export function withdrawContract(messageId: string, actorAccountId: string): ChatMessage | undefined {
  const messages = getMessagesRaw();
  const target = messages.find((message) => message.id === messageId);
  if (!target?.contract || target.contract.status !== "sent") return undefined;
  if (target.senderId !== actorAccountId) return undefined;

  const contract: BookingContractAttachment = { ...target.contract, status: "withdrawn" };
  const updated: ChatMessage = { ...target, contract };
  saveMessages(messages.map((message) => (message.id === messageId ? updated : message)));
  return updated;
}
