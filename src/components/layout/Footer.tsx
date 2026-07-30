import Link from "next/link";

const FOOTER_COLUMNS: Array<{
  heading: string;
  links: Array<{ href: string; label: string }>;
}> = [
  {
    heading: "Organizers",
    links: [
      { href: "/sign-up", label: "Create an event brief" },
      { href: "/sign-in", label: "Sign in" },
    ],
  },
  {
    heading: "Venue operators",
    links: [
      { href: "/sign-up?role=venue_operator&next=%2Flist-your-venue", label: "List your space" },
      { href: "/sign-in", label: "Sign in" },
    ],
  },
  {
    heading: "Vendors",
    links: [
      { href: "/sign-up", label: "Offer your services" },
      { href: "/sign-in", label: "Sign in" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-line bg-paper-dim">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <span className="font-display text-lg font-semibold text-ink">
              Foundry
            </span>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-soft">
              A marketplace for venues and event talent, starting in San
              Francisco.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1 text-xs font-medium text-ink-soft">
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                <path d="M10 1.5a6 6 0 0 0-6 6c0 4.5 6 11 6 11s6-6.5 6-11a6 6 0 0 0-6-6Zm0 8.25a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5Z" />
              </svg>
              San Francisco, CA
            </span>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.heading}>
              <h3 className="text-sm font-semibold text-ink">
                {column.heading}
              </h3>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-ink-soft transition-colors hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-line pt-6 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Foundry. All rights reserved.</p>
          <p>Foundry is in early access. Features and availability may change.</p>
        </div>
      </div>
    </footer>
  );
}
