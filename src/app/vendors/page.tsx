import type { Metadata } from "next";
import { Suspense } from "react";
import LoadingState from "@/components/ui/LoadingState";
import VendorsPageClient from "./VendorsPageClient";

export const metadata: Metadata = {
  title: "Find Vendors — Foundry",
  description:
    "Search Foundry vendors for your event — DJs, photographers, florists, caterers, and more. No venue booking required.",
};

export default function VendorsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading vendors…" />}>
      <VendorsPageClient />
    </Suspense>
  );
}
