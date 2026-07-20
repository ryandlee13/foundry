import type { ReactNode } from "react";

/**
 * Stands in for venue photography. The project uses styled gradients instead
 * of remote stock photos so no fictional venue is ever shown with a real
 * place's photo, and there's zero risk of a broken image link.
 */
export default function VenueImagePlaceholder({
  accent,
  icon,
  imageCount,
  currentIndex = 1,
  className = "",
  children,
}: {
  accent: [string, string];
  icon: string;
  imageCount: number;
  currentIndex?: number;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(150deg, ${accent[0]}, ${accent[1]})`,
      }}
    >
      <span className="text-5xl opacity-90 drop-shadow-sm" aria-hidden>
        {icon}
      </span>

      {imageCount > 1 && (
        <span className="absolute bottom-3 right-3 rounded-full bg-ink/55 px-2.5 py-1 text-[11px] font-semibold text-paper backdrop-blur-sm">
          {currentIndex} / {imageCount}
        </span>
      )}

      {children}
    </div>
  );
}
