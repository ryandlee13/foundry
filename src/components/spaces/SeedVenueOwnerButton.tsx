"use client";

import { useState } from "react";
import { seedVenueOwnerDemoData, type SeedVenueOwnerResult } from "@/lib/spaces/seedVenueOwner";

export default function SeedVenueOwnerButton() {
  const [result, setResult] = useState<SeedVenueOwnerResult | null>(null);
  const [running, setRunning] = useState(false);

  function handleRun() {
    setRunning(true);
    try {
      setResult(seedVenueOwnerDemoData());
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleRun}
        disabled={running}
        className="rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft disabled:opacity-50"
      >
        {running ? "Seeding…" : "Load demo venue owner"}
      </button>
      {result && (
        <div className="mt-4 rounded-lg bg-paper-dim px-4 py-3 text-sm text-ink-soft">
          <p>Owner account: {result.ownerEmail}</p>
          <p>Venues adopted: {result.venuesAdopted}</p>
        </div>
      )}
    </div>
  );
}
