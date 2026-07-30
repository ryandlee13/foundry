"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { getNotificationsFor, markNotificationRead, markAllRead } from "@/lib/vendors/notifications";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import type { AppNotification } from "@/lib/types/vendors";

export default function NotificationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const refresh = useCallback(() => {
    if (!user) return;
    setNotifications(getNotificationsFor(user.id));
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  if (authLoading || !loaded) {
    return <LoadingState label="Loading notifications…" />;
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  function handleMarkAllRead() {
    if (!user) return;
    markAllRead(user.id);
    refresh();
  }

  function handleOpen(notification: AppNotification) {
    if (!notification.read) {
      markNotificationRead(notification.id);
      refresh();
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Notifications</h1>
          <p className="mt-1 text-sm text-ink-soft">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <button type="button" onClick={handleMarkAllRead} className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim">
            Mark all read
          </button>
        )}
      </div>

      <div className="mt-8">
        {notifications.length === 0 ? (
          <EmptyState title="No notifications yet" description="Activity on your bids, requests, and messages will show up here." />
        ) : (
          <ul className="divide-y divide-line rounded-2xl border border-line bg-paper">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <Link
                  href={notification.link}
                  onClick={() => handleOpen(notification)}
                  className={`flex items-start gap-3 px-5 py-4 hover:bg-paper-dim ${notification.read ? "" : "bg-brass/5"}`}
                >
                  {!notification.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-wine" />}
                  <div className={notification.read ? "pl-5" : ""}>
                    <p className="text-sm font-semibold text-ink">{notification.title}</p>
                    <p className="mt-0.5 text-sm text-ink-soft">{notification.body}</p>
                    <p className="mt-1 text-xs text-ink-soft">{new Date(notification.createdAt).toLocaleString()}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
