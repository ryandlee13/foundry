import type { AppRole } from "@/lib/types/roles";

/**
 * Which of an account's roles the dashboard is currently being viewed as.
 * One account can hold organizer + venue_operator + vendor at once, but the
 * dashboard only ever shows one at a time — the sidebar, KPIs, and "Event
 * Details" page all key off this.
 *
 * Same browser-local, no-security-boundary caveat as the rest of
 * src/lib/auth/ — this is a view preference, never an authorization decision.
 * Every real gate still checks `user.roles`, not this.
 */
const ACTIVE_ROLE_KEY = "foundry.auth.activeRole";

/** Admin is a moderation surface, not a "way to use the product" — never auto-selected. */
const PREFERRED_ORDER: AppRole[] = ["organizer", "venue_operator", "vendor", "admin"];

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Pure: picks the role to display given what the account actually holds.
 * Falls back off a stored role the user no longer has (or never had), so a
 * stale localStorage value can't strand someone on an empty dashboard.
 */
export function resolveActiveRole(roles: AppRole[], stored: string | null): AppRole | null {
  if (roles.length === 0) return null;
  if (stored && (roles as string[]).includes(stored)) return stored as AppRole;
  for (const role of PREFERRED_ORDER) {
    if (roles.includes(role)) return role;
  }
  return roles[0];
}

/** Roles the account could still add — drives the "use Foundry as…" switcher. */
export function getAddableRoles(roles: AppRole[]): AppRole[] {
  // Admin is granted manually, never self-serve (docs/DATABASE.md §2).
  return PREFERRED_ORDER.filter((role) => role !== "admin" && !roles.includes(role));
}

export function getStoredActiveRole(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(ACTIVE_ROLE_KEY);
  } catch {
    return null;
  }
}

export function setStoredActiveRole(role: AppRole | null): void {
  if (!isBrowser()) return;
  if (role === null) {
    window.localStorage.removeItem(ACTIVE_ROLE_KEY);
    return;
  }
  window.localStorage.setItem(ACTIVE_ROLE_KEY, role);
}
