"use client";

import { useState, type ReactNode } from "react";
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

  const entries = messages.filter((message) => message.proposal || message.dealProposal || message.contract);
  const hasActions = canSendBookingProposal || canSendContract || canProposeTerms;

  function close() {
    setComposer("none");
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

        {entries.map((message) => {
          const isMine = message.senderId === userId;
          const senderName = nameFor(message.senderId);

          if (message.dealProposal) {
            return (
              <DealProposalCard
                key={message.id}
                proposal={message.dealProposal}
                senderName={senderName}
                isMine={isMine}
                canRespond={!isMine}
                onRespond={(status) => onRespondToDealProposal(message.id, status)}
              />
            );
          }

          if (message.contract) {
            return (
              <ContractCard
                key={message.id}
                contract={message.contract}
                hostName={hostName}
                canSign={isOrganizer && !isMine}
                canWithdraw={isMine}
                onSign={(signature) => onSignContract(message.id, signature)}
                onDecline={(reason) => onDeclineContract(message.id, reason)}
                onWithdraw={() => onWithdrawContract(message.id)}
              />
            );
          }

          return (
            <BookingProposalCard
              key={message.id}
              proposal={message.proposal!}
              canRespond={isOrganizer && !isMine}
              onRespond={(status) => onRespondToBookingProposal(message.id, status)}
            />
          );
        })}

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
