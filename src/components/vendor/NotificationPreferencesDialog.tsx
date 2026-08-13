"use client";

import { useState } from "react";
import Dialog from "@/components/ui/Dialog";
import { MATCH_SCOPE_LABELS } from "@/lib/vendors/labels";
import type { MatchScope, VendorNotificationPreferences } from "@/lib/types/vendors";

/**
 * Shown once, right after a profile publishes — not as an onboarding step.
 * Notification settings are a preference to confirm, not work to complete,
 * and burying them mid-flow made the flow read as longer than it is.
 *
 * Deliberately reduced to the two decisions that matter (how to reach me,
 * how wide to cast). Per-category toggles still exist on the profile record
 * and keep their defaults; they belong in settings, not a first-run dialog.
 */
export default function NotificationPreferencesDialog({
  open,
  preferences,
  onSave,
}: {
  open: boolean;
  preferences: VendorNotificationPreferences;
  onSave: (patch: Partial<VendorNotificationPreferences>) => void;
}) {
  const [inAppEnabled, setInAppEnabled] = useState(preferences.inAppEnabled);
  const [emailEnabled, setEmailEnabled] = useState(preferences.emailEnabled);
  const [matchScope, setMatchScope] = useState<MatchScope>(preferences.matchScope);

  return (
    <Dialog
      open={open}
      onClose={() => onSave({ inAppEnabled, emailEnabled, matchScope })}
      labelledBy="notification-prefs-title"
      panelClassName="w-full max-w-md p-6"
    >
      <h2 id="notification-prefs-title" className="font-display text-xl font-semibold text-ink">
        You&apos;re live — how should we reach you?
      </h2>
      <p className="mt-1.5 text-sm text-ink-soft">You can change any of this later in your profile.</p>

      <div className="mt-5 space-y-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line px-4 py-3 transition-colors hover:bg-paper-dim">
          <input
            type="checkbox"
            checked={inAppEnabled}
            onChange={(event) => setInAppEnabled(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-wine focus:ring-1 focus:ring-brass"
          />
          <span>
            <span className="block text-sm font-medium text-ink">In-app notifications</span>
            <span className="block text-xs text-ink-soft">New gigs, proposal replies, and messages.</span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line px-4 py-3 transition-colors hover:bg-paper-dim">
          <input
            type="checkbox"
            checked={emailEnabled}
            onChange={(event) => setEmailEnabled(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-wine focus:ring-1 focus:ring-brass"
          />
          <span>
            <span className="block text-sm font-medium text-ink">Email notifications</span>
            {/* Honest about the prototype: nothing in this codebase sends mail. */}
            <span className="block text-xs text-ink-soft">Saved as a preference — no email is sent yet.</span>
          </span>
        </label>
      </div>

      <div className="mt-5">
        <p className="text-sm font-medium text-ink">Which gigs should we tell you about?</p>
        <div className="mt-2 space-y-2">
          {(Object.entries(MATCH_SCOPE_LABELS) as [MatchScope, string][]).map(([value, label]) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-4 py-3 text-sm text-ink transition-colors hover:bg-paper-dim"
            >
              <input
                type="radio"
                name="matchScope"
                checked={matchScope === value}
                onChange={() => setMatchScope(value)}
                className="h-4 w-4 border-line text-wine focus:ring-1 focus:ring-brass"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSave({ inAppEnabled, emailEnabled, matchScope })}
        className="mt-6 w-full rounded-full bg-wine px-5 py-3 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
      >
        Done
      </button>
    </Dialog>
  );
}
