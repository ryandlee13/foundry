import type { Metadata } from "next";
import VendorFinancesPage from "@/components/finance/VendorFinancesPage";

export const metadata: Metadata = {
  title: "Finances — Foundry",
};

export default function VendorFinancesRoute() {
  return <VendorFinancesPage />;
}
