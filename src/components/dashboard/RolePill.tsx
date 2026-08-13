"use client";

import { useEffect, useRef, useState } from "react";
import { getAddableRoles } from "@/lib/auth/activeRole";
import { ROLE_LABELS, type AppRole } from "@/lib/types/roles";

const ADD_ROLE_BLURB: Record<string, string> = {
  organizer: "Book venues and hire vendors for your own events.",
  venue_operator: "List a space and take booking requests.",
  vendor: "Offer a service and bid on open gigs.",
};

/**
 * "Signed in with the [Organizer] role" — the pill is the control. Held
 * roles switch the dashboard view; unheld ones are added to the account
 * on the spot, since one account is meant to span all three sides.
 */
export default function RolePill({
  activeRole,
  heldRoles,
  onSwitch,
  onAddRole,
}: {
  activeRole: AppRole;
  heldRoles: AppRole[];
  onSwitch: (role: AppRole) => void;
  onAddRole: (role: AppRole) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const otherHeldRoles = heldRoles.filter((role) => role !== activeRole);
  const addableRoles = getAddableRoles(heldRoles);

  return (
    <div ref={containerRef} className="relative inline-block">
      <span className="text-sm text-ink-soft">Signed in with the </span>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full bg-brass/15 px-3 py-1 text-sm font-semibold text-brass-dark transition-colors hover:bg-brass/25"
      >
        {ROLE_LABELS[activeRole]}
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <span className="text-sm text-ink-soft"> role</span>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-30 mt-2 w-72 rounded-xl border border-line bg-paper p-1.5 shadow-lg"
        >
          {otherHeldRoles.length > 0 && (
            <>
              <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                Switch view
              </p>
              {otherHeldRoles.map((role) => (
                <button
                  key={role}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onSwitch(role);
                    setOpen(false);
                  }}
                  className="block w-full rounded-lg px-2.5 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-paper-dim"
                >
                  {ROLE_LABELS[role]}
                </button>
              ))}
            </>
          )}

          {addableRoles.length > 0 && (
            <>
              <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                Also use Foundry as
              </p>
              {addableRoles.map((role) => (
                <button
                  key={role}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onAddRole(role);
                    setOpen(false);
                  }}
                  className="block w-full rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-paper-dim"
                >
                  <span className="block text-sm font-medium text-ink">{ROLE_LABELS[role]}</span>
                  <span className="block text-xs text-ink-soft">{ADD_ROLE_BLURB[role]}</span>
                </button>
              ))}
            </>
          )}

          {otherHeldRoles.length === 0 && addableRoles.length === 0 && (
            <p className="px-2.5 py-2 text-sm text-ink-soft">You already hold every role.</p>
          )}
        </div>
      )}
    </div>
  );
}
