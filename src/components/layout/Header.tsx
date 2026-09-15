"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import IntentDialog, { type IntentOption } from "@/components/marketing/IntentDialog";
import ResetPrototypeDataButton from "./ResetPrototypeDataButton";
import { useAuth } from "@/components/providers/AuthProvider";

type SupplyAction = "list-venue" | "join-vendor";

type NavLink =
  | { key: string; label: string; href: string }
  | { key: string; label: string; action: SupplyAction };

/**
 * Discovery first, then the two supply-side onboarding actions.
 *
 * Listing a venue and joining as a vendor used to sit in the hero next to
 * "Browse Spaces", which framed them as things a planner might click while
 * searching. They aren't searches — they're how the other two sides of the
 * marketplace sign up — so they belong in persistent navigation, reachable
 * from every page rather than only the homepage.
 */
const NAV_LINKS: NavLink[] = [
  { key: "find-venue", label: "Find a Venue", href: "/spaces" },
  { key: "find-vendors", label: "Find Vendors", href: "/vendors" },
  { key: "list-venue", label: "List Your Venue", action: "list-venue" },
  { key: "join-vendor", label: "Join as a Vendor", action: "join-vendor" },
  { key: "about", label: "About", href: "/about" },
];

/** Where each supply-side action lands once the visitor has an account. */
const SUPPLY_DESTINATIONS: Record<SupplyAction, { path: string; role: string; noun: string }> = {
  "list-venue": { path: "/list-your-venue", role: "venue_operator", noun: "list a space" },
  "join-vendor": { path: "/dashboard/vendor/onboarding", role: "vendor", noun: "offer your services" },
};

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Inside the dashboard the sidebar is the navigation — repeating the
 * marketing links above it just competes with it. The logo and account
 * controls stay so there's always a way back out to the site.
 */
function isDashboardPath(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<SupplyAction | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, signOut } = useAuth();
  const showMarketingNav = !isDashboardPath(pathname);

  function handleSupplyAction(action: SupplyAction) {
    setMenuOpen(false);
    if (!isLoading && user) {
      router.push(SUPPLY_DESTINATIONS[action].path);
      return;
    }
    // Signed out: ask whether they already have an account before dropping
    // them into a flow that needs one.
    setPendingAction(action);
  }

  function handleSignOut() {
    signOut();
    setMenuOpen(false);
    router.push("/");
  }

  const accountOptions = (action: SupplyAction): IntentOption[] => {
    const { path, role } = SUPPLY_DESTINATIONS[action];
    return [
      {
        key: "sign-in",
        label: "I already have an account",
        description: "Sign in and pick up where you left off.",
        href: `/sign-in?next=${encodeURIComponent(path)}`,
        emphasis: true,
      },
      {
        key: "sign-up",
        label: "Create a profile",
        description: "Takes a minute — one account covers every role.",
        href: `/sign-up?role=${role}&next=${encodeURIComponent(path)}`,
      },
    ];
  };

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-tight text-ink"
          onClick={() => setMenuOpen(false)}
        >
          Foundry
        </Link>

        {showMarketingNav && (
          <nav className="hidden items-center gap-6 lg:flex">
            {NAV_LINKS.map((link) => {
              if ("action" in link) {
                return (
                  <button
                    key={link.key}
                    type="button"
                    onClick={() => handleSupplyAction(link.action)}
                    className="border-b-2 border-transparent pb-1 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
                  >
                    {link.label}
                  </button>
                );
              }

              const active = isActivePath(pathname, link.href);
              return (
                <Link
                  key={link.key}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`border-b-2 pb-1 text-sm font-medium transition-colors ${
                    active
                      ? "border-wine text-ink"
                      : "border-transparent text-ink-soft hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="hidden items-center gap-3 lg:flex">
          <ResetPrototypeDataButton />
          {!isLoading && user ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
              >
                {user.name.split(" ")[0]}
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-line px-5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-full bg-wine px-5 py-2 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
              >
                Get started
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink lg:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75}>
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-line bg-paper px-4 pb-6 pt-2 lg:hidden">
          {showMarketingNav && (
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => {
                if ("action" in link) {
                  return (
                    <button
                      key={link.key}
                      type="button"
                      onClick={() => handleSupplyAction(link.action)}
                      className="rounded-lg px-3 py-2.5 text-left text-base font-medium text-ink-soft hover:bg-paper-dim hover:text-ink"
                    >
                      {link.label}
                    </button>
                  );
                }

                const active = isActivePath(pathname, link.href);
                return (
                  <Link
                    key={link.key}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-lg px-3 py-2.5 text-base font-medium ${
                      active
                        ? "bg-paper-dim text-ink"
                        : "text-ink-soft hover:bg-paper-dim hover:text-ink"
                    }`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          )}
          <div className={`flex flex-col gap-2 ${showMarketingNav ? "mt-4 border-t border-line pt-4" : ""}`}>
            <ResetPrototypeDataButton
              className="rounded-full border border-dashed border-line px-5 py-2.5 text-center text-sm font-semibold text-ink-soft"
              onConfirmed={() => setMenuOpen(false)}
            />
            {!isLoading && user ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-full border border-line px-5 py-2.5 text-center text-sm font-semibold text-ink"
                  onClick={() => setMenuOpen(false)}
                >
                  {user.name.split(" ")[0]}&apos;s dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-full bg-wine px-5 py-2.5 text-center text-sm font-semibold text-paper"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="rounded-full border border-line px-5 py-2.5 text-center text-sm font-semibold text-ink"
                  onClick={() => setMenuOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-full bg-wine px-5 py-2.5 text-center text-sm font-semibold text-paper"
                  onClick={() => setMenuOpen(false)}
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      <IntentDialog
        open={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        title="Do you already have a Foundry account?"
        description={
          pendingAction ? `You'll need one to ${SUPPLY_DESTINATIONS[pendingAction].noun}.` : undefined
        }
        options={pendingAction ? accountOptions(pendingAction) : []}
      />
    </header>
  );
}
