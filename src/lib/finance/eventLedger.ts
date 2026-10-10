import type { StatusDescriptor } from "@/lib/ui/statusTone";
import type { PricingModel } from "@/lib/types/vendors";

/**
 * What an event costs, as line items — and how much of that figure is actually
 * knowable.
 *
 * Nothing in this product charges anyone. Foundry has no payment integration
 * (Phase 7, docs/IMPLEMENTATION_PLAN.md), so every amount here is a number two
 * people agreed on, wrote down, or guessed at. The whole purpose of `basis` is
 * to keep those three apart on screen:
 *
 *   firm      — a fixed total somebody committed to: a signed contract, an
 *               accepted offer, or a confirmed flat-fee/package engagement.
 *   estimate  — arithmetic we did, not a figure anyone agreed: a floor rate
 *               times booked hours. Always rendered with "est." and a reason.
 *   rate_only — a rate with nothing to multiply it by. Rendered as "$150/hr"
 *               and NEVER summed into any total.
 *
 * That last rule is the same trap `computeRosterSpend()` guards against: an
 * hourly `agreedAmount` is a rate, and adding it to a pile of totals produces a
 * number that is confidently wrong. Totals come back separated
 * (`firmTotal` / `estimatedTotal` / `rateOnlyCount`) precisely so no caller can
 * accidentally present them as one sum.
 *
 * Deposits and balances are **requested**, never paid — there is no `paidAt`
 * anywhere in this codebase and adding one would assert a transaction that
 * never happened.
 *
 * Pure: no storage, no `window`, no clock.
 */

export type LineItemBasis = "firm" | "estimate" | "rate_only";

/** A sum somebody has asked for by a date. Asked for — not received. */
export interface LedgerDue {
  /** "Deposit" / "Balance". */
  label: string;
  amount: number | null;
  /** "YYYY-MM-DD", or null when no date was given. */
  dueDate: string | null;
  counterparty: string;
}

export interface LedgerLineItem {
  id: string;
  /** What it is — "Venue", "DJ", "Photographer". */
  label: string;
  /** Who it's with. Venue identity must already have passed the disclosure gate. */
  counterparty: string;
  kind: "venue" | "vendor";
  /** Null only when the basis is `rate_only` and no rate figure exists at all. */
  amount: number | null;
  basis: LineItemBasis;
  /** Why this basis — the tooltip text on an estimate, the suffix on a rate. */
  basisNote: string;
  status: StatusDescriptor;
  dues: LedgerDue[];
  /** Set for `rate_only` so the unit can render ("/hr", "/day"). */
  pricingModel: PricingModel | null;
  /** What the planner budgeted for this line, when they said. */
  budgetAmount: number | null;
}

export interface EventLedger {
  items: LedgerLineItem[];
  /** Committed money. Safe to present as a number somebody owes. */
  firmTotal: number;
  /** Our arithmetic. Must always be labelled as an estimate. */
  estimatedTotal: number;
  /** Lines deliberately excluded from both totals. */
  rateOnlyCount: number;
  /** Every requested deposit/balance, soonest first. Never "paid". */
  dues: LedgerDue[];
  /** Lines whose firm amount exceeds what the planner budgeted for them. */
  overBudgetItemIds: string[];
}

const RATE_PRICING_MODELS: PricingModel[] = ["hourly", "day_rate"];
const FIRM_PRICING_MODELS: PricingModel[] = ["flat_fee", "package"];

/** "/hr", "/day", or "" — the unit a rate is quoted in. */
export function rateSuffixFor(pricingModel: PricingModel): string {
  if (pricingModel === "hourly") return "/hr";
  if (pricingModel === "day_rate") return "/day";
  return "";
}

export interface VenueLineInput {
  /** Already through resolveVenueDisclosure() where that applies — see docs/SECURITY.md #5. */
  venueName: string;
  status: StatusDescriptor;
  /** Highest precedence: a countersigned contract naming a figure. */
  signedContractTotal: number | null;
  signedContractDeposit: number | null;
  signedContractBalanceDue: string | null;
  /** Next: an offer from the host the planner accepted. */
  acceptedOfferTotal: number | null;
  /** Deposit asks, open or accepted. Requests, in both cases. */
  depositRequests: { amount: number | null; dueDate: string | null }[];
  /** Last resort: floor rate x booked hours (estimateBookingValue()). */
  estimateAmount: number | null;
}

/**
 * The venue line, on a strict precedence: **signed contract > accepted offer >
 * estimate.**
 *
 * The order is the order of how much the two parties have actually committed
 * to. A signed contract naming $6,400 outranks an accepted offer naming $6,000
 * because the contract is the later and more formal agreement; both outrank our
 * rate-times-hours arithmetic, which nobody agreed to at all.
 */
export function resolveVenueLine(input: VenueLineInput): LedgerLineItem {
  const dues: LedgerDue[] = [];

  for (const request of input.depositRequests) {
    dues.push({
      label: "Deposit",
      amount: request.amount,
      dueDate: request.dueDate,
      counterparty: input.venueName,
    });
  }
  if (input.signedContractDeposit !== null) {
    dues.push({
      label: "Deposit",
      amount: input.signedContractDeposit,
      dueDate: null,
      counterparty: input.venueName,
    });
  }
  if (input.signedContractBalanceDue !== null) {
    dues.push({
      label: "Balance",
      // The contract's total minus its deposit is the balance, when both are
      // stated; otherwise the date stands alone and the amount is unknown.
      amount:
        input.signedContractTotal !== null && input.signedContractDeposit !== null
          ? input.signedContractTotal - input.signedContractDeposit
          : null,
      dueDate: input.signedContractBalanceDue,
      counterparty: input.venueName,
    });
  }

  const base = {
    id: "venue",
    label: "Venue",
    counterparty: input.venueName,
    kind: "venue" as const,
    status: input.status,
    dues,
    pricingModel: null,
    budgetAmount: null,
  };

  if (input.signedContractTotal !== null) {
    return { ...base, amount: input.signedContractTotal, basis: "firm", basisNote: "From your signed agreement." };
  }
  if (input.acceptedOfferTotal !== null) {
    return { ...base, amount: input.acceptedOfferTotal, basis: "firm", basisNote: "From the terms you accepted." };
  }
  if (input.estimateAmount !== null) {
    return {
      ...base,
      amount: input.estimateAmount,
      basis: "estimate",
      basisNote:
        "A booking has no agreed price until the host sends terms, so this is the venue's lowest hourly rate times your booked hours.",
    };
  }
  return {
    ...base,
    amount: null,
    basis: "rate_only",
    basisNote: "No rate published for this listing.",
  };
}

