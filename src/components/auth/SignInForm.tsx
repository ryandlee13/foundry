"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/components/providers/AuthProvider";

const signInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  // Not verified against anything — see src/lib/auth/storage.ts.
  password: z.string().min(1, "Enter your password"),
});

type SignInValues = z.infer<typeof signInSchema>;

export default function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const nextPath = searchParams.get("next");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: SignInValues) {
    setFormError(null);
    try {
      signIn(values.email);
      router.push(nextPath ?? "/dashboard");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-paper p-8 shadow-sm">
      <h1 className="font-display text-2xl font-semibold text-ink">Sign in</h1>
      <p className="mt-1 text-sm text-ink-soft">
        One account works across organizer, venue, and vendor roles.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
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
            autoComplete="current-password"
            placeholder="••••••••"
            {...register("password")}
            className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
          />
          {errors.password && <p className="mt-1 text-xs text-wine">{errors.password.message}</p>}
        </div>

        {formError && (
          <p className="rounded-lg bg-wine/10 px-3.5 py-2.5 text-sm text-wine">{formError}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft disabled:cursor-not-allowed disabled:opacity-60"
        >
          Sign in
        </button>
      </form>

      <p className="mt-5 rounded-lg bg-paper-dim px-3.5 py-2.5 text-xs leading-relaxed text-ink-soft">
        This is a browser-local prototype — signing in just looks up the
        account by email in this browser, the password isn&apos;t checked
        against anything real yet.
      </p>

      <p className="mt-6 text-center text-sm text-ink-soft">
        New to Foundry?{" "}
        <Link
          href={nextPath ? `/sign-up?next=${encodeURIComponent(nextPath)}` : "/sign-up"}
          className="font-medium text-ink hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
