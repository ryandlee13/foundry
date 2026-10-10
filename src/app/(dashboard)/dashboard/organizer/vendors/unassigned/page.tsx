import type { Metadata } from "next";
import UnassignedVendorsPage from "@/components/vendor/UnassignedVendorsPage";

export const metadata: Metadata = {
  title: "Vendor lobby — Foundry",
};

export default async function UnassignedVendorsRoute({
  searchParams,
}: {
  /** `?post=1` opens the hire-a-vendor form on arrival — set by the homepage hero's "Create a posting" flow. */
  searchParams: Promise<{ post?: string }>;
}) {
  const { post } = await searchParams;
  return <UnassignedVendorsPage autoOpenHire={post === "1"} />;
}
