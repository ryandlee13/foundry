import type { Metadata } from "next";
import GigDetailPage from "@/components/vendor/GigDetailPage";

export const metadata: Metadata = {
  title: "Event opportunity — Foundry",
};

export default async function VendorGigDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GigDetailPage needId={id} />;
}