export interface VendorLineInput {
  engagementId: string;
  /** The trade — "DJ". */
  label: string;
  counterparty: string;
  status: StatusDescriptor;
  /** `agreedAmount`: a total for flat_fee/package, a RATE for hourly/day_rate. */
  amount: number;
  pricingModel: PricingModel;
  /** Booked hours, when this engagement is attached to an event with times. */
  hours: number | null;
  budgetAmount: number | null;
}

/**
 * A vendor line. The pricing model decides the basis, not the number's size.
 *
 * An hourly engagement with known hours becomes an estimate (rate x hours); the
 * same engagement with no event attached — the vendor-lobby case — stays
 * `rate_only`, because there are no hours to multiply and inventing some would
 * be the exact confident-wrong-number this module exists to prevent.
 */
export function resolveVendorLine(input: VendorLineInput): LedgerLineItem {
  const base = {
    id: input.engagementId,
    label: input.label,
    counterparty: input.counterparty,
    kind: "vendor" as const,
    status: input.status,
    dues: [],
    budgetAmount: input.budgetAmount,
  };

  if (FIRM_PRICING_MODELS.includes(input.pricingModel)) {
    return {
      ...base,
      amount: input.amount,
      basis: "firm",
      basisNote: "A fixed price you both agreed.",
      pricingModel: null,
    };
  }

  if (RATE_PRICING_MODELS.includes(input.pricingModel) && input.hours !== null && input.hours > 0) {
    return {
      ...base,
      amount: Math.round(input.amount * input.hours),
      basis: "estimate",
      basisNote: `${input.amount}${rateSuffixFor(input.pricingModel)} across ${input.hours} booked hour${input.hours === 1 ? "" : "s"}. The final figure depends on hours actually worked.`,
      pricingModel: input.pricingModel,
    };
  }

  return {
    ...base,
    amount: input.amount > 0 ? input.amount : null,
    basis: "rate_only",
    basisNote:
      input.pricingModel === "contact_for_quote"
        ? "Priced on enquiry — no figure agreed yet."
        : "A rate with no confirmed hours to apply it to, so it isn't included in any total.",
    pricingModel: input.pricingModel,
  };
}

/**
 * Rolls lines into separated totals.
 *
 * `firmTotal` and `estimatedTotal` are returned apart and never pre-added:
 * a caller that wants one number has to decide to combine committed money with
 * a guess, which is a decision worth making explicitly rather than inheriting
 * from a helper. `rate_only` lines are in neither.
 */
export function summarizeLedger(items: LedgerLineItem[]): EventLedger {
  let firmTotal = 0;
  let estimatedTotal = 0;
  let rateOnlyCount = 0;
  const dues: LedgerDue[] = [];
  const overBudgetItemIds: string[] = [];

  for (const item of items) {
    if (item.basis === "firm" && item.amount !== null) firmTotal += item.amount;
    else if (item.basis === "estimate" && item.amount !== null) estimatedTotal += item.amount;
    else rateOnlyCount += 1;

    dues.push(...item.dues);

    /*
     * Only a firm amount can be over budget. Flagging an estimate would have
     * the planner chasing a number nobody has actually asked them for.
     */
    if (
      item.basis === "firm" &&
      item.amount !== null &&
      item.budgetAmount !== null &&
      item.amount > item.budgetAmount
    ) {
      overBudgetItemIds.push(item.id);
    }
  }

  // Undated requests last: a date someone named is more actionable than one
  // they didn't.
  dues.sort((a, b) => {
    if (a.dueDate === b.dueDate) return 0;
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  return { items, firmTotal, estimatedTotal, rateOnlyCount, dues, overBudgetItemIds };
}

/**
 * The one-line summary — "$6,400 committed · ~$1,200 estimated · 1 hourly rate
 * not included".
 *
 * Built here rather than in a component so every surface says it the same way,
 * and so the estimate can never lose its tilde or the excluded rates their
 * mention.
 */
export function formatLedgerSummary(ledger: EventLedger, formatMoney: (amount: number) => string): string {
  const parts: string[] = [`${formatMoney(ledger.firmTotal)} committed`];
  if (ledger.estimatedTotal > 0) parts.push(`~${formatMoney(ledger.estimatedTotal)} estimated`);
  if (ledger.rateOnlyCount > 0) {
    parts.push(
      `${ledger.rateOnlyCount} rate${ledger.rateOnlyCount === 1 ? "" : "s"} not included`
    );
  }
  return parts.join(" · ");
}

/** Standing caveat for any surface showing these figures. No money moves through Foundry. */
export const LEDGER_FOOTNOTE =
  "Foundry doesn't process payments — these are the figures you and your suppliers agreed, settled directly with them. Deposits and balances shown as requested have been asked for, not paid.";
