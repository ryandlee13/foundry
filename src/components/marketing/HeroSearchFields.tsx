/**
 * Field chrome shared by the two hero search forms. Extracted only because
 * the location field is genuinely identical in both — same fixed value, same
 * "why can't I change this" note — and letting the two drift would imply
 * Foundry covers different areas depending on what you're searching for.
 */
export const FIELD_CLASS =
  "w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass";

export const LABEL_CLASS = "block text-xs font-semibold uppercase tracking-wide text-ink-soft";

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
        className={`mt-1.5 cursor-not-allowed ${FIELD_CLASS} text-ink-soft`}
      />
      <p id={`${id}-note`} className="mt-1 text-xs text-ink-soft">
        San Francisco only for now.
      </p>
    </div>
  );
}
