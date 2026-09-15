import Link from "next/link";
import {
  ChefIcon,
  DjIcon,
  FloristIcon,
  PhotoBoothIcon,
  PhotographerIcon,
  VideographerIcon,
} from "./HomeSectionIcons";
import type { VendorSkillSlug } from "@/lib/types/vendors";

/**
 * Vendor-side entry points, deliberately lighter than Featured Spaces — flat
 * tiles on the dim background rather than image cards, so the venue row stays
 * the visual anchor of the page.
 *
 * Each tile deep-links into the planner vendor search with the category
 * preselected (`?category=<slug>`, parsed by searchParamsToBrief in
 * src/lib/vendors/vendorSearch.ts). The slugs are real VendorSkillSlug values,
 * so an unknown one is a type error rather than a link that silently lands on
 * an unfiltered page.
 *
 * Labels are the plural planner-facing phrasing; `getSkillName()` returns the
 * singular profile-facing name ("Chef" vs "Private Chefs"), which is why these
 * are written out rather than derived.
 */
const CATEGORIES: {
  slug: VendorSkillSlug;
  label: string;
  blurb: string;
  Icon: (props: { className?: string }) => React.JSX.Element;
}[] = [
  { slug: "dj", label: "DJs", blurb: "Sets and sound for the night", Icon: DjIcon },
  {
    slug: "photographer",
    label: "Photographers",
    blurb: "Coverage you can share after",
    Icon: PhotographerIcon,
  },
  { slug: "florist", label: "Florists", blurb: "Arrangements and installs", Icon: FloristIcon },
  { slug: "chef", label: "Private Chefs", blurb: "Menus cooked on site", Icon: ChefIcon },
  {
    slug: "photo_booth",
    label: "Photo Booths",
    blurb: "Props, prints, and an attendant",
    Icon: PhotoBoothIcon,
  },
  {
    slug: "videographer",
    label: "Videographers",
    blurb: "Films and highlight reels",
    Icon: VideographerIcon,
  },
];

export default function VendorCategoriesSection() {
  return (
    <section className="border-t border-line bg-paper-dim">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
              Popular vendor categories
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Already have your space? Start with the people who make the night work.
            </p>
          </div>
          <Link
            href="/vendors"
            className="text-sm font-semibold text-wine transition-colors hover:text-wine-soft"
          >
            See all vendors →
          </Link>
        </div>

        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map(({ slug, label, blurb, Icon }) => (
            <li key={slug}>
              <Link
                href={`/vendors?category=${slug}`}
                className="flex h-full flex-col items-center rounded-2xl border border-line bg-paper px-4 py-6 text-center transition-all hover:-translate-y-0.5 hover:border-brass hover:shadow-md"
              >
                <Icon className="h-8 w-8 text-wine" />
                <span className="mt-4 font-display text-sm font-semibold text-ink">{label}</span>
                <span className="mt-1 text-xs leading-snug text-ink-soft">{blurb}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
