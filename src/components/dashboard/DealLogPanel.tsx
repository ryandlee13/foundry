"use client";

import { useMemo, useState, type ReactNode } from "react";
import { attachmentAnchorId } from "@/lib/vendors/messageGroups";
import BookingProposalCard from "./BookingProposalCard";
import BookingProposalComposer from "./BookingProposalComposer";
import ContractCard from "./ContractCard";
import ContractComposer from "./ContractComposer";
import DealProposalCard from "./DealProposalCard";
import DealProposalComposer from "./DealProposalComposer";
import type {
  BookingContractAttachment,
  BookingProposalAttachment,
  ChatMessage,
  DealProposalAttachment,
  PricingModel,
} from "@/lib/types/vendors";

/**
 * The right-hand column of a conversation: everything with a number or a
 * signature on it, in one running log, separate from the chat.
 *
 * Teddy's framing — two columns side by side, talk on the left and offers on
 * the right — is the reason this is split out rather than threaded inline.
 * Mixed into the chat, an offer scrolls away and people re-state numbers in
 * prose; pulled out, "what have we actually agreed" is always on screen.
 *
 * Entries are derived from the messages themselves (every offer is an
 * attachment on a message), so the log can't drift from the conversation and
 * there's no second store to keep in sync.
 */

type ComposerMode = "none" | "booking_proposal" | "contract" | "deal_terms";

