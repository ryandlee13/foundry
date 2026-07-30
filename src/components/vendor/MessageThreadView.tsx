"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { findAccountById } from "@/lib/auth/storage";
import { getThreadById, getMessagesForThread, sendMessage, markThreadRead, isThreadParticipant } from "@/lib/vendors/messages";
import { getEngagementById } from "@/lib/vendors/engagements";
import { getEventNeedById } from "@/lib/vendors/eventNeeds";
import { getVendorProfileById } from "@/lib/vendors/profiles";
import { ENGAGEMENT_STATUS_LABELS } from "@/lib/vendors/labels";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import type { Account } from "@/lib/auth/types";
import type { ChatMessage, EventNeed, MessageThread, VendorEngagement } from "@/lib/types/vendors";

export default function MessageThreadView({ threadId }: { threadId: string }) {
  const { user, isLoading: authLoading } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [thread, setThread] = useState<MessageThread | null>(null);
  const [engagement, setEngagement] = useState<VendorEngagement | null>(null);
  const [need, setNeed] = useState<EventNeed | null>(null);
  const [otherAccount, setOtherAccount] = useState<Account | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    if (!user) return;
    const found = getThreadById(threadId);
    setThread(found ?? null);
    if (found && isThreadParticipant(found, user.id)) {
      const otherId = found.organizerId === user.id ? found.vendorOwnerId : found.organizerId;
      setOtherAccount(findAccountById(otherId) ?? null);
      const eng = getEngagementById(found.engagementId);
      setEngagement(eng ?? null);
      if (eng) setNeed(getEventNeedById(eng.eventNeedId) ?? null);
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

  const vendorProfile = engagement ? getVendorProfileById(engagement.vendorProfileId) : null;

  function handleSend() {
    if (!draft.trim() || !user) return;
    sendMessage({ threadId, senderId: user.id, body: draft });
    setDraft("");
    refresh();
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-12rem)] max-w-2xl flex-col">
      <Link href="/dashboard/messages" className="text-sm font-medium text-ink-soft hover:text-ink">
        ← Back to messages
      </Link>

      <div className="mt-4 rounded-2xl border border-line bg-paper px-5 py-4">
        <p className="font-display text-lg font-semibold text-ink">{otherAccount?.name ?? "Foundry user"}</p>
        {need && engagement && (
          <p className="mt-1 text-sm text-ink-soft">
            {need.title} · ${engagement.agreedAmount} · {ENGAGEMENT_STATUS_LABELS[engagement.status]}
          </p>
        )}
        {vendorProfile && (
          <Link href={`/vendors/${vendorProfile.slug}`} className="mt-1 inline-block text-xs font-medium text-brass-dark hover:underline">
            View vendor profile
          </Link>
        )}
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
    </div>
  );
}
