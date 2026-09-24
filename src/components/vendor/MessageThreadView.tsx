"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { findAccountById } from "@/lib/auth/storage";
import {
  getThreadById,
  getMessagesForThread,
  sendMessage,
  respondToBookingProposal,
  respondToDealProposal,
  signContract,
  declineContract,
  withdrawContract,
  markThreadRead,
  isThreadParticipant,
  isProposalThread,
  isBookingThread,
  isEventThread,
  getThreadParticipantIds,
} from "@/lib/vendors/messages";
import { getEngagementById, finalizeDeal } from "@/lib/vendors/engagements";
import { getEventNeedById } from "@/lib/vendors/eventNeeds";
import { getProposalById } from "@/lib/vendors/proposals";
import { getEffectiveProposalStatus } from "@/lib/vendors/expiration";
import { getVendorProfileById } from "@/lib/vendors/profiles";
import { resolveEffectiveDealTerms, formatDealAmount } from "@/lib/vendors/dealProposals";
import {
  getBookingById,
  getBookingsForOrganizer,
  getBookingVenueOwnerId,
  formatEventDate,
  formatEventLabel,
} from "@/lib/spaces/bookings";
import {
  getConversationStarters,
  type StarterRole,
  type StarterThreadKind,
} from "@/lib/vendors/conversationStarters";
import { formatTimeRange } from "@/lib/spaces/bookingConstraints";
import { resolveContractState } from "@/lib/spaces/bookingContracts";
import {
  resolveEffectiveBookingTerms,
  type EffectiveBookingTerms,
} from "@/lib/spaces/bookingProposals";
import {
  VENUE_PRIVACY_NOTICE,
  VENUE_PRIVACY_NOTICE_OWNER,
  hasDisclosedDetails,
  resolveVenueDisclosure,
  type VenueDisclosure,
} from "@/lib/spaces/venueIdentity";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { syncEventRoomParticipants } from "@/lib/spaces/eventRoom";
import { getVenueById } from "@/lib/spaces/submittedVenues";
import DealLogPanel from "@/components/dashboard/DealLogPanel";
import type {
  BookingContractAttachment,
  BookingProposalAttachment,
  DealProposalAttachment,
} from "@/lib/types/vendors";
import { getSkillName } from "@/lib/vendors/skills";
import { ENGAGEMENT_STATUS_LABELS, PROPOSAL_STATUS_LABELS } from "@/lib/vendors/labels";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import FinalizeDealDialog, { type FinalizeDealTerms } from "./FinalizeDealDialog";
import Dialog from "@/components/ui/Dialog";
import { organizerVendorsPath } from "@/lib/vendors/organizerRoutes";
import AgreedTermsCard from "./AgreedTermsCard";
import { organizerProposalsPath } from "@/lib/vendors/organizerRoutes";
import type { Account } from "@/lib/auth/types";
import type { Booking, Venue } from "@/lib/types/spaces";
import type {
  ChatMessage,
  EventNeed,
  MessageThread,
  ProposalStatus,
  VendorEngagement,
  VendorProfile,
  VendorProposal,
} from "@/lib/types/vendors";

function ProposalThreadHeader({
  need,
  engagement,
  proposal,
  effectiveProposalStatus,
  eventLabel,
  otherAccount,
  vendorProfile,
  canFinalize,
  onFinalizeClick,
}: {
  need: EventNeed | null;
  engagement: VendorEngagement | null;
  proposal: VendorProposal | null;
  effectiveProposalStatus: ProposalStatus | null;
  eventLabel: string;
  otherAccount: Account | null;
  vendorProfile: VendorProfile | null;
  canFinalize: boolean;
  onFinalizeClick: () => void;
}) {
  return (
    <>
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
      <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
        {need && (
          <Link
            href={organizerProposalsPath(need.bookingId, need.id)}
            className="text-brass-dark hover:underline"
          >
            View proposal
          </Link>
        )}
        {vendorProfile && (
          <Link href={`/vendors/${vendorProfile.slug}`} className="text-brass-dark hover:underline">
            View vendor
          </Link>
        )}
        {canFinalize && (
          <button type="button" onClick={onFinalizeClick} className="text-wine hover:underline">
            Finalize Deal
          </button>
        )}
      </div>
    </>
  );
}