export default function DealLogPanel({
  messages,
  userId,
  nameFor,
  hostName,
  canSendBookingProposal,
  canSendContract,
  contractSeed,
  canProposeTerms,
  dealSenderRole,
  currentDealTerms,
  isOrganizer,
  onSendBookingProposal,
  onRespondToBookingProposal,
  onSendContract,
  onSignContract,
  onDeclineContract,
  onWithdrawContract,
  onSendDealProposal,
  onRespondToDealProposal,
  footer,
}: {
  messages: ChatMessage[];
  userId: string;
  nameFor: (senderId: string) => string;
  hostName: string;
  /** Venue operator on a booking thread. */
  canSendBookingProposal: boolean;
  canSendContract: boolean;
  contractSeed: { title: string; scope: string; totalAmount: number | null; depositAmount: number | null };
  /** Either side on a proposal thread, while the deal is still open. */
  canProposeTerms: boolean;
  dealSenderRole: DealProposalAttachment["senderRole"];
  currentDealTerms: { amount: number; pricingModel: PricingModel; deliverables: string };
  isOrganizer: boolean;
  onSendBookingProposal: (attachment: BookingProposalAttachment, body: string) => void;
  onRespondToBookingProposal: (messageId: string, status: "accepted" | "declined") => void;
  onSendContract: (contract: BookingContractAttachment, body: string) => void;
  onSignContract: (messageId: string, signature: string) => void;
  onDeclineContract: (messageId: string, reason: string) => void;
  onWithdrawContract: (messageId: string) => void;
  onSendDealProposal: (attachment: DealProposalAttachment, body: string) => void;
  onRespondToDealProposal: (messageId: string, status: "accepted" | "declined") => void;
  footer: ReactNode;
}) {
  const [composer, setComposer] = useState<ComposerMode>("none");

  const [showPrevious, setShowPrevious] = useState(false);

  /*
   * Newest first, with anything still open pulled to the top.
   *
   * The log used to render in message order, which meant the round everyone is
   * actually arguing about sank to the bottom of a scrolling column as the
   * conversation went on — the one card that needed an answer was the one you
   * had to scroll to find.
   *
   * Settled rounds aren't deleted, just folded away: "what did we agree three
   * rounds ago" is a real question, and superseded terms are the audit trail
   * that answers it.
   */
  const { open, previous } = useMemo(() => {
    const entries = messages.filter(
      (message) => message.proposal || message.dealProposal || message.contract
    );
    const isOpen = (message: ChatMessage) =>
      message.contract?.status === "sent" ||
      message.proposal?.status === "sent" ||
      message.dealProposal?.status === "sent";

    const newestFirst = [...entries].reverse();
    return {
      open: newestFirst.filter(isOpen),
      previous: newestFirst.filter((message) => !isOpen(message)),
    };
  }, [messages]);

  const entries = [...open, ...previous];
  const hasActions = canSendBookingProposal || canSendContract || canProposeTerms;

  function close() {
    setComposer("none");
  }

  /**
   * One card, wrapped in its scroll anchor.
   *
   * The id comes from `attachmentAnchorId()` — the same function the chat
   * pointer uses to find it — so the two can't drift apart. Without the shared
   * helper, "jump to this offer" is a string built in two places.
   */
  function renderCard(message: ChatMessage): ReactNode {
    const isMine = message.senderId === userId;
    const senderName = nameFor(message.senderId);

    const card = message.dealProposal ? (
      <DealProposalCard
        proposal={message.dealProposal}
        senderName={senderName}
        isMine={isMine}
        canRespond={!isMine}
        onRespond={(status) => onRespondToDealProposal(message.id, status)}
      />
    ) : message.contract ? (
      <ContractCard
        contract={message.contract}
        hostName={hostName}
        canSign={isOrganizer && !isMine}
        canWithdraw={isMine}
        onSign={(signature) => onSignContract(message.id, signature)}
        onDecline={(reason) => onDeclineContract(message.id, reason)}
        onWithdraw={() => onWithdrawContract(message.id)}
      />
    ) : (
      <BookingProposalCard
        proposal={message.proposal!}
        canRespond={isOrganizer && !isMine}
        onRespond={(status) => onRespondToBookingProposal(message.id, status)}
      />
    );

    return (
      <div key={message.id} id={attachmentAnchorId(message.id)} className="rounded-2xl">
        {card}
      </div>
    );
  }

  return (
    <aside className="flex min-h-0 flex-col rounded-2xl border border-line bg-paper-dim/40 p-4">
      <div>
        <h2 className="font-display text-base font-semibold text-ink">Offers &amp; agreements</h2>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
          Every number and signature for this booking, kept out of the chat so nothing scrolls away.
        </p>
      </div>

      <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto">
        {entries.length === 0 && composer === "none" && (
          <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-soft">
            Nothing proposed yet. {hasActions ? "Send terms to get started." : "Offers will appear here."}
          </p>
        )}

        {open.map((message) => renderCard(message))}

        {previous.length > 0 && (
          <div className={open.length > 0 ? "border-t border-line pt-3" : undefined}>
            <button
              type="button"
              onClick={() => setShowPrevious((current) => !current)}
              aria-expanded={showPrevious}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1 text-xs font-semibold text-ink-soft transition-colors hover:text-ink"
            >
              <span>
                {showPrevious ? "Hide" : "Show"} previous rounds ({previous.length})
              </span>
              <span aria-hidden className={showPrevious ? "rotate-180" : undefined}>
                ⌄
              </span>
            </button>
            {showPrevious && (
              /*
                Dimmed, not hidden: these are settled or superseded, so they
                should read as history rather than competing with the live card
                above them for attention.
              */
              <div className="mt-2 space-y-3 opacity-70">
                {previous.map((message) => renderCard(message))}
              </div>
            )}
          </div>
        )}


        {composer === "booking_proposal" && (
          <BookingProposalComposer
            onSend={(attachment, body) => {
              onSendBookingProposal(attachment, body);
              close();
            }}
            onCancel={close}
          />
        )}

        {composer === "contract" && (
          <ContractComposer
            seed={contractSeed}
            onSend={(contract, body) => {
              onSendContract(contract, body);
              close();
            }}
            onCancel={close}
          />
        )}

        {composer === "deal_terms" && (
          <DealProposalComposer
            senderRole={dealSenderRole}
            currentTerms={currentDealTerms}
            onSend={(attachment, body) => {
              onSendDealProposal(attachment, body);
              close();
            }}
            onCancel={close}
          />
        )}
      </div>

      {hasActions && composer === "none" && (
        <div className="mt-3 space-y-2 border-t border-line pt-3">
          {canProposeTerms && (
            <button
              type="button"
              onClick={() => setComposer("deal_terms")}
              className="w-full rounded-full bg-wine px-4 py-2.5 text-xs font-semibold text-paper transition-colors hover:bg-wine-soft"
            >
              Propose terms
            </button>
          )}
          {canSendBookingProposal && (
            <button
              type="button"
              onClick={() => setComposer("booking_proposal")}
              className="w-full rounded-full border border-line bg-paper px-4 py-2.5 text-xs font-semibold text-ink transition-colors hover:bg-paper-dim"
            >
              Send updated terms or deposit request
            </button>
          )}
          {canSendContract && (
            <button
              type="button"
              onClick={() => setComposer("contract")}
              className="w-full rounded-full bg-wine px-4 py-2.5 text-xs font-semibold text-paper transition-colors hover:bg-wine-soft"
            >
              Send an agreement
            </button>
          )}
        </div>
      )}

      {footer}
    </aside>
  );
}
