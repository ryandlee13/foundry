import type { Metadata } from "next";
import { Suspense } from "react";
import SignUpForm from "@/components/auth/SignUpForm";

export const metadata: Metadata = {
  title: "Create an account — Foundry",
};

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}
