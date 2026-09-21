"use client";

import { RULE_LABELS } from "@/lib/spaces/labels";
import { RULE_KEYS } from "@/lib/spaces/venueFormSchema";
import type { VenueRules } from "@/lib/types/spaces";

/**
 * Explicit yes/no for each venue policy, shared by the submission and edit
 * forms.
 *
 * Replaces a checkbox list, where an unticked box meant both "this space
 * doesn't allow it" and "the owner never read this section". Planners filter
 * on these, so the two have to be distinguishable — an unanswered policy
 * blocks publishing (see the `rules` refine in venueFormSchema.ts) rather
 * than quietly defaulting to "no".
 */
/**
 * `rules` is a Record, so react-hook-form types its error as a map of
 * per-key FieldErrors — which means the schema-level refine message doesn't
 * typecheck as a string even though that's what's there at runtime. Unwrap
 * it defensively rather than casting.
 */
export function fieldErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("message" in error)) return undefined;
  const { message } = error as { message?: unknown };
  return typeof message === "string" ? message : undefined;
}

export default function PolicyAnswers({
  value,
  onChange,
  error,
}: {
  value: Record<string, boolean | undefined>;
  onChange: (key: keyof VenueRules, answer: boolean) => void;
  error?: string;
}) {
  const unanswered = RULE_KEYS.filter((key) => typeof value[key] !== "boolean").length;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-ink">
          Venue rules &amp; requirements <span className="text-wine">*</span>
        </p>
        {unanswered > 0 && (
          <span className="text-xs text-ink-soft">{unanswered} left</span>
        )}
      </div>
      <p className="mt-1 text-xs text-ink-soft">
        Planners filter on these, so answer each one — &ldquo;no&rdquo; is a real answer.
      </p>

      <div className="mt-3 divide-y divide-line rounded-lg border border-line">
        {RULE_KEYS.map((key) => {
          const answer = value[key];
          return (
            <div key={key} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <span className="text-sm text-ink">{RULE_LABELS[key]}</span>
              <div className="flex shrink-0 gap-1" role="group" aria-label={RULE_LABELS[key]}>
                {[true, false].map((option) => {
                  const selected = answer === option;
                  return (
                    <button
                      key={String(option)}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onChange(key, option)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                        selected
                          ? "bg-wine text-paper"
                          : "border border-line text-ink-soft hover:bg-paper-dim hover:text-ink"
                      }`}
                    >
                      {option ? "Yes" : "No"}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="mt-1 text-xs text-wine">{error}</p>}
    </div>
  );
}
