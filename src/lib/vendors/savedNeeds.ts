import type { SavedEventNeed } from "@/lib/types/vendors";

const SAVED_NEEDS_KEY = "foundry.vendors.savedNeeds";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function getAll(): SavedEventNeed[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(SAVED_NEEDS_KEY);
    return raw ? (JSON.parse(raw) as SavedEventNeed[]) : [];
  } catch {
    return [];
  }
}

function saveAll(saved: SavedEventNeed[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(SAVED_NEEDS_KEY, JSON.stringify(saved));
}

export function getSavedNeeds(vendorProfileId: string): SavedEventNeed[] {
  return getAll().filter((saved) => saved.vendorProfileId === vendorProfileId);
}

export function isNeedSaved(vendorProfileId: string, eventNeedId: string): boolean {
  return getAll().some((saved) => saved.vendorProfileId === vendorProfileId && saved.eventNeedId === eventNeedId);
}

export function toggleSavedNeed(vendorProfileId: string, eventNeedId: string): boolean {
  const all = getAll();
  const existing = all.find((saved) => saved.vendorProfileId === vendorProfileId && saved.eventNeedId === eventNeedId);
  if (existing) {
    saveAll(all.filter((saved) => saved.id !== existing.id));
    return false;
  }
  saveAll([...all, { id: crypto.randomUUID(), vendorProfileId, eventNeedId, createdAt: new Date().toISOString() }]);
  return true;
}
