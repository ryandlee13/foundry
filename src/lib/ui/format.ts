/**
 * Shared display formatting. Pure — no storage, no `window`.
 *
 * CLAUDE.md's rule for this layer: values are stored ISO and never rendered
 * ISO. These are the chat-side counterparts to `formatEventDate()`
 * (lib/spaces/bookings.ts) and `formatTimeRange()`
 * (lib/spaces/bookingConstraints.ts), which already cover event dates and
 * booking windows — don't add a third spelling of those here.
 */

/**
 * Whole dollars, with separators and no cents.
 *
 * Replaces two identical local copies (VendorDashboard, VenueDashboard). Cents
 * are dropped on purpose: every amount in this product is a negotiated figure
 * someone typed, not a computed charge, and `$4,500.00` implies a precision
 * that the thing it describes doesn't have.
 */
export function formatMoney(amount: number): string {
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}

/**
 * A rate or total, where the pricing model decides whether a suffix belongs.
 * Kept here next to formatMoney so the two can't drift on separators.
 */
export function formatMoneyWithSuffix(amount: number, suffix: string | null): string {
  return suffix ? `${formatMoney(amount)}${suffix}` : formatMoney(amount);
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Calendar days between two instants, ignoring clock time. Negative when `then` is later. */
function daysApart(now: Date, then: Date): number {
  return Math.round((startOfDay(now) - startOfDay(then)) / 86_400_000);
}

/**
 * The time on a single chat message — "7:41 PM".
 *
 * Deliberately just the time: the day is carried by the separator above the
 * cluster (see `formatDaySeparator`), so repeating it on every bubble was what
 * made the old `toLocaleString()` read as a server log. No seconds, ever —
 * nobody has ever needed to know a message landed at :22.
 */
export function formatChatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/**
 * The heading above a day's worth of messages: "Today", "Yesterday",
 * "Thu, Oct 3", or "Oct 3, 2025" once it's not this year.
 *
 * `now` is a parameter rather than read from the clock so this is testable and
 * so a long-lived page can't disagree with itself about what "today" means.
 */
export function formatDaySeparator(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const days = daysApart(now, date);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";

  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-US", {
    weekday: sameYear && days < 7 ? "short" : undefined,
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
}

/**
 * Compact "when did this last happen" for a list row — "7:41 PM" today,
 * "Yesterday", "Mon" within the week, "Oct 3" beyond it.
 *
 * The messages list computed `lastMessageAt` purely to sort by and never
 * showed it, which left every conversation looking equally recent.
 */
export function formatRelativeListTime(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const days = daysApart(now, date);
  if (days === 0) return formatChatTime(iso);
  if (days === 1) return "Yesterday";
  if (days < 7) return date.toLocaleDateString("en-US", { weekday: "short" });

  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
}

/**
 * Initials for an avatar chip — "Lena Ortiz" -> "LO".
 *
 * Initials rather than photographs throughout, the same call the recap
 * carousel makes: there are no real uploaded avatars in this prototype, and a
 * generated face standing in for a real person is worse than two letters.
 */
export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
