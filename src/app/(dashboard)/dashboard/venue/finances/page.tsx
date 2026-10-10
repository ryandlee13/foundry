import type { Metadata } from "next";
import VenueFinancesPage from "@/components/finance/VenueFinancesPage";

export const metadata: Metadata = {
  title: "Finances — Foundry",
};

export default function VenueFinancesRoute() {
  return <VenueFinancesPage />;
}
