import {
  resolveBookingProposalTone,
  resolveContractTone,
  resolveDealProposalTone,
  resolveEngagementTone,
  type StatusDescriptor,
  type ViewerRole,
} from "./statusTone";
import type {
  BookingContractAttachment,
  BookingProposalAttachment,
  ChatMessage,
  DealProposalAttachment,
  EngagementStatus,
} from "@/lib/types/vendors";

/**
 * "Is this conversation waiting on me?" — answered once, from the messages.
 *
 * A thread could have an unsigned contract, an unanswered deposit request and
 * an open round of terms in it, and the header said nothing about any of them.
 * The planner's only way to find out was to read the whole offers column.
 *
 * Derived from the message list and the engagement, never stored — the same
 * rule the rest of the thread follows (CLAUDE.md: thread state derives from
 * messages, there is no second store). That means this can't go stale: the
 * attachment statuses it reads are the ones the cards render.
 *
 * Pure. No storage, no `window`.
 */

export interface TurnSummary {
  /** The badge for the thread header and the inbox row. Null when nothing is outstanding. */
  status: StatusDescriptor | null;
  /**
   * One line of plain English naming what is outstanding — "Lena sent new
   * terms", "awaiting your signature". Null alongside a null status.
   */
  detail: string | null;
  /** True when the viewer is the one who has to move. Drives the inbox filter and the mobile dot. */
  isViewersTurn: boolean;
}

const NOTHING: TurnSummary = { status: null, detail: null, isViewersTurn: false };

function lastOpen<T>(messages: ChatMessage[], pick: (m: ChatMessage) => T | undefined, isOpen: (a: T) => boolean) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const attachment = pick(messages[index]);
    if (attachment && isOpen(attachment)) return { attachment, message: messages[index] };
  }
  return null;
}

/**
 * The most pressing outstanding item in a thread.
 *
 * Priority is deliberate and not arbitrary: a contract outranks a deposit ask
 * outranks a round of terms, because that is the order in which they settle a
 * booking. Signing is the last step, so if one is open it is the thing worth
 * naming in a single line of header.
 *
 * `senderRoleOf` tells us who sent a given message, which is what decides
 * whether an open deal round is the viewer's move or the other party's. The
 * caller knows the thread's membership; this module deliberately doesn't.
 */
export function summarizeTurn(input: {
  messages: ChatMessage[];
  viewer: ViewerRole;
  /** Resolves a message's sender to a marketplace role. */
  senderRoleOf: (senderId: string) => ViewerRole;
  /** Display name for a sender, for the detail line. */
  senderNameOf: (senderId: string) => string;
  /** The engagement on a proposal thread, when there is one. */
  engagementStatus?: EngagementStatus | null;
}): TurnSummary {
  const { messages, viewer, senderRoleOf, senderNameOf } = input;

  const contract = lastOpen<BookingContractAttachment>(
    messages,
    (m) => m.contract,
    (a) => a.status === "sent"
  );
  if (contract) {
    const status = resolveContractTone("sent", viewer);
    return {
      status,
      detail:
        viewer === "organizer"
          ? `${senderNameOf(contract.message.senderId)} sent an agreement to sign`
          : "Awaiting the planner's signature",
      isViewersTurn: status.tone === "act",
    };
  }

  const proposal = lastOpen<BookingProposalAttachment>(
    messages,
    (m) => m.proposal,
    (a) => a.status === "sent"
  );
  if (proposal) {
    const status = resolveBookingProposalTone("sent", viewer);
    const what = proposal.attachment.kind === "deposit_request" ? "a deposit request" : "revised terms";
    return {
      status,
      detail:
        viewer === "organizer"
          ? `${senderNameOf(proposal.message.senderId)} sent ${what}`
          : `Awaiting the planner's answer on ${what}`,
      isViewersTurn: status.tone === "act",
    };
  }

  const deal = lastOpen<DealProposalAttachment>(
    messages,
    (m) => m.dealProposal,
    (a) => a.status === "sent"
  );
  if (deal) {
    const senderRole = senderRoleOf(deal.message.senderId);
    const status = resolveDealProposalTone("sent", viewer, senderRole);
    return {
      status,
      detail:
        status.tone === "act"
          ? `${senderNameOf(deal.message.senderId)} sent new terms`
          : "Awaiting their answer on your terms",
      isViewersTurn: status.tone === "act",
    };
  }

  /*
   * No open attachment, but a hire can still be waiting on the vendor's
   * confirmation — which is the one "your turn" that lives on the engagement
   * rather than in the conversation.
   */
  if (input.engagementStatus === "pending_vendor_confirmation") {
    const status = resolveEngagementTone("pending_vendor_confirmation", viewer);
    return {
      status,
      detail:
        viewer === "vendor"
          ? "Confirm or decline the terms you were sent"
          : "Awaiting the vendor's confirmation",
      isViewersTurn: status.tone === "act",
    };
  }

  return NOTHING;
}
