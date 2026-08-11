/**
 * Pure grouping for the messages inbox. Deliberately generic (no MessageThread
 * import) — the caller resolves each item's bookingId however is appropriate
 * for its thread kind (a proposal thread via its event need, a booking thread
 * directly), then hands this a flat list to group.
 */
export interface ThreadGroupResult<T> {
  groupKey: string;
  items: T[];
}

/**
 * Groups items by a resolved bookingId, falling back to the item's own id
 * (its own single-item group) when no bookingId could be resolved — e.g. an
 * orphaned or malformed thread still gets a group rather than being dropped.
 * Preserves input order, both across groups and within each group.
 */
export function groupThreadsByBooking<T extends { id: string }>(
  items: { bookingId: string | null; item: T }[]
): ThreadGroupResult<T>[] {
  const order: string[] = [];
  const map = new Map<string, T[]>();

  for (const { bookingId, item } of items) {
    const key = bookingId ?? item.id;
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(item);
  }

  return order.map((groupKey) => ({ groupKey, items: map.get(groupKey)! }));
}
