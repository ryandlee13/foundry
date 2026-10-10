/**
 * Field chrome shared by the two hero search forms. Extracted only because
 * the location field is genuinely identical in both — same fixed value, same
 * "why can't I change this" note — and letting the two drift would imply
 * Foundry covers different areas depending on what you're searching for.
 */
const FIELD_BASE =
  "w-full rounded-lg border border-line bg-paper px-3 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass";

/**
 * h-11 (44px) rather than vertical padding: it pins every control in the card
 * to the same height regardless of whether it's an input, a date picker, or
 * the combobox, which is what actually makes the stack read as tidy. Text
 * centers itself vertically in an <input>, so no py is needed — a <textarea>
 * does need it, hence the separate class.
 *
 * This one number is deliberately NOT part of the card's slim-down: 44px is
 * the tap-target floor, and it's also the height EventTypeSelect and
 * VendorCategorySelect hardcode, so dropping it here alone would leave the
 * comboboxes standing taller than everything under them. The card gets its
 * height back from padding and gaps instead.
 */
export const FIELD_CLASS = `${FIELD_BASE} h-11`;

export const TEXTAREA_CLASS = `${FIELD_BASE} py-2`;

/** The gap between fields in both hero forms — one value so the two stacks can't drift. */
export const FORM_STACK_CLASS = "space-y-2.5";

export const LABEL_CLASS = "block text-[11px] font-semibold uppercase tracking-wide text-ink-soft";

/** Sits tight under the last field — the card's own padding is the breathing room. */
export const SUBMIT_CLASS =
  "mt-0.5 w-full rounded-full bg-wine px-6 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft";

/**
 * Location is fixed to San Francisco: it's the only market, and a free-text
 * city field would imply coverage that doesn't exist.
 *
 * Stated as a line rather than a field. It used to be a read-only `<input>`
 * with a label above and a "San Francisco only for now" note below — 78px of
 * the card spent on a control with exactly one possible value, which also read
 * as a form field that had broken rather than a fact about the market. Saying
 * it once in a third of the height is both smaller and more honest.
 */
export function LocationField() {
  return (
    <p className="flex items-center gap-1.5 rounded-lg bg-paper-dim px-3 py-2 text-xs text-ink-soft">
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5 shrink-0 text-brass-dark"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" strokeLinecap="round" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
      <span>
        <span className="font-semibold text-ink">San Francisco, CA</span> — the only market for
        now.
      </span>
    </p>
  );
}
