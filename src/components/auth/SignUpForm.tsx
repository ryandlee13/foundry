"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/components/providers/AuthProvider";
import type { AppRole } from "@/lib/types/roles";

const ROLE_OPTIONS: { value: AppRole; label: string; hint: string }[] = [
  { value: "organizer", label: "Organizer", hint: "Plan events" },
  { value: "venue_operator", label: "Venue operator", hint: "List a space" },
  { value: "vendor", label: "Vendor", hint: "Offer services" },
];

const signUpSchema = z.object({
  name: z.string().min(1, "Enter your name"),
  email: z.string().email("Enter a valid email"),
  // Not persisted anywhere — see src/lib/auth/storage.ts. Still required
  // here so the form behaves like a real sign-up.
  password: z.string().min(6, "At least 6 characters"),
  role: z.enum(["organizer", "venue_operator", "vendor"]),
});

type SignUpValues = z.infer<typeof signUpSchema>;

type SignUpRole = "organizer" | "venue_operator" | "vendor";

function defaultRole(param: string | null): SignUpRole {
  return param === "venue_operator" || param === "vendor" ? param : "organizer";
}

export default function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const nextPath = searchParams.get("next");
  const initialRole = defaultRole(searchParams.get("role"));

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "", role: initialRole },
  });

  function onSubmit(values: SignUpValues) {
    setFormError(null);
    try {
      const account = signUp({ name: values.name, email: values.email, role: values.role });
      router.push(
        nextPath ?? (account.roles.includes("venue_operator") ? "/dashboard/venue" : "/dashboard")
      );
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-paper p-8 shadow-sm">
      <h1 className="font-display text-2xl font-semibold text-ink">
        Create your account
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        You can add more than one role to the same account later.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-ink">
            Full name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Jordan Rivera"
            {...register("name")}
            className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
          />
          {errors.name && <p className="mt-1 text-xs text-wine">{errors.name.message}</p>}
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-ink">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register("email")}
            className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
          />
          {errors.email && <p className="mt-1 text-xs text-wine">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-ink">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            {...register("password")}
            className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
          />
          {errors.password && <p className="mt-1 text-xs text-wine">{errors.password.message}</p>}
        </div>

        <fieldset>
          <legend className="block text-sm font-medium text-ink">
            I&apos;m signing up as a…
          </legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {ROLE_OPTIONS.map((role) => (
              <label
                key={role.value}
                className="flex cursor-pointer flex-col items-center gap-0.5 rounded-lg border border-line px-2 py-3 text-center has-[:checked]:border-brass has-[:checked]:bg-brass/10"
              >
                <input
                  type="radio"
                  value={role.value}
                  {...register("role")}
                  defaultChecked={role.value === initialRole}
                  className="sr-only"
                />
                <span className="text-xs font-semibold text-ink">{role.label}</span>
                <span className="text-[11px] text-ink-soft">{role.hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {formError && (
          <p className="rounded-lg bg-wine/10 px-3.5 py-2.5 text-sm text-wine">{formError}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft disabled:cursor-not-allowed disabled:opacity-60"
        >
          Create account
        </button>
      </form>

      <p className="mt-5 rounded-lg bg-paper-dim px-3.5 py-2.5 text-xs leading-relaxed text-ink-soft">
        This is a browser-local prototype account — nothing is sent to a
        server, and it won&apos;t be there on another device or browser.
      </p>

      <p className="mt-6 text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <Link
          href={nextPath ? `/sign-in?next=${encodeURIComponent(nextPath)}` : "/sign-in"}
          className="font-medium text-ink hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
