import type { ChatMessage, MessageThread } from "@/lib/types/vendors";
import { createNotification } from "./notifications";

/**
 * Browser-local message threads. A thread is only ever created by
 * `getOrCreateThreadForEngagement` below, which is called exclusively from
 * the accept-proposal flow (see engagements.ts) — so a thread cannot exist,
 * and therefore cannot be opened, until a proposal has been accepted.
 */
const THREADS_KEY = "foundry.messages.threads";
const MESSAGES_KEY = "foundry.messages.messages";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function getThreadsRaw(): MessageThread[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(THREADS_KEY);
    return raw ? (JSON.parse(raw) as MessageThread[]) : [];
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

export function getThreadForEngagement(engagementId: string): MessageThread | undefined {
  return getThreadsRaw().find((thread) => thread.engagementId === engagementId);
}

export function getThreadsForParticipant(accountId: string): MessageThread[] {
  return getThreadsRaw().filter((thread) => thread.organizerId === accountId || thread.vendorOwnerId === accountId);
}

/** Only ever called after a proposal is accepted — see acceptProposal() in engagements.ts. */
export function getOrCreateThreadForEngagement(input: {
  engagementId: string;
  organizerId: string;
  vendorOwnerId: string;
}): MessageThread {
  const existing = getThreadForEngagement(input.engagementId);
  if (existing) return existing;

  const thread: MessageThread = {
    id: crypto.randomUUID(),
    engagementId: input.engagementId,
    organizerId: input.organizerId,
    vendorOwnerId: input.vendorOwnerId,
    createdAt: new Date().toISOString(),
  };
  saveThreads([...getThreadsRaw(), thread]);
  return thread;
}

export function isThreadParticipant(thread: MessageThread, accountId: string): boolean {
  return thread.organizerId === accountId || thread.vendorOwnerId === accountId;
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
    const recipientId = thread.organizerId === input.senderId ? thread.vendorOwnerId : thread.organizerId;
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
