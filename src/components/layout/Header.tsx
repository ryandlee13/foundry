"use client";

import Link from "next/link";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/#organizers", label: "For Organizers" },
  { href: "/#venues", label: "For Venues" },
  { href: "/#vendors", label: "For Vendors" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

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
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
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
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-base font-medium text-ink-soft hover:bg-paper-dim hover:text-ink"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
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
          </div>
        </div>
      )}
    </header>
  );
}
