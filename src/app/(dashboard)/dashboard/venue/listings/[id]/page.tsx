import type { Metadata } from "next";
import VenueListingManager from "@/components/spaces/VenueListingManager";

export const metadata: Metadata = {
  title: "Edit listing — Foundry",
};

export default async function VenueListingEditRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <VenueListingManager venueId={id} />
    </div>
  );
}
