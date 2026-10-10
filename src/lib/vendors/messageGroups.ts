import type { ChatMessage } from "@/lib/types/vendors";

/**
 * Turns a flat message list into the shape a conversation actually reads as:
 * days, and within a day, clusters of consecutive messages from one person.
 *
 * The thread used to render one bubble per message, each stamped with a full
 * `toLocaleString()` — "10/9/2026, 7:41:22 PM" — which is why it read as a
 * server log rather than a conversation. Four messages typed in a row by the
 * same person showed four names and four datestamps with seconds.
 *
 * Pure: takes messages and a clock, returns a structure. No storage, no
 * `window`, no formatting — the caller formats, so this is testable in node
 * and can't disagree with `src/lib/ui/format.ts` about wording.
 */

/** Messages typed within this long of each other, by one person, are one cluster. */
export const CLUSTER_WINDOW_MS = 5 * 60 * 1000;

export interface MessageCluster {
  /** Stable key for React — the first message's id. */
  id: string;
  senderId: string;
  messages: ChatMessage[];
  /** When the cluster started; the single timestamp rendered for the group. */
  startedAt: string;
}

export interface MessageDay {
  /** "YYYY-MM-DD" in local time — the grouping key, never rendered directly. */
  dayKey: string;
  /** An ISO instant inside this day, for the caller to format as a separator. */
  representativeAt: string;
  clusters: MessageCluster[];
}

/** Local calendar day, not UTC: a 9pm message must not land on tomorrow's heading. */
function localDayKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function elapsedMs(fromIso: string, toIso: string): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return Number.POSITIVE_INFINITY;
  return to - from;
}

/**
 * Groups by day, then clusters inside each day.
 *
 * A cluster breaks on: a different sender, a gap wider than
 * `CLUSTER_WINDOW_MS`, a day boundary, or an attachment. That last one is
 * deliberate — an offer or a contract is a landmark in the conversation, and
 * folding it into a run of chat makes it skimmable past. It gets its own
 * cluster so it keeps its own timestamp.
 *
 * Input order is preserved (the store appends chronologically); this does not
 * sort, so a caller handing it shuffled messages gets shuffled clusters.
 */
export function groupMessages(messages: ChatMessage[]): MessageDay[] {
  const days: MessageDay[] = [];

  for (const message of messages) {
    const dayKey = localDayKey(message.createdAt);
    let day = days.length > 0 ? days[days.length - 1] : undefined;

    if (!day || day.dayKey !== dayKey) {
      day = { dayKey, representativeAt: message.createdAt, clusters: [] };
      days.push(day);
    }

    const lastCluster = day.clusters[day.clusters.length - 1];
    const previous = lastCluster?.messages[lastCluster.messages.length - 1];
    const carriesAttachment = hasAttachment(message);
    const previousCarriesAttachment = previous ? hasAttachment(previous) : false;

    const continuesCluster =
      lastCluster !== undefined &&
      previous !== undefined &&
      lastCluster.senderId === message.senderId &&
      !carriesAttachment &&
      !previousCarriesAttachment &&
      elapsedMs(previous.createdAt, message.createdAt) <= CLUSTER_WINDOW_MS;

    if (continuesCluster) {
      lastCluster.messages.push(message);
    } else {
      day.clusters.push({
        id: message.id,
        senderId: message.senderId,
        messages: [message],
        startedAt: message.createdAt,
      });
    }
  }

  return days;
}

/** True when this message carries an offer, deal round, or contract. */
export function hasAttachment(message: ChatMessage): boolean {
  return Boolean(message.proposal || message.dealProposal || message.contract);
}

/**
 * Which attachment a message carries, for the pointer that jumps to its card
 * in the offers log. Null when it carries none.
 */
export function attachmentKindOf(message: ChatMessage): "proposal" | "deal" | "contract" | null {
  if (message.contract) return "contract";
  if (message.proposal) return "proposal";
  if (message.dealProposal) return "deal";
  return null;
}

/**
 * The DOM id of an attachment's card in the offers log. One function so the
 * pointer in the chat and the card it scrolls to can't drift apart.
 */
export function attachmentAnchorId(messageId: string): string {
  return `offer-card-${messageId}`;
}
