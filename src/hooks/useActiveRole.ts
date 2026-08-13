"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getStoredActiveRole, resolveActiveRole, setStoredActiveRole } from "@/lib/auth/activeRole";
import type { AppRole } from "@/lib/types/roles";

/**
 * The role the dashboard is currently being viewed as. Starts null on the
 * server and on first paint (localStorage is client-only — see
 * AuthProvider.tsx for the same hydration reasoning), then resolves after
 * mount against the roles the account actually holds.
 */
export function useActiveRole() {
  const { user, addRole } = useAuth();
  const [activeRole, setActiveRoleState] = useState<AppRole | null>(null);
  const [resolved, setResolved] = useState(false);

  const roleKey = user?.roles.join(",") ?? "";

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveRoleState(null);
      setResolved(true);
      return;
    }
    setActiveRoleState(resolveActiveRole(user.roles, getStoredActiveRole()));
    setResolved(true);
    // Recompute when the account's role set changes, not on every user identity tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, roleKey]);

  const switchRole = useCallback((role: AppRole) => {
    setStoredActiveRole(role);
    setActiveRoleState(role);
  }, []);

  /** Grants the role on the account and immediately switches the view to it. */
  const addAndSwitchRole = useCallback(
    (role: AppRole) => {
      addRole(role);
      setStoredActiveRole(role);
      setActiveRoleState(role);
    },
    [addRole]
  );

  return { activeRole, resolved, switchRole, addAndSwitchRole };
}
