"use client";

import { useId, useState } from "react";
import Dialog from "@/components/ui/Dialog";
import { clearAllPrototypeData } from "@/lib/resetPrototypeData";

/**
 * Dev/demo affordance for the local-prototype layer: this browser's
 * localStorage is the only place any account, listing, or booking exists,
 * so it fills up (and blocks reusing an email) with no server-side way to
 * clear it. This button deletes all of it and reloads to a clean slate.
 */
export default function ResetPrototypeDataButton({
  className,
  onConfirmed,
}: {
  className?: string;
  onConfirmed?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  function handleConfirm() {
    clearAllPrototypeData();
    onConfirmed?.();
    window.location.href = "/";
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Reset all prototype data stored in this browser"
        className={
          className ??
          "rounded-full border border-dashed border-line px-4 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-wine hover:text-wine"
        }
      >
        Reset prototype data
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} labelledBy={titleId} panelClassName="w-full max-w-md p-6">
        <h2 id={titleId} className="font-display text-lg font-semibold text-ink">
          Reset all prototype data?
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          This clears every account, venue listing and photo, booking, vendor profile, bid,
          message, and review stored in this browser — including your own account. Email
          addresses become reusable again. There&apos;s no real server here, so this can&apos;t
          be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-full bg-wine px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
          >
            Clear everything
          </button>
        </div>
      </Dialog>
    </>
  );
}
