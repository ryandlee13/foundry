import type { ReactNode } from "react";

/**
 * Stands in for venue photography on the seed venues (styled gradients, so
 * no fictional listing is ever shown with a real place's photo, and there's
 * zero risk of a broken image link). When a real uploaded `photoUrl` is
 * passed — i.e. a user-submitted venue — that renders instead.
 */
export default function VenueImagePlaceholder({
  accent,
  icon,
  imageCount,
  currentIndex = 1,
  photoUrl,
  className = "",
  children,
}: {
  accent: [string, string];
  icon: string;
  imageCount: number;
  currentIndex?: number;
  photoUrl?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={photoUrl ? undefined : { background: `linear-gradient(150deg, ${accent[0]}, ${accent[1]})` }}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- local data URLs, not a remote image domain
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-5xl opacity-90 drop-shadow-sm" aria-hidden>
          {icon}
        </span>
      )}

      {imageCount > 1 && (
        <span className="absolute bottom-3 right-3 rounded-full bg-ink/55 px-2.5 py-1 text-[11px] font-semibold text-paper backdrop-blur-sm">
          {currentIndex} / {imageCount}
        </span>
      )}

      {children}
    </div>
  );
}
