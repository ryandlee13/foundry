import type { EventNeed, EventNeedStatus } from "@/lib/types/vendors";

/** Browser-local event needs ("Looking for a ___" requests). Same prototype caveat as profiles.ts. */
const EVENT_NEEDS_KEY = "foundry.vendors.eventNeeds";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getEventNeeds(): EventNeed[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(EVENT_NEEDS_KEY);
    return raw ? (JSON.parse(raw) as EventNeed[]) : [];
  } catch {
    return [];
  }
}

function saveEventNeeds(needs: EventNeed[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(EVENT_NEEDS_KEY, JSON.stringify(needs));
}

export function getEventNeedById(id: string): EventNeed | undefined {
  return getEventNeeds().find((need) => need.id === id);
}

export function getEventNeedsForBooking(bookingId: string): EventNeed[] {
  return getEventNeeds().filter((need) => need.bookingId === bookingId);
}

export function getEventNeedsForOrganizer(organizerId: string): EventNeed[] {
  return getEventNeeds().filter((need) => need.organizerId === organizerId);
}

export function getPublishedEventNeeds(): EventNeed[] {
  return getEventNeeds().filter((need) => need.status === "published");
}

export function createDraftEventNeed(
  input: Omit<EventNeed, "id" | "status" | "publishedAt" | "createdAt" | "updatedAt" | "positionsFilled">
): EventNeed {
  const now = new Date().toISOString();
  const need: EventNeed = {
    ...input,
    id: crypto.randomUUID(),
    positionsFilled: 0,
    status: "draft",
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  saveEventNeeds([...getEventNeeds(), need]);
  return need;
}

export function updateEventNeed(id: string, patch: Partial<EventNeed>): EventNeed | undefined {
  const needs = getEventNeeds();
  const index = needs.findIndex((need) => need.id === id);
  if (index === -1) return undefined;

  const updated: EventNeed = { ...needs[index], ...patch, id: needs[index].id, updatedAt: new Date().toISOString() };
  const next = [...needs];
  next[index] = updated;
  saveEventNeeds(next);
  return updated;
}

function setStatus(id: string, status: EventNeedStatus): EventNeed | undefined {
  return updateEventNeed(id, { status });
}

export function publishEventNeed(id: string): EventNeed | undefined {
  const need = getEventNeedById(id);
  if (!need) return undefined;
  return updateEventNeed(id, { status: "published", publishedAt: new Date().toISOString() });
}

export function pauseEventNeed(id: string): EventNeed | undefined {
  return setStatus(id, "paused");
}

export function resumeEventNeed(id: string): EventNeed | undefined {
  return setStatus(id, "published");
}

export function closeEventNeed(id: string): EventNeed | undefined {
  return setStatus(id, "closed");
}

export function cancelEventNeed(id: string): EventNeed | undefined {
  return setStatus(id, "canceled");
}

/** Pure predicate (no storage access) — the over-acceptance guard used by acceptProposal() in engagements.ts. */
export function canFillPosition(need: Pick<EventNeed, "positionsFilled" | "positionsAvailable">): boolean {
  return need.positionsFilled < need.positionsAvailable;
}

/** Pure: computes the next positionsFilled/status pair without touching storage. */
export function computeFilledPosition(
  need: Pick<EventNeed, "positionsFilled" | "positionsAvailable" | "status">
): { positionsFilled: number; status: EventNeedStatus } {
  const positionsFilled = need.positionsFilled + 1;
  const status: EventNeedStatus = positionsFilled >= need.positionsAvailable ? "filled" : need.status;
  return { positionsFilled, status };
}

/** Called when a proposal is accepted — fills one position and auto-closes the need if all positions are now filled. */
export function fillOnePosition(id: string): EventNeed | undefined {
  const need = getEventNeedById(id);
  if (!need) return undefined;
  return updateEventNeed(id, computeFilledPosition(need));
}
