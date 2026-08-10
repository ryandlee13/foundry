"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import VenueAccountPopup from "./VenueAccountPopup";
import ResetPrototypeDataButton from "./ResetPrototypeDataButton";
import { useAuth } from "@/components/providers/AuthProvider";

type NavLink =
  | { key: string; label: string; href: string }
  | { key: string; label: string; action: "venue-popup" };

const NAV_LINKS: NavLink[] = [
  { key: "planners", label: "For Planners", href: "/spaces" },
  { key: "venues", label: "For Venues", action: "venue-popup" },
  { key: "vendors", label: "For Vendors", href: "/vendors" },
  { key: "about", label: "About", href: "/about" },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [venuePopupOpen, setVenuePopupOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, signOut } = useAuth();

  function openVenuePopup() {
    setMenuOpen(false);
    if (!isLoading && user) {
      router.push("/dashboard/venue");
      return;
    }
    setVenuePopupOpen(true);
  }

  function handleSignOut() {
    signOut();
    setMenuOpen(false);
    router.push("/");
  }

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

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => {
            if ("action" in link) {
              return (
                <button
                  key={link.key}
                  type="button"
                  onClick={openVenuePopup}
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

        <div className="hidden items-center gap-3 md:flex">
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
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink md:hidden"
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
        <div className="border-t border-line bg-paper px-4 pb-6 pt-2 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => {
              if ("action" in link) {
                return (
                  <button
                    key={link.key}
                    type="button"
                    onClick={openVenuePopup}
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
          <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
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

      <VenueAccountPopup open={venuePopupOpen} onClose={() => setVenuePopupOpen(false)} />
    </header>
  );
}
