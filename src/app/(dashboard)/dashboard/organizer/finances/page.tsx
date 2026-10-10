import type { Metadata } from "next";
import OrganizerFinancesPage from "@/components/finance/OrganizerFinancesPage";

export const metadata: Metadata = {
  title: "Finances — Foundry",
};

export default function OrganizerFinancesRoute() {
  return <OrganizerFinancesPage />;
}
