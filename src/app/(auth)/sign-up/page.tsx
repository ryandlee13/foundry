import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create an account — Foundry",
};

const ROLE_OPTIONS = [
  { value: "organizer", label: "Organizer", hint: "Plan events" },
  { value: "venue_operator", label: "Venue operator", hint: "List a space" },
  { value: "vendor", label: "Vendor", hint: "Offer services" },
];

export default function SignUpPage() {
  return (
    <div className="rounded-2xl border border-line bg-paper p-8 shadow-sm">
      <h1 className="font-display text-2xl font-semibold text-ink">
        Create your account
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        You can add more than one role to the same account later.
      </p>

      <form className="mt-6 space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-ink">
            Full name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Jordan Rivera"
            className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
          />
        </div>
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
            autoComplete="new-password"
            placeholder="••••••••"
            className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
          />
        </div>

        <fieldset>
          <legend className="block text-sm font-medium text-ink">
            I&apos;m signing up as a…
          </legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {ROLE_OPTIONS.map((role, i) => (
              <label
                key={role.value}
                className="flex cursor-pointer flex-col items-center gap-0.5 rounded-lg border border-line px-2 py-3 text-center has-[:checked]:border-brass has-[:checked]:bg-brass/10"
              >
                <input
                  type="radio"
                  name="role"
                  value={role.value}
                  defaultChecked={i === 0}
                  className="sr-only"
                />
                <span className="text-xs font-semibold text-ink">
                  {role.label}
                </span>
                <span className="text-[11px] text-ink-soft">{role.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled
          className="w-full cursor-not-allowed rounded-full bg-wine/50 px-5 py-2.5 text-sm font-semibold text-paper"
        >
          Create account
        </button>
      </form>

      <p className="mt-5 rounded-lg bg-paper-dim px-3.5 py-2.5 text-xs leading-relaxed text-ink-soft">
        Account creation isn&apos;t connected yet — this page is a
        placeholder for the sign-up flow.
      </p>

      <p className="mt-6 text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-ink hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
