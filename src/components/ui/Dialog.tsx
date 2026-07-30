"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal/drawer primitive: portals to <body>, traps focus, closes
 * on Escape or backdrop click, and restores focus to the trigger on close.
 * Shared by LocationMapModal (centered) and MobileFilterDrawer (side sheet).
 */
export default function Dialog({
  open,
  onClose,
  children,
  labelledBy,
  align = "center",
  panelClassName = "",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy: string;
  align?: "center" | "right";
  panelClassName?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;

    triggerRef.current = document.activeElement;
    const panel = panelRef.current;
    const focusable = panel?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    (focusable?.[0] ?? panel)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panel) return;

      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null
      );
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        className="absolute inset-0 h-full w-full cursor-default bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`absolute inset-0 flex p-4 ${
          align === "right" ? "justify-end" : "items-center justify-center"
        }`}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          tabIndex={-1}
          className={`relative max-h-full overflow-y-auto rounded-2xl bg-paper shadow-2xl outline-none ${panelClassName}`}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
