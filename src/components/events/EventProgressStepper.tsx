import type { EventProgress, StepState } from "@/lib/events/eventProgress";

/**
 * The six steps of an event, as a row of dots and labels.
 *
 * Two renderings of one calculation: `compact` for a dashboard card, full for
 * the event hub. Both read the same `EventProgress`, so a row can never
 * disagree with the page it links to.
 */

const DOT_CLASSES: Record<StepState, string> = {
  done: "bg-ok text-paper",
  current: "bg-act text-paper",
  upcoming: "bg-paper-dim text-ink-soft",
  skipped: "bg-paper-dim text-ink-soft",
};

const LABEL_CLASSES: Record<StepState, string> = {
  done: "text-ink",
  current: "font-semibold text-ink",
  upcoming: "text-ink-soft",
  skipped: "text-ink-soft",
};

function StepDot({ state, index }: { state: StepState; index: number }) {
  return (
    <span
      aria-hidden
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${DOT_CLASSES[state]}`}
    >
      {/* A tick for done, a dash for deliberately skipped, the number otherwise —
          so the state survives being read without color. */}
      {state === "done" ? "✓" : state === "skipped" ? "–" : index + 1}
    </span>
  );
}

export default function EventProgressStepper({
  progress,
  compact = false,
}: {
  progress: EventProgress;
  compact?: boolean;
}) {
  const { steps, completedCount, applicableCount, currentStep } = progress;

  if (compact) {
    return (
      <div>
        <div className="flex items-center gap-1.5">
          {steps.map((step) => (
            <span
              key={step.key}
              /* The title carries the detail a compact row has no space for. */
              title={`${step.label} — ${step.detail}`}
              className={`h-1.5 flex-1 rounded-full ${
                step.state === "done"
                  ? "bg-ok"
                  : step.state === "current"
                    ? "bg-act"
                    : "bg-line"
              }`}
            />
          ))}
        </div>
        <p className="mt-1.5 text-xs text-ink-soft">
          <span className="font-semibold text-ink">
            {completedCount} of {applicableCount}
          </span>{" "}
          {currentStep ? `· Next: ${currentStep.label}` : "· All done"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-ink">Where this event stands</h2>
        <p className="text-sm text-ink-soft">
          <span className="font-semibold text-ink">
            {completedCount} of {applicableCount}
          </span>{" "}
          steps settled
        </p>
      </div>

      <ol className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <li key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <StepDot state={step.state} index={index} />
              {/* The connector stops at the last step rather than trailing off. */}
              {index < steps.length - 1 && <span className="mt-1 w-px flex-1 bg-line" />}
            </div>
            <div className="min-w-0 pb-1">
              <p className={`text-sm ${LABEL_CLASSES[step.state]}`}>
                {step.label}
                {step.state === "skipped" && (
                  <span className="ml-1.5 text-xs font-normal text-ink-soft">(not used)</span>
                )}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
