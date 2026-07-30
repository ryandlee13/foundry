import type { AppNotification, NotificationType } from "@/lib/types/vendors";

/** Browser-local in-app notifications, shared between organizer and vendor roles on one account. */
const NOTIFICATIONS_KEY = "foundry.notifications";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function getAll(): AppNotification[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(NOTIFICATIONS_KEY);
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch {
    return [];
  }
}

function saveAll(notifications: AppNotification[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
}

export function getNotificationsFor(recipientId: string): AppNotification[] {
  return getAll()
    .filter((n) => n.recipientId === recipientId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getUnreadCount(recipientId: string): number {
  return getNotificationsFor(recipientId).filter((n) => !n.read).length;
}

export function createNotification(input: {
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
}): AppNotification {
  const notification: AppNotification = {
    id: crypto.randomUUID(),
    read: false,
    createdAt: new Date().toISOString(),
    ...input,
  };
  saveAll([...getAll(), notification]);
  return notification;
}

/**
 * Pure (no storage access): given already-stored notifications, the
 * candidate recipient list, and the type+link being sent, returns only the
 * recipients who don't already have that exact notification — de-duplicates
 * both against prior sends and against repeats within the same candidate list.
 */
export function selectRecipientsNeedingNotification(
  existing: Pick<AppNotification, "recipientId" | "type" | "link">[],
  recipientIds: string[],
  type: NotificationType,
  link: string
): string[] {
  const alreadyNotified = new Set(
    existing.filter((n) => n.type === type && n.link === link).map((n) => n.recipientId)
  );
  const result: string[] = [];
  for (const recipientId of recipientIds) {
    if (alreadyNotified.has(recipientId) || result.includes(recipientId)) continue;
    result.push(recipientId);
  }
  return result;
}

/** Creates one notification per recipient, skipping anyone who already has this exact type+link notification (avoids duplicate notifications on repeated actions). */
export function createNotificationsForMany(
  recipientIds: string[],
  input: { type: NotificationType; title: string; body: string; link: string }
): AppNotification[] {
  const existing = getAll();
  const targetRecipients = selectRecipientsNeedingNotification(existing, recipientIds, input.type, input.link);
  const created: AppNotification[] = [];
  for (const recipientId of targetRecipients) {
    created.push({
      id: crypto.randomUUID(),
      recipientId,
      read: false,
      createdAt: new Date().toISOString(),
      ...input,
    });
  }
  if (created.length > 0) saveAll([...existing, ...created]);
  return created;
}

export function markNotificationRead(id: string): AppNotification | undefined {
  const notifications = getAll();
  const index = notifications.findIndex((n) => n.id === id);
  if (index === -1) return undefined;
  const updated = { ...notifications[index], read: true };
  const next = [...notifications];
  next[index] = updated;
  saveAll(next);
  return updated;
}

export function markAllRead(recipientId: string): void {
  const notifications = getAll();
  const next = notifications.map((n) => (n.recipientId === recipientId ? { ...n, read: true } : n));
  saveAll(next);
}
