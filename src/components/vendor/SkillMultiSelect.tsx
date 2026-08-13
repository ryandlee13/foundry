"use client";

import { useEffect, useRef, useState } from "react";
import { getSkillName, searchSkills } from "@/lib/vendors/skills";
import type { VendorSkillSlug } from "@/lib/types/vendors";

/**
 * Type-ahead picker for the 23-skill catalog. Replaces a 23-checkbox grid,
 * which made the step read as a wall and buried the fact that most vendors
 * only pick one or two. Selected skills render as their own service cards
 * below, so this control only handles adding/removing.
 */
export default function SkillMultiSelect({
  selected,
  onAdd,
  onRemove,
}: {
  selected: VendorSkillSlug[];
  onAdd: (slug: VendorSkillSlug) => void;
  onRemove: (slug: VendorSkillSlug) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const matches = searchSkills(query, selected);

  function handleAdd(slug: VendorSkillSlug) {
    onAdd(slug);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && matches.length > 0) {
            event.preventDefault();
            handleAdd(matches[0].slug);
          }
          if (event.key === "Escape") setOpen(false);
        }}
        placeholder="Search services — e.g. photographer, catering, lighting"
        aria-label="Search services"
        role="combobox"
        aria-expanded={open}
        aria-controls="skill-options"
        aria-autocomplete="list"
        className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
      />

      {open && (
        <div
          id="skill-options"
          role="listbox"
          className="absolute z-20 mt-1.5 max-h-64 w-full overflow-y-auto rounded-lg border border-line bg-paper p-1.5 shadow-lg"
        >
          {matches.length === 0 ? (
            <p className="px-2.5 py-2 text-sm text-ink-soft">
              {selected.length > 0 && !query ? "You've added every service." : "No services match that search."}
            </p>
          ) : (
            matches.map((skill) => (
              <button
                key={skill.slug}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => handleAdd(skill.slug)}
                className="block w-full rounded-md px-2.5 py-2 text-left transition-colors hover:bg-paper-dim"
              >
                <span className="block text-sm font-medium text-ink">{skill.name}</span>
                <span className="block text-xs text-ink-soft">{skill.description}</span>
              </button>
            ))
          )}
        </div>
      )}

      {selected.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {selected.map((slug) => (
            <li key={slug}>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brass/15 py-1 pl-3 pr-1.5 text-sm font-semibold text-brass-dark">
                {getSkillName(slug)}
                <button
                  type="button"
                  onClick={() => onRemove(slug)}
                  aria-label={`Remove ${getSkillName(slug)}`}
                  className="flex h-5 w-5 items-center justify-center rounded-full transition-colors hover:bg-brass/30"
                >
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  </svg>
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
