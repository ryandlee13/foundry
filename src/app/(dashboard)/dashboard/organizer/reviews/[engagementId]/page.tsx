import type { Metadata } from "next";
import OrganizerReviewForm from "@/components/vendor/OrganizerReviewForm";

export const metadata: Metadata = {
  title: "Leave a review — Foundry",
};

export default async function OrganizerReviewRoute({
  params,
}: {
  params: Promise<{ engagementId: string }>;
}) {
  const { engagementId } = await params;
  return <OrganizerReviewForm engagementId={engagementId} />;
}
