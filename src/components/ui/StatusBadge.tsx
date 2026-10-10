import type { StatusDescriptor, StatusTone } from "@/lib/ui/statusTone";

/**
 * The one way a status is rendered anywhere in the app.
 *
 * Takes a `StatusDescriptor` from src/lib/ui/statusTone.ts rather than a raw
 * status string, so the decision "what does this state mean to the person
 * looking at it" is made once, in a tested pure module, instead of being
 * re-litigated per call site.
 *
 * Color is never the only carrier of meaning: the label is always rendered,
 * and the `act` tone adds a filled dot so "you need to do something" survives
 * being read in greyscale or by someone who can't distinguish the wine from
 * the moss.
 */

const TONE_CLASSES: Record<StatusTone, string> = {
  ok: "bg-ok-bg text-ok",
  wait: "bg-wait-bg text-wait",
  act: "bg-act-bg text-act",
  muted: "bg-muted-bg text-muted",
};

export default function StatusBadge({
  descriptor,
  className = "",
}: {
  descriptor: StatusDescriptor;
  className?: string;
}) {
  const { tone, label } = descriptor;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[tone]} ${className}`}
    >
      {tone === "act" && (
        <span
          aria-hidden
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-current motion-safe:animate-pulse"
        />
      )}
      {label}
    </span>
  );
}
