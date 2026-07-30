import Link from "next/link";
import type { Metadata } from "next";
import VendorProfileLookup from "@/components/vendor/VendorProfileLookup";

export const metadata: Metadata = {
  title: "Vendor profile — Foundry",
};

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/vendors" className="text-sm font-medium text-ink-soft hover:text-ink">
        ← Back to vendors
      </Link>

      <VendorProfileLookup slug={slug} />
    </div>
  );
}
