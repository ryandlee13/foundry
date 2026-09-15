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
 */
export const FIELD_CLASS = `${FIELD_BASE} h-11`;

export const TEXTAREA_CLASS = `${FIELD_BASE} py-2.5`;

export const LABEL_CLASS = "block text-[11px] font-semibold uppercase tracking-wide text-ink-soft";

/** Sits tight under the last field — the card's own padding is the breathing room. */
export const SUBMIT_CLASS =
  "mt-1 w-full rounded-full bg-wine px-6 py-3 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft";

/**
 * Location is fixed to San Francisco: it's the only market, and a free-text
 * city field would imply coverage that doesn't exist.
 */
export function LocationField({ id }: { id: string }) {
  return (
    <div>
      <label htmlFor={id} className={LABEL_CLASS}>
        Location
      </label>
      <input
        id={id}
        type="text"
        value="San Francisco, CA"
        readOnly
        aria-describedby={`${id}-note`}
        className={`mt-1 cursor-not-allowed ${FIELD_CLASS} text-ink-soft`}
      />
      <p id={`${id}-note`} className="mt-1 text-[11px] text-ink-soft">
        San Francisco only for now.
      </p>
    </div>
  );
}
