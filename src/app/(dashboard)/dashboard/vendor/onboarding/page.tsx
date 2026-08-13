import type { Metadata } from "next";
import { Suspense } from "react";
import VendorOnboardingFlow from "@/components/vendor/VendorOnboardingFlow";
import LoadingState from "@/components/ui/LoadingState";

export const metadata: Metadata = {
  title: "Vendor onboarding — Foundry",
};

export default function VendorOnboardingPage() {
  // The flow reads ?step= to deep-link "List another service" straight to
  // services, and useSearchParams needs a Suspense boundary above it.
  return (
    <Suspense fallback={<LoadingState label="Setting up your vendor profile…" />}>
      <VendorOnboardingFlow />
    </Suspense>
  );
}
