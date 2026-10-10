import type { Metadata } from "next";
import EventHubPage from "@/components/events/EventHubPage";

export const metadata: Metadata = {
  title: "Event — Foundry",
};

/**
 * One event, end to end. `docs/ROUTES.md` listed this as a future
 * `/organizer/events/[id]`; the param is a **booking** id because a confirmed
 * `Booking` is what stands in for an event in this prototype (no events table
 * — see `docs/DATABASE.md`).
 */
export default async function EventHubRoute({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  return <EventHubPage bookingId={bookingId} />;
}
