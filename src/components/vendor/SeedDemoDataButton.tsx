"use client";

import { useState } from "react";
import { seedVendorMarketplaceDemoData, type SeedResult } from "@/lib/vendors/seed";

export default function SeedDemoDataButton() {
  const [result, setResult] = useState<SeedResult | null>(null);
  const [running, setRunning] = useState(false);

  function handleRun() {
    setRunning(true);
    try {
      setResult(seedVendorMarketplaceDemoData());
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
        {running ? "Seeding…" : "Load demo vendor marketplace data"}
      </button>
      {result && (
        <div className="mt-4 rounded-lg bg-paper-dim px-4 py-3 text-sm text-ink-soft">
          <p>Vendors: {result.vendorsCreated}</p>
          <p>Event needs: {result.needsCreated}</p>
          <p>Proposals: {result.proposalsCreated}</p>
          <p>Completed engagements with reviews: {result.engagementsCompleted}</p>
        </div>
      )}
    </div>
  );
}
