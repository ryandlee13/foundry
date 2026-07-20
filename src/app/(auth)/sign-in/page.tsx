import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in — Foundry",
};

export default function SignInPage() {
  return (
    <div className="rounded-2xl border border-line bg-paper p-8 shadow-sm">
      <h1 className="font-display text-2xl font-semibold text-ink">
        Sign in
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        One account works across organizer, venue, and vendor roles.
      </p>

      <form className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-ink"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-ink"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
          />
        </div>
        <button
          type="submit"
          disabled
          className="w-full cursor-not-allowed rounded-full bg-wine/50 px-5 py-2.5 text-sm font-semibold text-paper"
        >
          Sign in
        </button>
      </form>

      <p className="mt-5 rounded-lg bg-paper-dim px-3.5 py-2.5 text-xs leading-relaxed text-ink-soft">
        Authentication isn&apos;t connected yet — this page is a placeholder
        for the sign-in flow.
      </p>

      <p className="mt-6 text-center text-sm text-ink-soft">
        New to Foundry?{" "}
        <Link href="/sign-up" className="font-medium text-ink hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
