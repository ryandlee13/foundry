"use client";

import { useEffect, useId, useRef, useState } from "react";
import { getSkillName, searchSkills } from "@/lib/vendors/skills";
import type { VendorSkillSlug } from "@/lib/types/vendors";

/**
 * Single-select type-ahead over the vendor skill catalog, alphabetical with
 * "Other" pinned last (searchSkills handles both). The sibling of
 * EventTypeSelect, and deliberately the same interaction: 23 categories is
 * well past the point where scanning a <select> beats typing three letters.
 *
 * Distinct from SkillMultiSelect, which is the vendor-side picker for "what
 * do I offer" — that one is multi-select and shows per-skill descriptions.
 * This is the planner side: one category, one search.
 */
export default function VendorCategorySelect({
  value,
  onChange,
  id,
  placeholder = "Any category",
}: {
  value: VendorSkillSlug | null;
  onChange: (value: VendorSkillSlug | null) => void;
  id?: string;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const matches = searchSkills(query, []);
  // Open, the field shows what's being typed; closed, the current selection.
  const displayValue = open ? query : value ? getSkillName(value) : "";

  function select(next: VendorSkillSlug) {
    onChange(next);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        value={displayValue}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          // Typing over a selection clears it until something new is picked,
          // so "any category" stays reachable without a magic empty option.
          if (value) onChange(null);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && matches.length > 0) {
            event.preventDefault();
            select(matches[0].slug);
          }
          if (event.key === "Escape") {
            setOpen(false);
            setQuery("");
          }
        }}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        className="w-full rounded-lg border border-line bg-paper h-11 px-3 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
      />

      {open && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1.5 max-h-60 w-full overflow-y-auto rounded-lg border border-line bg-paper p-1.5 shadow-lg"
        >
          {matches.length === 0 ? (
            <p className="px-2.5 py-2 text-sm text-ink-soft">No categories match that.</p>
          ) : (
            matches.map((skill) => (
              <button
                key={skill.slug}
                type="button"
                role="option"
                aria-selected={skill.slug === value}
                onClick={() => select(skill.slug)}
                className={`block w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-paper-dim ${
                  skill.slug === value ? "font-semibold text-brass-dark" : "text-ink"
                }`}
              >
                {skill.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
