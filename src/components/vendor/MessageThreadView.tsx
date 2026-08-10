"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { findAccountById } from "@/lib/auth/storage";
import { getThreadById, getMessagesForThread, sendMessage, markThreadRead, isThreadParticipant } from "@/lib/vendors/messages";
import { getEngagementById, acceptProposal } from "@/lib/vendors/engagements";
import { getEventNeedById } from "@/lib/vendors/eventNeeds";
import { getProposalById } from "@/lib/vendors/proposals";
import { getEffectiveProposalStatus } from "@/lib/vendors/expiration";
import { getVendorProfileById } from "@/lib/vendors/profiles";
import { getBookingById, formatEventLabel } from "@/lib/spaces/bookings";
import { getSkillName } from "@/lib/vendors/skills";
import { ENGAGEMENT_STATUS_LABELS, PROPOSAL_STATUS_LABELS } from "@/lib/vendors/labels";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import Dialog from "@/components/ui/Dialog";
import type { Account } from "@/lib/auth/types";
import type { ChatMessage, EventNeed, MessageThread, VendorEngagement, VendorProposal } from "@/lib/types/vendors";

export default function MessageThreadView({ threadId }: { threadId: string }) {
  const { user, isLoading: authLoading } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [thread, setThread] = useState<MessageThread | null>(null);
  const [proposal, setProposal] = useState<VendorProposal | null>(null);
  const [engagement, setEngagement] = useState<VendorEngagement | null>(null);
  const [need, setNeed] = useState<EventNeed | null>(null);
  const [eventLabel, setEventLabel] = useState("");
  const [otherAccount, setOtherAccount] = useState<Account | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [confirmingFinalize, setConfirmingFinalize] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    if (!user) return;
    const found = getThreadById(threadId);
    setThread(found ?? null);
    if (found && isThreadParticipant(found, user.id)) {
      const otherId = found.organizerId === user.id ? found.vendorOwnerId : found.organizerId;
      setOtherAccount(findAccountById(otherId) ?? null);
      setProposal(getProposalById(found.proposalId) ?? null);
      const foundNeed = getEventNeedById(found.eventNeedId);
      setNeed(foundNeed ?? null);
      if (foundNeed) {
        const booking = getBookingById(foundNeed.bookingId);
        setEventLabel(booking ? formatEventLabel(booking) : foundNeed.publicLocation);
      }
      setEngagement(found.engagementId ? (getEngagementById(found.engagementId) ?? null) : null);
      markThreadRead(found.id, user.id);
      setMessages(getMessagesForThread(found.id));
    }
    setLoaded(true);
  }, [threadId, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  if (authLoading || !loaded) {
    return <LoadingState label="Loading conversation…" />;
  }

  if (!user || !thread || !isThreadParticipant(thread, user.id)) {
    return <ErrorState title="Conversation not found" description="This conversation doesn't exist, or you're not a participant." />;
  }

  const vendorProfile = proposal ? getVendorProfileById(proposal.vendorProfileId) : null;
  const isOrganizer = user.id === thread.organizerId;
  const effectiveProposalStatus = proposal ? getEffectiveProposalStatus(proposal) : null;
  const canFinalize =
    isOrganizer &&
    !engagement &&
    (effectiveProposalStatus === "submitted" || effectiveProposalStatus === "shortlisted" || effectiveProposalStatus === "in_discussion");

  function handleSend() {
    if (!draft.trim() || !user) return;
    sendMessage({ threadId, senderId: user.id, body: draft });
    setDraft("");
    refresh();
  }

  function handleFinalize() {
    if (!proposal) return;
    try {
      acceptProposal(proposal.id);
      setConfirmingFinalize(false);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't finalize this deal.");
      setConfirmingFinalize(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-12rem)] max-w-2xl flex-col">
      <Link href="/dashboard/messages" className="text-sm font-medium text-ink-soft hover:text-ink">
        ← Back to messages
      </Link>

      <div className="mt-4 rounded-2xl border border-line bg-paper px-5 py-4">
        {need && <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{eventLabel}</p>}
        <p className="font-display text-lg font-semibold text-ink">
          {need ? `${getSkillName(need.skillSlug)} — ` : ""}
          {otherAccount?.name ?? "Foundry user"}
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          {engagement
            ? `$${engagement.agreedAmount} · ${ENGAGEMENT_STATUS_LABELS[engagement.status]}`
            : proposal && effectiveProposalStatus
              ? `$${proposal.proposedAmount} · ${PROPOSAL_STATUS_LABELS[effectiveProposalStatus]}`
              : ""}
        </p>
        {error && <p className="mt-2 text-xs text-wine">{error}</p>}
        <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
          {need && (
            <Link href={`/dashboard/organizer/bookings/${need.bookingId}/vendors/${need.id}/proposals`} className="text-brass-dark hover:underline">
              View proposal
            </Link>
          )}
          {vendorProfile && (
            <Link href={`/vendors/${vendorProfile.slug}`} className="text-brass-dark hover:underline">
              View vendor
            </Link>
          )}
          {canFinalize && (
            <button type="button" onClick={() => setConfirmingFinalize(true)} className="text-wine hover:underline">
              Finalize Deal
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-line bg-paper p-5">
        {messages.length === 0 ? (
          <p className="text-sm text-ink-soft">No messages yet — say hello.</p>
        ) : (
          messages.map((message) => {
            const isMine = message.senderId === user.id;
            return (
              <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm ${isMine ? "bg-wine text-paper" : "bg-paper-dim text-ink"}`}>
                  <p>{message.body}</p>
                  <p className={`mt-1 text-[10px] ${isMine ? "text-paper/70" : "text-ink-soft"}`}>
                    {new Date(message.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="Write a message…"
          className="flex-1 rounded-full border border-line bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!draft.trim()}
          className="rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </div>

      <Dialog
        open={confirmingFinalize}
        onClose={() => setConfirmingFinalize(false)}
        labelledBy="finalize-deal-title"
        panelClassName="w-full max-w-md p-6"
      >
        <h2 id="finalize-deal-title" className="font-display text-xl font-semibold text-ink">
          Finalize this vendor?
        </h2>
        {proposal && (
          <p className="mt-3 text-sm text-ink-soft">
            This confirms a ${proposal.proposedAmount} engagement and its deliverables, notifies {otherAccount?.name ?? "the vendor"}, and
            keeps this conversation going. Any other active proposals on this request are closed once every position is filled.
          </p>
        )}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => setConfirmingFinalize(false)}
            className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleFinalize}
            className="flex-1 rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
          >
            Finalize Deal
          </button>
        </div>
      </Dialog>
    </div>
  );
}
