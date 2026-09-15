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
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <HeroBackdrop />
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1fr_24rem] lg:items-center lg:gap-16 lg:px-8">
          <div>
            <h1 className="max-w-2xl font-display text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
              Every venue and every vendor your event needs, in one place.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
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
