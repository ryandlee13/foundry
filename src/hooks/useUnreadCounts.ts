"use client";

import { useCallback, useEffect, useState } from "react";
import { getThreadsForParticipant, getUnreadMessageCount } from "@/lib/vendors/messages";
import { getUnreadCount } from "@/lib/vendors/notifications";

/** Unread message and notification counts for the dashboard nav badges. */
export function useUnreadCounts(userId: string | undefined) {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const refresh = useCallback(() => {
    if (!userId) return;
    const threads = getThreadsForParticipant(userId);
    setUnreadMessages(threads.reduce((sum, thread) => sum + getUnreadMessageCount(thread.id, userId), 0));
    setUnreadNotifications(getUnreadCount(userId));
  }, [userId]);

  useEffect(() => {
    // localStorage reads are client-only — see AuthProvider.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  return { unreadMessages, unreadNotifications, refresh };
}
