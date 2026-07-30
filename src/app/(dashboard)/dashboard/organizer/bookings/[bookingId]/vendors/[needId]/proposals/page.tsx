import type { Metadata } from "next";
import OrganizerProposalsPage from "@/components/vendor/OrganizerProposalsPage";

export const metadata: Metadata = {
  title: "Review proposals — Foundry",
};

export default async function ProposalsRoute({
  params,
}: {
  params: Promise<{ bookingId: string; needId: string }>;
}) {
  const { bookingId, needId } = await params;
  return <OrganizerProposalsPage bookingId={bookingId} needId={needId} />;
}
