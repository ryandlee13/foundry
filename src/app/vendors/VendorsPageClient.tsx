"use client";

import { useEffect, useMemo, useState } from "react";
import { getPublishedVendorProfiles } from "@/lib/vendors/profiles";
import { VENDOR_SKILLS } from "@/lib/vendors/skills";
import VendorProfileCard from "@/components/vendor/VendorProfileCard";
import EmptyState from "@/components/ui/EmptyState";
import type { VendorProfile, VendorSkillSlug } from "@/lib/types/vendors";

export default function VendorsPageClient() {
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [skillFilter, setSkillFilter] = useState<VendorSkillSlug | "all">("all");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Published vendor profiles only exist in localStorage — see profiles.ts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVendors(getPublishedVendorProfiles());
  }, []);

  const results = useMemo(() => {
    return vendors.filter((vendor) => {
      if (skillFilter !== "all" && !vendor.skills.includes(skillFilter)) return false;
      if (remoteOnly && !vendor.location.remoteAvailable) return false;
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const haystack = `${vendor.displayName} ${vendor.location.homeCity} ${vendor.professionalDescription}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [vendors, skillFilter, remoteOnly, search]);

  return (
    <div className="mx-auto max-w-[1680px] px-4 py-10 sm:px-6 lg:px-10 xl:px-16">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
          Find vendors and creative talent
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Browse published Foundry vendor profiles — DJs, photographers, caterers, and more, serving San
          Francisco events.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or city"
          className="w-full max-w-xs rounded-lg border border-line bg-paper px-3.5 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
        />
        <select
          value={skillFilter}
          onChange={(e) => setSkillFilter(e.target.value as VendorSkillSlug | "all")}
          className="rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
        >
          <option value="all">All skills</option>
          {VENDOR_SKILLS.map((skill) => (
            <option key={skill.slug} value={skill.slug}>
              {skill.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={remoteOnly}
            onChange={(e) => setRemoteOnly(e.target.checked)}
            className="h-4 w-4 rounded border-line text-wine focus:ring-1 focus:ring-brass"
          />
          Remote available
        </label>
        <span className="text-sm text-ink-soft">
          {results.length} vendor{results.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-6">
        {results.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 2xl:grid-cols-3">
            {results.map((vendor) => (
              <VendorProfileCard key={vendor.id} vendor={vendor} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={vendors.length === 0 ? "No vendors published yet" : "No vendors match those filters"}
            description={
              vendors.length === 0
                ? "Vendor profiles appear here once they're submitted and approved."
                : "Try a different skill, or clear the search."
            }
          />
        )}
      </div>
    </div>
  );
}
