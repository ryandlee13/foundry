import Link from "next/link";
import TriangleDiagram from "@/components/marketing/TriangleDiagram";
import CommunitySlideshow from "@/components/marketing/CommunitySlideshow";
import RecapCarousel from "@/components/marketing/RecapCarousel";

const VENDOR_CATEGORIES = [
  "DJs",
  "Photographers",
  "Videographers",
  "Graphic Designers",
  "Chefs",
  "Caterers",
  "Security",
  "Influencers",
  "Sponsors",
  "Bartenders",
  "Decorators",
  "Production Agencies",
];

const ORGANIZER_STEPS = [
  { title: "Start a brief, or browse around first" },
  { title: "Request, review, and confirm venue quotes" },
  { title: "Find a vendor (optional)" },
  {
    title: "Manage your event",
    detail:
      "Venue booking, vendor roster, documents, and messages — all from one dashboard.",
  },
];

const VENUE_STEPS = [
  { title: "Submit your space with photos, price estimates, and availability" },
  { title: "Set requirements & bundle additional services" },
  { title: "Review and confirm booking requests" },
  { title: "Manage upcoming bookings" },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(circle at 15% 20%, color-mix(in srgb, var(--color-brass) 16%, transparent), transparent 55%), radial-gradient(circle at 85% 0%, color-mix(in srgb, var(--color-wine) 14%, transparent), transparent 50%)",
          }}
        />
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1 text-xs font-medium text-ink-soft">
            Now booking in San Francisco
          </span>
          <h1 className="mt-6 max-w-2xl font-display text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
            Every venue and every vendor your event needs, in one place.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
            Foundry is made to build community and connect event organizers
            with venues and the creatives needed to bring an event to life.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              className="rounded-full bg-wine px-6 py-3 text-center text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
            >
              Start an event brief
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full border border-line bg-paper px-6 py-3 text-center text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
            >
              List your venue or services
            </Link>
          </div>
        </div>
      </section>

      {/* Triangle pitch + community slideshow */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
              One platform, three sides of the room.
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
              Foundry connects the people who have space, the people planning
              the event, and the people who bring it to life.
            </p>
            <div className="mt-10">
              <TriangleDiagram />
            </div>
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
              Built for community gatherings.
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
              From recurring meetups to one-night pop-ups — the kind of
              events Foundry is designed to support.
            </p>
            <div className="mt-6">
              <CommunitySlideshow />
            </div>
          </div>
        </div>
      </section>

      {/* Audience sections */}
      <section
        id="organizers"
        className="scroll-mt-16 border-t border-line bg-paper-dim"
      >
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-brass-dark">
              For organizers
            </span>
            <h2 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
              Plan the whole event without leaving one dashboard.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              Create a brief, compare real venue availability, and send a
              structured booking request instead of a cold email. Once your
              venue is confirmed, post the vendor roles you still need and
              review proposals side by side.
            </p>
          </div>
          <ul className="space-y-3">
            {ORGANIZER_STEPS.map((step, i) => (
              <li
                key={step.title}
                className="flex items-start gap-3 rounded-xl border border-line bg-paper px-4 py-3 text-sm text-ink"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-wine/10 text-xs font-semibold text-wine">
                  {i + 1}
                </span>
                <div>
                  <p>{step.title}</p>
                  {step.detail && (
                    <p className="mt-1 text-xs text-ink-soft">{step.detail}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="venues" className="scroll-mt-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
          <ul className="order-2 space-y-3 lg:order-1">
            {VENUE_STEPS.map((step, i) => (
              <li
                key={step.title}
                className="flex items-start gap-3 rounded-xl border border-line bg-paper px-4 py-3 text-sm text-ink"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brass/15 text-xs font-semibold text-brass-dark">
                  {i + 1}
                </span>
                <p>{step.title}</p>
              </li>
            ))}
          </ul>
          <div className="order-1 lg:order-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-brass-dark">
              For venue operators
            </span>
            <h2 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
              Turn off-hours into booked hours.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              List your space once, define exactly when it&apos;s available,
              and let structured booking requests replace the back-and-forth.
              Your exact address stays private until a booking is underway.
            </p>
          </div>
        </div>
      </section>

      <section
        id="vendors"
        className="scroll-mt-16 border-t border-line bg-paper-dim"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-brass-dark">
              For vendors
            </span>
            <h2 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
              Find gigs tied to real, confirmed events.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              Build a profile, list what you offer, and submit proposals on
              event needs that match your category — instead of chasing
              referrals.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {VENDOR_CATEGORIES.map((category) => (
              <span
                key={category}
                className="rounded-full border border-line bg-paper px-3.5 py-1.5 text-sm text-ink-soft"
              >
                {category}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Event recaps */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
            Event recaps
          </h2>
          <p className="mt-2 max-w-xl text-sm text-ink-soft">
            A look at Foundry from each side of the marketplace.
          </p>
        </div>
        <RecapCarousel />
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-ink px-8 py-14 text-center sm:px-16">
          <h2 className="font-display text-2xl font-semibold text-paper sm:text-3xl">
            Foundry is opening in San Francisco.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-paper/70">
            Create an account to start an event brief, list a venue, or offer
            your services — free during early access.
          </p>
          <Link
            href="/sign-up"
            className="mt-7 inline-block rounded-full bg-brass px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-brass-dark hover:text-paper"
          >
            Create your account
          </Link>
        </div>
      </section>
    </>
  );
}
