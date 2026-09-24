import type { Metadata } from "next";
import OrganizerVendorRequestsPage from "@/components/vendor/OrganizerVendorRequestsPage";

export const metadata: Metadata = {
  title: "Vendor requests — Foundry",
};

export default async function VendorRequestsRoute({
  params,
  searchParams,
}: {
  params: Promise<{ bookingId: string }>;
  /** `?post=1` opens the post-a-request form on arrival — see the celebration dialog in MessageThreadView. */
  searchParams: Promise<{ post?: string }>;
}) {
  const { bookingId } = await params;
  const { post } = await searchParams;
  return <OrganizerVendorRequestsPage bookingId={bookingId} autoOpenBuilder={post === "1"} />;
}
