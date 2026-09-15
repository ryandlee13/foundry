import {
  CommunicateIcon,
  CompareIcon,
  DiscoverIcon,
  TrackIcon,
} from "./HomeSectionIcons";

/**
 * Foundry's core pitch: this is a workflow, not just a venue directory.
 *
 * Copy is held to CLAUDE.md's "no claiming things that aren't true yet" rule,
 * which cost two words against the original brief:
 *  - "Compare" says bids and proposals, not quotes — there is no venue
 *    quote/negotiation step yet (see the bookings notes in CLAUDE.md); a
 *    booking is a single accept/decline.
 *  - "Track" doesn't claim payments. Stripe is a deliberately deferred phase
 *    (docs/IMPLEMENTATION_PLAN.md, Phase 7) and nothing here moves money, so
 *    it carries a "coming soon" tag instead of asserting the feature.
 * Both become plain true statements the moment those phases land.
 */
const BENEFITS = [
  {
    key: "discover",
    title: "Discover",
    description: "Find venues and vendors in one place.",
    Icon: DiscoverIcon,
  },
  {
    key: "compare",
    title: "Compare",
    description: "Review bids and proposals side by side.",
    Icon: CompareIcon,
  },
  {
    key: "communicate",
    title: "Communicate",
    description: "Keep venue and vendor conversations organized.",
    Icon: CommunicateIcon,
  },
  {
    key: "track",
    title: "Track",
    description: "Manage budget and event status in one view.",
    Icon: TrackIcon,
    tag: "Payments coming soon",
  },
];

export default function ValuePropsSection() {
  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            One event, one place.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-soft">
            Foundry carries an event the whole way through — from finding the room and the
            people, to comparing what they proposed, to keeping every conversation in one
            thread and knowing exactly where things stand.
          </p>
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map(({ key, title, description, Icon, tag }) => (
            <li
              key={key}
              className="rounded-2xl border border-line bg-paper p-6 transition-colors hover:border-brass"
            >
              <Icon className="h-9 w-9 text-wine" />
              <h3 className="mt-5 font-display text-lg font-semibold text-ink">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{description}</p>
              {tag && (
                <span className="mt-3 inline-block rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                  {tag}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
