"use client";

import { useEffect, useState } from "react";
import { findAccountById } from "@/lib/auth/storage";

/** Looks up the venue owner's account client-side (accounts only exist in localStorage). */
export default function VenueHostLine({ ownerId }: { ownerId: string | null }) {
  const [hostFirstName, setHostFirstName] = useState<string | null>(null);

  useEffect(() => {
    if (!ownerId) return;
    const account = findAccountById(ownerId);
    if (account) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHostFirstName(account.name.split(" ")[0]);
    }
  }, [ownerId]);

  if (!ownerId) {
    return <p className="mt-1 text-xs text-ink-soft">Hosted by Foundry</p>;
  }

  if (!hostFirstName) return null;

  return <p className="mt-1 text-xs text-ink-soft">Hosted by {hostFirstName}</p>;
}
