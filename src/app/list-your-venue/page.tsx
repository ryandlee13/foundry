import type { Metadata } from "next";
import VenueSubmissionForm from "@/components/spaces/VenueSubmissionForm";

export const metadata: Metadata = {
  title: "List Your Venue — Foundry",
};

export default function ListYourVenuePage() {
  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <VenueSubmissionForm />
    </div>
  );
}
