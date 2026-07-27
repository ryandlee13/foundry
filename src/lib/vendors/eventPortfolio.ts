import type { VendorEventPortfolioItem, VendorSkillSlug } from "@/lib/types/vendors";

/** Browser-local "Foundry events" a vendor can choose to display on their public profile. */
const EVENT_PORTFOLIO_KEY = "foundry.vendors.eventPortfolio";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function getAll(): VendorEventPortfolioItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(EVENT_PORTFOLIO_KEY);
    return raw ? (JSON.parse(raw) as VendorEventPortfolioItem[]) : [];
  } catch {
    return [];
  }
}

function saveAll(items: VendorEventPortfolioItem[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(EVENT_PORTFOLIO_KEY, JSON.stringify(items));
}

export function getPortfolioItemsForVendor(vendorProfileId: string): VendorEventPortfolioItem[] {
  return getAll().filter((item) => item.vendorProfileId === vendorProfileId);
}

/** Pure: only items the vendor explicitly opted to display publicly — never private-by-default. */
export function filterPublicPortfolioItems<T extends Pick<VendorEventPortfolioItem, "displayPublicly">>(items: T[]): T[] {
  return items.filter((item) => item.displayPublicly);
}

export function getPublicPortfolioItemsForVendor(vendorProfileId: string): VendorEventPortfolioItem[] {
  return filterPublicPortfolioItems(getPortfolioItemsForVendor(vendorProfileId));
}

export function getPortfolioItemForEngagement(engagementId: string): VendorEventPortfolioItem | undefined {
  return getAll().find((item) => item.engagementId === engagementId);
}

/** Created automatically when an engagement completes; starts hidden until the vendor opts in. */
export function createPortfolioItem(input: {
  vendorProfileId: string;
  engagementId: string;
  displayTitle: string;
  eventDate: string;
  skillSlug: VendorSkillSlug;
}): VendorEventPortfolioItem {
  const existing = getPortfolioItemForEngagement(input.engagementId);
  if (existing) return existing;

  const item: VendorEventPortfolioItem = {
    id: crypto.randomUUID(),
    vendorProfileId: input.vendorProfileId,
    engagementId: input.engagementId,
    displayPublicly: false,
    displayTitle: input.displayTitle,
    displayDescription: "",
    eventDate: input.eventDate,
    skillSlug: input.skillSlug,
    createdAt: new Date().toISOString(),
  };
  saveAll([...getAll(), item]);
  return item;
}

export function setPortfolioItemVisibility(id: string, displayPublicly: boolean): VendorEventPortfolioItem | undefined {
  const items = getAll();
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return undefined;
  const updated = { ...items[index], displayPublicly };
  const next = [...items];
  next[index] = updated;
  saveAll(next);
  return updated;
}

export function updatePortfolioItemCopy(
  id: string,
  patch: { displayTitle?: string; displayDescription?: string }
): VendorEventPortfolioItem | undefined {
  const items = getAll();
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return undefined;
  const updated = { ...items[index], ...patch };
  const next = [...items];
  next[index] = updated;
  saveAll(next);
  return updated;
}

/** Organizer or admin removing an inappropriate/inaccurate public reference. */
export function removePortfolioItem(id: string): void {
  saveAll(getAll().filter((item) => item.id !== id));
}
