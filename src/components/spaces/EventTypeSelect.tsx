"use client";

import { useEffect, useRef, useState } from "react";
import { getEventTypeLabel, searchEventTypes } from "@/lib/spaces/eventTypes";
import type { EventType } from "@/lib/types/spaces";

/**
 * Single-select type-ahead over the event-type catalog, alphabetical.
 * A plain <select> made the reader scan an arbitrary slug-defined order;
 * typing narrows instead. Clearing the field clears the selection, so
 * "any event type" stays reachable without a magic empty option.
 */
export default function EventTypeSelect({
  value,
  onChange,
  id,
  placeholder = "Any event type",
}: {
  value: EventType | null;
  onChange: (value: EventType | null) => void;
  id?: string;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const matches = searchEventTypes(query);
  // While the menu is open the field shows what's being typed; closed, it
  // shows the current selection.
  const displayValue = open ? query : getEventTypeLabel(value);

  function select(next: EventType | null) {
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
          // Typing over a selection clears it until something new is picked.
          if (value) onChange(null);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && matches.length > 0) {
            event.preventDefault();
            select(matches[0].value);
          }
          if (event.key === "Escape") {
            setOpen(false);
            setQuery("");
          }
        }}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-controls="event-type-options"
        aria-autocomplete="list"
        className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
      />

      {open && (
        <div
          id="event-type-options"
          role="listbox"
          className="absolute z-20 mt-1.5 max-h-60 w-full overflow-y-auto rounded-lg border border-line bg-paper p-1.5 shadow-lg"
        >
          {matches.length === 0 ? (
            <p className="px-2.5 py-2 text-sm text-ink-soft">No event types match that.</p>
          ) : (
            matches.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => select(option.value)}
                className={`block w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-paper-dim ${
                  option.value === value ? "font-semibold text-brass-dark" : "text-ink"
                }`}
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
