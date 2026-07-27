import type { Metadata } from "next";
import OrganizerVendorRequestsPage from "@/components/vendor/OrganizerVendorRequestsPage";

export const metadata: Metadata = {
  title: "Vendor requests — Foundry",
};

export default async function VendorRequestsRoute({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  return <OrganizerVendorRequestsPage bookingId={bookingId} />;
}
