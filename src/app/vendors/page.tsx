import type { Metadata } from "next";
import { Suspense } from "react";
import LoadingState from "@/components/ui/LoadingState";
import VendorsPageClient from "./VendorsPageClient";

export const metadata: Metadata = {
  title: "For Vendors — Foundry",
  description: "Browse published Foundry vendor profiles — DJs, photographers, caterers, and more.",
};

export default function VendorsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading vendors…" />}>
      <VendorsPageClient />
    </Suspense>
  );
}
