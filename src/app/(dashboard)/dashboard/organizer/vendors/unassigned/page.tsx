import type { Metadata } from "next";
import UnassignedVendorsPage from "@/components/vendor/UnassignedVendorsPage";

export const metadata: Metadata = {
  title: "Vendors without an event — Foundry",
};

export default function UnassignedVendorsRoute() {
  return <UnassignedVendorsPage />;
}
