import type { Metadata } from "next";
import ComingSoon from "@/components/marketing/ComingSoon";

export const metadata: Metadata = {
  title: "List Your Venue — Foundry",
};

export default function ListYourVenuePage() {
  return (
    <ComingSoon
      eyebrow="Coming soon"
      title="Venue listing is on its way."
      description="Submitting and managing your space isn't open yet — we're finishing the venue operator dashboard first. Check back soon."
    />
  );
}
