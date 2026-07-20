import type { Metadata } from "next";
import { Suspense } from "react";
import LoadingState from "@/components/ui/LoadingState";
import SpacesPageClient from "./SpacesPageClient";

export const metadata: Metadata = {
  title: "Discover Spaces — Foundry",
  description:
    "Browse San Francisco event spaces by location, distance, availability, capacity, price, and amenities.",
};

export default function SpacesPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading spaces…" />}>
      <SpacesPageClient />
    </Suspense>
  );
}
