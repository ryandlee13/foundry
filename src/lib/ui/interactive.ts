/**
 * The interaction vocabulary for anything clickable.
 *
 * Card hover treatments used to be decided per component — some moved the
 * border to brass, some tinted the background, several navigation targets had
 * no state at all — so the app gave inconsistent answers to "is this
 * clickable?". These constants are that answer, in one place.
 *
 * Every motion is behind `motion-safe:`, so a visitor who asked their OS for
 * reduced motion gets the color change and none of the movement. The focus
 * ring is NOT here: it's a single `:focus-visible` base rule in globals.css,
 * which covers these and every plain button besides.
 */

/**
 * A card or list row that navigates. Lifts very slightly on hover and presses
 * back in on click — enough to read as a button, not enough to reflow the row
 * beside it.
 */
export const INTERACTIVE_CARD =
  "transition-[color,background-color,border-color,box-shadow,transform] duration-150 hover:border-brass hover:shadow-[0_6px_18px_-10px_rgba(20,16,14,0.35)] motion-safe:hover:-translate-y-px motion-safe:active:translate-y-0 motion-safe:active:scale-[0.995]";

/** A row inside a bordered list, where the border belongs to the list and only the fill can change. */
export const INTERACTIVE_ROW =
  "transition-colors duration-150 hover:bg-paper-dim motion-safe:active:scale-[0.997]";
