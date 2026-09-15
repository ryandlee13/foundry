import Link from "next/link";
import HeroBackdrop from "@/components/marketing/HeroBackdrop";
import HeroDiscovery from "@/components/marketing/HeroDiscovery";
import ValuePropsSection from "@/components/marketing/ValuePropsSection";
import FeaturedSpacesSection from "@/components/marketing/FeaturedSpacesSection";
import VendorCategoriesSection from "@/components/marketing/VendorCategoriesSection";
import RecapCarousel from "@/components/marketing/RecapCarousel";

export default function Home() {
  return (
    <>
      {/*
        Hero. Wider than the max-w-6xl used by the sections below on purpose —
        the photography needs room, and at 1440px the headline and the search
        card still read as one composition instead of drifting to opposite
        edges of a large monitor.

        56/44 split: the headline is the counterweight to the card, so the
        text column gets the larger share while the card stays at its own
        fixed width rather than stretching to fill.
      */}
      <section className="relative overflow-hidden">
        <HeroBackdrop />
        <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[56fr_44fr] lg:items-center lg:gap-12">
          {/*
            Flush to the container's left edge rather than centered in its
            column. Centering it plus the old lg:px-12 pushed the headline
            ~59px inward, which on a wide monitor read as a band of dead space
            on the far left with the copy and the card bunched toward the
            middle. The card stays centered in its own column, so the gap
            between the two opens up by roughly the same amount.
          */}
          <div className="w-full max-w-[640px]">
            <h1 className="font-display text-4xl font-semibold leading-[1.07] tracking-tight text-paper drop-shadow-[0_1px_2px_rgba(20,16,14,0.35)] sm:text-5xl lg:text-[3.5rem] xl:text-[3.75rem]">
              Every venue and every vendor your event needs, in one place.
            </h1>
            <p className="mt-7 max-w-[34rem] text-lg leading-[1.5] text-paper/85 drop-shadow-[0_1px_2px_rgba(20,16,14,0.3)] lg:text-xl">
              Foundry is made to build community and connect event organizers
              with venues and the creatives needed to bring an event to life.
            </p>
          </div>

          <HeroDiscovery />
        </div>
      </section>

      <ValuePropsSection />
      <FeaturedSpacesSection />
      <VendorCategoriesSection />

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
