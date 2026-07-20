import type { Metadata } from "next";
import ComingSoon from "@/components/marketing/ComingSoon";

export const metadata: Metadata = {
  title: "About — Foundry",
};

export default function AboutPage() {
  return (
    <ComingSoon
      eyebrow="Coming soon"
      title="Our story is still being written."
      description="We're putting together the full About page. In the meantime, the homepage has the short version of what we're building."
    />
  );
}
