"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { findAccountById } from "@/lib/auth/storage";
import { getThreadsForParticipant, getMessagesForThread, getUnreadMessageCount } from "@/lib/vendors/messages";
import { getEngagementById } from "@/lib/vendors/engagements";
import { getEventNeedById } from "@/lib/vendors/eventNeeds";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import type { MessageThread } from "@/lib/types/vendors";

interface ThreadSummary {
  thread: MessageThread;
  otherName: string;
  contextLabel: string;
  lastMessage: string;
  lastMessageAt: string | null;
  unread: number;
}

export default function MessagesInboxPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [summaries, setSummaries] = useState<ThreadSummary[]>([]);

  const refresh = useCallback(() => {
    if (!user) return;
    const threads = getThreadsForParticipant(user.id);
    const list: ThreadSummary[] = threads.map((thread) => {
      const otherId = thread.organizerId === user.id ? thread.vendorOwnerId : thread.organizerId;
      const otherAccount = findAccountById(otherId);
      const engagement = getEngagementById(thread.engagementId);
      const need = engagement ? getEventNeedById(engagement.eventNeedId) : undefined;
      const messages = getMessagesForThread(thread.id);
      const last = messages[messages.length - 1];
      return {
        thread,
        otherName: otherAccount?.name.split(" ")[0] ?? "Foundry user",
        contextLabel: need?.title ?? "Engagement",
        lastMessage: last?.body ?? "No messages yet",
        lastMessageAt: last?.createdAt ?? null,
        unread: getUnreadMessageCount(thread.id, user.id),
      };
    });
    list.sort((a, b) => new Date(b.lastMessageAt ?? b.thread.createdAt).getTime() - new Date(a.lastMessageAt ?? a.thread.createdAt).getTime());
    setSummaries(list);
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  if (authLoading || !loaded) {
    return <LoadingState label="Loading messages…" />;
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Messages</h1>
      <p className="mt-1 text-sm text-ink-soft">Conversations unlock once a proposal is accepted.</p>

      <div className="mt-8">
        {summaries.length === 0 ? (
          <EmptyState title="No conversations yet" description="Accept or get accepted on a proposal to start messaging." />
        ) : (
          <ul className="divide-y divide-line rounded-2xl border border-line bg-paper">
            {summaries.map(({ thread, otherName, contextLabel, lastMessage, unread }) => (
              <li key={thread.id}>
                <Link href={`/dashboard/messages/${thread.id}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-paper-dim">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">
                      {otherName} <span className="font-normal text-ink-soft">· {contextLabel}</span>
                    </p>
                    <p className="mt-0.5 truncate text-sm text-ink-soft">{lastMessage}</p>
                  </div>
                  {unread > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-wine px-1.5 text-[11px] font-bold text-paper">
                      {unread}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
