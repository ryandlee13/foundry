import type { Metadata } from "next";
import OrganizerProposalsPage from "@/components/vendor/OrganizerProposalsPage";

export const metadata: Metadata = {
  title: "Review proposals — Foundry",
};

/**
 * Proposals on a request that isn't attached to an event yet. Same component
 * as the booking-anchored route, with a null bookingId so its back-link
 * resolves to the standalone page rather than /bookings/null/vendors.
 */
export default async function UnassignedProposalsRoute({
  params,
}: {
  params: Promise<{ needId: string }>;
}) {
  const { needId } = await params;
  return <OrganizerProposalsPage bookingId={null} needId={needId} />;
}