/**
 * The address/real-name reveal.
 *
 * A planner who has to email the host for the street address has already left
 * Foundry, so the moment their booking is confirmed the details land in the
 * thread they're already reading.
 *
 * Renders for the planner who earned it and nobody else. The owner is
 * deliberately excluded even though resolveVenueDisclosure() returns their own
 * address to them — printing a venue operator's own street address back at them
 * is noise; the "i" beside the venue name carries the rule for them instead.
 * Everything here comes from resolveVenueDisclosure() — never read
 * `realName`/`exactAddress` off a Venue in a component (docs/SECURITY.md #5).
 */
function VenueDetailsReveal({ disclosure, venue }: { disclosure: VenueDisclosure; venue: Venue | null }) {
  if (!venue || disclosure.reason !== "confirmed_booking") return null;
  if (!hasDisclosedDetails(disclosure)) return null;

  return (
    <div className="mt-3 rounded-xl border border-brass/40 bg-brass/5 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-brass-dark">Venue details unlocked</p>
      {disclosure.realName && <p className="mt-1 font-display text-base font-semibold text-ink">{disclosure.realName}</p>}
      {disclosure.exactAddress && <p className="mt-0.5 text-sm text-ink">{disclosure.exactAddress}</p>}
      <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft">
        Shared with you because this booking is confirmed. Please keep it to your team.
      </p>
    </div>
  );
}

function BookingThreadHeader({
  booking,
  otherAccount,
  terms,
  rateLabel,
  contractLabel,
  privacyNotice,
}: {
  booking: Booking;
  otherAccount: Account | null;
  terms: EffectiveBookingTerms;
  rateLabel: string | null;
  contractLabel: string | null;
  /** Null once the address is actually on screen — see VenueDetailsReveal. */
  privacyNotice: string | null;
}) {
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{formatEventLabel(booking)}</p>
      <p className="flex flex-wrap items-center gap-2 font-display text-lg font-semibold text-ink">
        <span>
          {booking.venueName} — {otherAccount?.name ?? "Foundry user"}
        </span>
        {privacyNotice && (
          <InfoTooltip label="Why the venue's name and address aren't shown">{privacyNotice}</InfoTooltip>
        )}
      </p>
      {/*
        Reflects the terms currently in force, not the original request: once
        the planner accepts revised terms, the time and rate here change with
        them (see resolveEffectiveBookingTerms).
      */}
      <p className="mt-1 text-sm text-ink-soft">
        {formatEventDate(booking.eventDate)} · {formatTimeRange(terms.startTime, terms.endTime)} ·{" "}
        {booking.attendees} guests
        {rateLabel && <> · {rateLabel}</>}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {terms.updatedFromProposal && (
          <span className="inline-flex flex-wrap items-center gap-1.5 rounded-full bg-brass/15 px-2.5 py-1 text-xs font-medium text-brass-dark">
            <span className="font-semibold">Updated terms accepted</span>
            {terms.estimatedTotal !== null && <span>· est. ${terms.estimatedTotal.toLocaleString()} total</span>}
          </span>
        )}
        {contractLabel && (
          <span className="inline-flex items-center rounded-full bg-brass/15 px-2.5 py-1 text-xs font-medium text-brass-dark">
            {contractLabel}
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
        <Link href={`/spaces/${booking.venueSlug}?from=dashboard`} className="text-brass-dark hover:underline">
          View venue
        </Link>
        <Link href="/dashboard/organizer" className="text-brass-dark hover:underline">
          View bookings
        </Link>
      </div>
    </>
  );
}

/** The three-way room: who's in it, and what it's for. */
function EventThreadHeader({
  booking,
  memberNames,
  contractLabel,
}: {
  booking: Booking | null;
  memberNames: string[];
  contractLabel: string | null;
}) {
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {booking ? formatEventLabel(booking) : "Event room"}
      </p>
      <p className="font-display text-lg font-semibold text-ink">Event room</p>
      {booking && (
        <p className="mt-1 text-sm text-ink-soft">
          {formatEventDate(booking.eventDate)} · {formatTimeRange(booking.startTime, booking.endTime)} ·{" "}
          {booking.attendees} guests
        </p>
      )}
      <p className="mt-1.5 text-sm text-ink-soft">
        <span className="font-medium text-ink">In this room:</span> {memberNames.join(", ")}
      </p>
      {contractLabel && (
        <span className="mt-1.5 inline-flex items-center rounded-full bg-brass/15 px-2.5 py-1 text-xs font-medium text-brass-dark">
          {contractLabel}
        </span>
      )}
      <p className="mt-2 text-xs leading-relaxed text-ink-soft">
        Everyone working this event is here — sort load-in, power, and timing once instead of relaying it.
      </p>
    </>
  );
}

