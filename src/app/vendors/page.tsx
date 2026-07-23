import type { Metadata } from "next";
import ComingSoon from "@/components/marketing/ComingSoon";

export const metadata: Metadata = {
  title: "For Vendors — Foundry",
};

export default function VendorsPage() {
  return (
    <ComingSoon
      eyebrow="Coming soon"
      title="The vendor marketplace is on its way."
      description="Building your profile, browsing open event needs, and submitting proposals isn't open yet — we're finishing the vendor dashboard first. Check back soon."
    />
  );
}
