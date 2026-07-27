import type { Metadata } from "next";
import VendorOnboardingFlow from "@/components/vendor/VendorOnboardingFlow";

export const metadata: Metadata = {
  title: "Vendor onboarding — Foundry",
};

export default function VendorOnboardingPage() {
  return <VendorOnboardingFlow />;
}
