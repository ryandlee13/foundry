import Link from "next/link";
import { VENDOR_SKILLS } from "@/lib/vendors/skills";
import type { VendorProfile } from "@/lib/types/vendors";

export default function VendorProfileCard({ vendor }: { vendor: VendorProfile }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-line bg-paper transition-all hover:-translate-y-0.5 hover:border-brass hover:shadow-lg">
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {vendor.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- local data URL, not a remote image domain
          <img src={vendor.coverImage} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brass/25 to-wine/15">
            <span className="font-display text-3xl text-ink-soft">{vendor.displayName.charAt(0)}</span>
          </div>
        )}
        {vendor.location.remoteAvailable && (
          <span className="absolute left-3 top-3 rounded-full bg-paper/90 px-2.5 py-1 text-[11px] font-semibold text-ink backdrop-blur-sm">
            Remote available
          </span>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-display text-lg font-semibold text-ink">{vendor.displayName}</h3>
            <p className="text-xs text-ink-soft">{vendor.location.homeCity || "San Francisco"}</p>
          </div>
          <span className="shrink-0 text-xs font-medium text-ink-soft">
            {vendor.averageRating ? `★ ${vendor.averageRating}` : "New to Foundry"}
          </span>
        </div>

        <p className="mt-2 line-clamp-2 text-sm leading-snug text-ink-soft">{vendor.professionalDescription}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {vendor.skills.slice(0, 4).map((skill) => (
            <span key={skill} className="rounded-full border border-line bg-paper px-2.5 py-1 text-xs text-ink-soft">
              {VENDOR_SKILLS.find((s) => s.slug === skill)?.name}
            </span>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-end border-t border-line pt-3 text-right text-xs font-medium text-ink-soft">
          {vendor.completedEventCount > 0
            ? `${vendor.completedEventCount} Foundry event${vendor.completedEventCount === 1 ? "" : "s"}`
            : "New to Foundry"}
        </div>
      </div>

      <Link href={`/vendors/${vendor.slug}`} className="absolute inset-0" aria-label={`View ${vendor.displayName}`} />
    </article>
  );
}
