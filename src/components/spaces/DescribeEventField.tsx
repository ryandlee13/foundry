"use client";

import { useId, useState } from "react";
import { EVENT_TYPE_LABELS } from "@/lib/spaces/labels";
import type { EventType } from "@/lib/types/spaces";

const EVENT_TYPE_OPTIONS = Object.entries(EVENT_TYPE_LABELS) as [EventType, string][];

/**
 * Text field styled like a freeform "describe your event" input, but backed
 * today by the fixed EventType list — click in to see suggestions, pick one
 * or more. The typed query filters the suggestion list. Once AI-assisted
 * matching exists, this same input can parse freeform paragraphs; the
 * dropdown-of-options behavior here is the interim step.
 */
export default function DescribeEventField({
  selected,
  onChange,
}: {
  selected: EventType[];
  onChange: (next: EventType[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const listboxId = useId();

  const filteredOptions = EVENT_TYPE_OPTIONS.filter(([, label]) =>
    label.toLowerCase().includes(query.trim().toLowerCase())
  );

  function toggleOption(value: EventType) {
    const next = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    onChange(next);
    setQuery("");
  }

  return (
    <div className="relative">
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleOption(value)}
              className="flex items-center gap-1 rounded-full bg-wine/10 px-2.5 py-1 text-xs font-medium text-wine transition-colors hover:bg-wine/20"
            >
              {EVENT_TYPE_LABELS[value]}
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          ))}
        </div>
      )}

      <input
        type="text"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder="e.g. birthday party, brand launch, wedding…"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={listboxId}
        className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
      />

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-20 mt-1.5 max-h-56 w-full overflow-y-auto rounded-lg border border-line bg-paper shadow-lg"
        >
          {filteredOptions.length === 0 ? (
            <li className="px-3.5 py-2.5 text-sm text-ink-soft">No matches yet — try a different word.</li>
          ) : (
            filteredOptions.map(([value, label]) => (
              <li key={value} role="option" aria-selected={selected.includes(value)}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => toggleOption(value)}
                  className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm hover:bg-paper-dim ${
                    selected.includes(value) ? "font-medium text-wine" : "text-ink"
                  }`}
                >
                  {label}
                  {selected.includes(value) && (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      <p className="mt-2 text-xs text-ink-soft">
        Pick from the list for now — soon you&apos;ll be able to describe your event in your own words.
      </p>
    </div>
  );
}