export default function MessageThreadView({ threadId }: { threadId: string }) {
  const { user, isLoading: authLoading } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [thread, setThread] = useState<MessageThread | null>(null);
  const [otherAccount, setOtherAccount] = useState<Account | null>(null);
  const [participantNames, setParticipantNames] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Proposal-thread-only state
  const [proposal, setProposal] = useState<VendorProposal | null>(null);
  const [engagement, setEngagement] = useState<VendorEngagement | null>(null);
  const [need, setNeed] = useState<EventNeed | null>(null);
  const [eventLabel, setEventLabel] = useState("");
  // Booking/event-thread-only state
  const [booking, setBooking] = useState<Booking | null>(null);
  const [bookingVenue, setBookingVenue] = useState<Venue | null>(null);
  const [disclosure, setDisclosure] = useState<VenueDisclosure | null>(null);

  const [draft, setDraft] = useState("");
  const [confirmingFinalize, setConfirmingFinalize] = useState(false);
  /** Shown once, right after the planner accepts the venue's terms. */
  const [celebrateTerms, setCelebrateTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    if (!user) return;

    /*
     * Sync before reading, so a vendor who confirmed since the room was opened
     * is already in the participant list everything below is built from. A
     * vendor confirming can't push themselves in — that would let a supplier
     * join a conversation the organizer never invited them to — so the catch-up
     * happens here and in openEventRoom(). Idempotent: nobody new means no
     * write and no notification.
     */
    const initial = getThreadById(threadId);
    if (initial && isEventThread(initial) && isThreadParticipant(initial, user.id)) {
      syncEventRoomParticipants(initial.bookingId);
    }

    const found = getThreadById(threadId);
    setThread(found ?? null);
    if (found && isThreadParticipant(found, user.id)) {
      setParticipantNames(
        Object.fromEntries(
          getThreadParticipantIds(found).map((id) => [id, findAccountById(id)?.name ?? "Foundry user"])
        )
      );
      markThreadRead(found.id, user.id);
      setMessages(getMessagesForThread(found.id));

      if (isProposalThread(found)) {
        setOtherAccount(
          findAccountById(found.organizerId === user.id ? found.counterpartyId : found.organizerId) ?? null
        );
        setBooking(null);
        setBookingVenue(null);
        setDisclosure(null);
        setProposal(getProposalById(found.proposalId) ?? null);
        const foundNeed = getEventNeedById(found.eventNeedId);
        setNeed(foundNeed ?? null);
        if (foundNeed) {
          const relatedBooking = getBookingById(foundNeed.bookingId);
          setEventLabel(relatedBooking ? formatEventLabel(relatedBooking) : foundNeed.publicLocation);
        }
        setEngagement(found.engagementId ? (getEngagementById(found.engagementId) ?? null) : null);
      } else {
        setProposal(null);
        setNeed(null);
        setEngagement(null);
        setEventLabel("");
        setOtherAccount(
          isEventThread(found)
            ? null
            : (findAccountById(found.organizerId === user.id ? found.counterpartyId : found.organizerId) ?? null)
        );

        const relatedBooking = getBookingById(found.bookingId) ?? null;
        const venue = getVenueById(found.venueId) ?? null;
        setBooking(relatedBooking);
        setBookingVenue(venue);
        setDisclosure(
          venue
            ? resolveVenueDisclosure({
                venue,
                viewerId: user.id,
                viewerBookings: getBookingsForOrganizer(user.id),
              })
            : null
        );
      }
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

  const vendorProfile = proposal ? (getVendorProfileById(proposal.vendorProfileId) ?? null) : null;
  const isOrganizer = user.id === thread.organizerId;
  const nameFor = (accountId: string) => participantNames[accountId] ?? "Foundry user";

  /*
   * Booking has no price column (see CLAUDE.md), so the starting rate comes
   * from the listing. A venue publishing a *range* has no single number to
   * show, so base rate stays null and the header falls back to the range —
   * an accepted proposal is what pins it to one figure.
   */
  const listedRateIsFixed =
    bookingVenue !== null && bookingVenue.minHourlyRate === bookingVenue.maxHourlyRate;
  const effectiveTerms = resolveEffectiveBookingTerms(
    {
      startTime: booking?.startTime ?? "",
      endTime: booking?.endTime ?? "",
      hourlyRate: listedRateIsFixed ? bookingVenue.minHourlyRate : null,
    },
    messages.map((message) => message.proposal).filter((p): p is BookingProposalAttachment => Boolean(p))
  );
  const rateLabel =
    effectiveTerms.hourlyRate !== null
      ? `$${effectiveTerms.hourlyRate}/hr`
      : bookingVenue
        ? `$${bookingVenue.minHourlyRate}–$${bookingVenue.maxHourlyRate}/hr`
        : null;

  const contractState = resolveContractState(
    messages.map((message) => message.contract).filter((c): c is BookingContractAttachment => Boolean(c))
  );
  const contractLabel = contractState.signed
    ? "Agreement signed"
    : contractState.awaitingSignature
      ? "Agreement awaiting signature"
      : null;

  const dealRounds = messages
    .map((message) => message.dealProposal)
    .filter((d): d is DealProposalAttachment => Boolean(d));
  const currentDealTerms = resolveEffectiveDealTerms(
    {
      amount: proposal?.proposedAmount ?? 0,
      pricingModel: proposal?.pricingModel ?? "flat_fee",
      deliverables: proposal?.deliverables ?? "",
    },
    dealRounds
  );

  const effectiveProposalStatus = proposal ? getEffectiveProposalStatus(proposal) : null;
  const proposalIsOpen =
    effectiveProposalStatus === "submitted" ||
    effectiveProposalStatus === "shortlisted" ||
    effectiveProposalStatus === "in_discussion";
  // Explicitly gated on isProposalThread — a booking or event thread can never finalize a vendor deal.
  const canFinalize = isProposalThread(thread) && isOrganizer && !engagement && proposalIsOpen;
  /*
   * Both sides may propose, which is the whole point of the log. It closes once
   * terms are locked and awaiting the vendor's confirmation — reopening only if
   * they decline, which is exactly when renegotiating is the right move.
   */
  const canProposeTerms =
    isProposalThread(thread) &&
    proposalIsOpen &&
    (!engagement || engagement.status === "declined_by_vendor");

  const isBookingHost = thread.kind === "booking" && thread.counterpartyId === user.id;

  /*
   * Explains the withheld name/address as an "i" beside the venue name, for
   * everyone who isn't looking at the details themselves — including the owner,
   * whose own address is nothing to tell them.
   */
  const venuePrivacyNotice =
    disclosure === null || disclosure.reason === "confirmed_booking"
      ? null
      : disclosure.reason === "owner"
        ? VENUE_PRIVACY_NOTICE_OWNER
        : VENUE_PRIVACY_NOTICE;

  /**
   * Opening lines for an empty thread, chosen by which seat the viewer is in
   * *for this thread* — a venue operator is the host of a booking thread and
   * just another participant in an event room, so it can't be read off their
   * app-wide role.
   */
  function resolveStarters(): string[] {
    if (!user || !thread || messages.length > 0) return [];

    const kind: StarterThreadKind = isEventThread(thread)
      ? "event"
      : isBookingThread(thread)
        ? "booking"
        : "proposal";

    const role: StarterRole =
      thread.organizerId === user.id
        ? "organizer"
        : kind === "booking"
          ? "venue_owner"
          : kind === "proposal"
            ? "vendor"
            : booking && getBookingVenueOwnerId(booking) === user.id
              ? "venue_owner"
              : "vendor";

    return getConversationStarters(kind, role);
  }

  const starters = resolveStarters();

  function handleSend() {
    if (!draft.trim() || !user) return;
    sendMessage({ threadId, senderId: user.id, body: draft });
    setDraft("");
    refresh();
  }

  function sendAttachment(
    body: string,
    attachment: Partial<Pick<Parameters<typeof sendMessage>[0], "proposal" | "dealProposal" | "contract">>
  ) {
    if (!user) return;
    sendMessage({ threadId, senderId: user.id, body, ...attachment });
    refresh();
  }

  function handleFinalize(terms?: FinalizeDealTerms) {
    if (!proposal) return;
    try {
      finalizeDeal({ proposalId: proposal.id, terms });
      setConfirmingFinalize(false);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't finalize this deal.");
      setConfirmingFinalize(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-11rem)] flex-col">
      <Link href="/dashboard/messages" className="text-sm font-medium text-ink-soft hover:text-ink">
        ← Back to messages
      </Link>

      {/* Talk on the left, offers on the right — see DealLogPanel for why. */}
      <div className="mt-4 grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_380px]">
        <div className="flex min-h-0 flex-col">
          <div className="rounded-2xl border border-line bg-paper px-5 py-4">
            {isProposalThread(thread) ? (
              <ProposalThreadHeader
                need={need}
                engagement={engagement}
                proposal={proposal}
                effectiveProposalStatus={effectiveProposalStatus}
                eventLabel={eventLabel}
                otherAccount={otherAccount}
                vendorProfile={vendorProfile}
                canFinalize={canFinalize}
                onFinalizeClick={() => setConfirmingFinalize(true)}
              />
            ) : isEventThread(thread) ? (
              <EventThreadHeader
                booking={booking}
                memberNames={getThreadParticipantIds(thread).map(nameFor)}
                contractLabel={contractLabel}
              />
            ) : booking ? (
              <BookingThreadHeader
                booking={booking}
                otherAccount={otherAccount}
                terms={effectiveTerms}
                rateLabel={rateLabel}
                contractLabel={contractLabel}
                privacyNotice={venuePrivacyNotice}
              />
            ) : (
              <p className="font-display text-lg font-semibold text-ink">{otherAccount?.name ?? "Foundry user"}</p>
            )}
            {disclosure && <VenueDetailsReveal disclosure={disclosure} venue={bookingVenue} />}
            {error && <p className="mt-2 text-xs text-wine">{error}</p>}
          </div>

          {isProposalThread(thread) && engagement?.status === "pending_vendor_confirmation" && (
            <div className="mt-3">
              <AgreedTermsCard engagement={engagement} counterpartyName={otherAccount?.name ?? "the vendor"} />
            </div>
          )}

          <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-line bg-paper p-5">
            {messages.length === 0 ? (
              /*
                An empty thread with a blank composer is where people stall —
                nobody's sure whether they're meant to speak first, so neither
                does, and the coordination moves to email. These fill the
                composer rather than sending, so the first thing anyone says is
                still something they chose to say.
              */
              <div>
                <p className="text-sm text-ink-soft">No messages yet — say hello.</p>
                {starters.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                      Not sure how to start?
                    </p>
                    <div className="mt-2 flex flex-col items-start gap-2">
                      {starters.map((starter) => (
                        <button
                          key={starter}
                          type="button"
                          onClick={() => {
                            setDraft(starter);
                            composerRef.current?.focus();
                          }}
                          className="rounded-2xl border border-line bg-paper-dim px-3.5 py-2 text-left text-sm text-ink transition-colors hover:border-brass hover:bg-paper"
                        >
                          {starter}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              messages.map((message) => {
                const isMine = message.senderId === user.id;
                const hasAttachment = Boolean(message.proposal || message.dealProposal || message.contract);
                return (
                  <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm ${
                        isMine ? "bg-wine text-paper" : "bg-paper-dim text-ink"
                      }`}
                    >
                      {/*
                        Event rooms have several people in them, so an unnamed
                        bubble is ambiguous in a way a 1:1 thread never is.
                      */}
                      {isEventThread(thread) && !isMine && (
                        <p className="mb-0.5 text-[11px] font-semibold text-ink-soft">{nameFor(message.senderId)}</p>
                      )}
                      <p>{message.body}</p>
                      {hasAttachment && (
                        // A pointer, not a copy — the full card lives in the log
                        // so numbers exist in exactly one place on screen.
                        <p className={`mt-1 text-[11px] font-semibold ${isMine ? "text-paper/80" : "text-brass-dark"}`}>
                          → See &quot;Offers &amp; agreements&quot;
                        </p>
                      )}
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

          <div className="mt-3 flex gap-2">
            <input
              ref={composerRef}
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
        </div>

        <DealLogPanel
          messages={messages}
          userId={user.id}
          nameFor={nameFor}
          hostName={otherAccount?.name ?? "the host"}
          /*
           * Booking threads only, and only for the venue owner (the
           * counterparty there). A planner can't send themselves a deposit
           * request or an agreement, and neither belongs on a vendor-proposal
           * thread, which has its own terms flow.
           */
          canSendBookingProposal={isBookingHost}
          canSendContract={isBookingHost}
          contractSeed={{
            title: booking ? `${booking.venueName} — venue rental agreement` : "Venue rental agreement",
            scope: "",
            totalAmount: effectiveTerms.estimatedTotal,
            depositAmount: null,
          }}
          canProposeTerms={canProposeTerms}
          dealSenderRole={isOrganizer ? "organizer" : "vendor"}
          currentDealTerms={currentDealTerms}
          isOrganizer={isOrganizer}
          onSendBookingProposal={(attachment, body) => sendAttachment(body, { proposal: attachment })}
          onRespondToBookingProposal={(messageId, status) => {
            respondToBookingProposal(messageId, user.id, status);
            /*
              Agreeing the venue's terms is the point the event stops being a
              maybe — and the moment a planner's next job (vendors) is most
              obvious to them and easiest to start. Only `revised_terms`:
              agreeing to a deposit request isn't settling the booking.
            */
            const accepted = messages.find((message) => message.id === messageId);
            if (status === "accepted" && accepted?.proposal?.kind === "revised_terms") {
              setCelebrateTerms(true);
            }
            refresh();
          }}
          onSendContract={(contract, body) => sendAttachment(body, { contract })}
          onSignContract={(messageId, signature) => {
            signContract(messageId, user.id, signature);
            refresh();
          }}
          onDeclineContract={(messageId, reason) => {
            declineContract(messageId, user.id, reason);
            refresh();
          }}
          onWithdrawContract={(messageId) => {
            withdrawContract(messageId, user.id);
            refresh();
          }}
          onSendDealProposal={(attachment, body) => sendAttachment(body, { dealProposal: attachment })}
          onRespondToDealProposal={(messageId, status) => {
            respondToDealProposal(messageId, user.id, status);
            refresh();
          }}
          footer={
            currentDealTerms.negotiated && isProposalThread(thread) ? (
              <p className="mt-3 rounded-lg bg-brass/10 px-3 py-2 text-[11px] leading-relaxed text-brass-dark">
                Agreed so far: {formatDealAmount(currentDealTerms.amount, currentDealTerms.pricingModel)}.
                {isOrganizer
                  ? " Finalize the deal to send these for the vendor's confirmation."
                  : " The organizer still has to finalize before this is booked."}
              </p>
            ) : null
          }
        />
      </div>

      <FinalizeDealDialog
        open={confirmingFinalize}
        proposal={proposal}
        currentTerms={{
          amount: currentDealTerms.amount,
          pricingModel: currentDealTerms.pricingModel,
          deliverables: currentDealTerms.deliverables,
        }}
        negotiated={currentDealTerms.negotiated}
        counterpartyName={otherAccount?.name ?? "this vendor"}
        onClose={() => setConfirmingFinalize(false)}
        onFinalize={handleFinalize}
      />

      <Dialog
        open={celebrateTerms}
        onClose={() => setCelebrateTerms(false)}
        labelledBy="terms-accepted-title"
        panelClassName="w-full max-w-md p-7 text-center"
      >
        <h2
          id="terms-accepted-title"
          className="font-display text-2xl font-semibold leading-snug text-green-700 sm:text-3xl"
        >
          Congratulations — your venue is settled!
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          You and {booking?.venueName ?? "the venue"} have agreed on terms. Want to line up the vendors for
          this event while you&apos;re here?
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {/*
            Straight to posting a request, not the vendor directory. A planner
            who just settled a venue knows what they need, not who they want —
            a post gets them proposals, browsing gets them a list to read.
          */}
          <Link
            href={booking ? `${organizerVendorsPath(booking.id)}?post=1` : "/dashboard/organizer/vendors"}
            className="flex-1 rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
          >
            Find a vendor
          </Link>
          <button
            type="button"
            onClick={() => setCelebrateTerms(false)}
            className="flex-1 rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
          >
            No thanks
          </button>
        </div>
      </Dialog>
    </div>
  );
}
