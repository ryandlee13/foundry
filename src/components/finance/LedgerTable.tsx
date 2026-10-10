import InfoTooltip from "@/components/ui/InfoTooltip";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatMoney } from "@/lib/ui/format";
import { formatEventDate } from "@/lib/spaces/bookings";
import {
  formatLedgerSummary,
  LEDGER_FOOTNOTE,
  rateSuffixFor,
  type EventLedger,
  type LedgerLineItem,
} from "@/lib/finance/eventLedger";

/**
 * One event's money, as a table.
 *
 * The rule this layout exists to enforce: a reader can always tell which of
 * these numbers somebody committed to, which one we calculated, and which one
 * is a rate that means nothing on its own. Every amount carries its basis in
 * the column beside it, estimates keep their "est." and their explanation, and
 * the total row never adds the three together.
 */

function AmountCell({ item }: { item: LedgerLineItem }) {
  if (item.amount === null) {
    return <span className="text-ink-soft">—</span>;
  }

  if (item.basis === "rate_only") {
    return (
      <span className="font-medium text-ink">
        {formatMoney(item.amount)}
        {item.pricingModel ? rateSuffixFor(item.pricingModel) : ""}
      </span>
    );
  }

  if (item.basis === "estimate") {
    return (
      <span className="font-medium text-ink">
        <span className="text-ink-soft">est.</span> {formatMoney(item.amount)}
      </span>
    );
  }

  return <span className="font-semibold text-ink">{formatMoney(item.amount)}</span>;
}

const BASIS_LABEL: Record<LedgerLineItem["basis"], string> = {
  firm: "Agreed",
  estimate: "Estimated",
  rate_only: "Rate only",
};

export default function LedgerTable({
  ledger,
  overBudgetIds,
}: {
  ledger: EventLedger;
  /** Defaults to the ledger's own flags; passed separately only for tests/stories. */
  overBudgetIds?: string[];
}) {
  const overBudget = new Set(overBudgetIds ?? ledger.overBudgetItemIds);

  if (ledger.items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line px-5 py-8 text-center text-sm text-ink-soft">
        Nothing booked yet. Once a venue confirms or a vendor agrees terms, the figures show up here.
      </p>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-soft">
              <th className="pb-2 pr-3">Item</th>
              <th className="pb-2 pr-3">Who</th>
              <th className="pb-2 pr-3 text-right">Amount</th>
              <th className="pb-2 pr-3">Basis</th>
              <th className="pb-2 pr-3">Status</th>
              <th className="pb-2">Next due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {ledger.items.map((item) => {
              const nextDue = item.dues.find((due) => due.dueDate !== null) ?? item.dues[0];
              const isOver = overBudget.has(item.id);
              return (
                <tr key={item.id}>
                  <td className="py-3 pr-3 font-medium text-ink">{item.label}</td>
                  <td className="py-3 pr-3 text-ink-soft">{item.counterparty}</td>
                  <td className="py-3 pr-3 text-right">
                    <AmountCell item={item} />
                    {/*
                      Budget vs committed, on the line it belongs to. Only firm
                      amounts are ever flagged — see summarizeLedger().
                    */}
                    {item.budgetAmount !== null && (
                      <span className={`mt-0.5 block text-xs ${isOver ? "font-semibold text-act" : "text-ink-soft"}`}>
                        {isOver ? "over " : "of "}
                        {formatMoney(item.budgetAmount)} budget
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-3">
                    <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
                      {BASIS_LABEL[item.basis]}
                      {/* The reason lives beside the word, not in a legend
                          somewhere else on the page. */}
                      {item.basis !== "firm" && (
                        <InfoTooltip label={`Why this is ${BASIS_LABEL[item.basis].toLowerCase()}`}>
                          {item.basisNote}
                        </InfoTooltip>
                      )}
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    <StatusBadge descriptor={item.status} />
                  </td>
                  <td className="py-3 text-xs text-ink-soft">
                    {nextDue ? (
                      <>
                        {/* "Requested", never "due" — nothing has been paid. */}
                        <span className="font-medium text-ink">
                          {nextDue.label} requested
                        </span>
                        {nextDue.amount !== null && <> · {formatMoney(nextDue.amount)}</>}
                        {nextDue.dueDate && <> · by {formatEventDate(nextDue.dueDate)}</>}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-line">
              <td className="pt-3 font-semibold text-ink" colSpan={2}>
                Total
              </td>
              {/*
                Three figures, never one. Adding committed money to our own
                arithmetic would present a guess as a commitment, which is the
                single thing this whole module exists to prevent.
              */}
              <td className="pt-3 text-right" colSpan={4}>
                <span className="font-semibold text-ink">{formatLedgerSummary(ledger, formatMoney)}</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-soft">{LEDGER_FOOTNOTE}</p>
    </div>
  );
}
