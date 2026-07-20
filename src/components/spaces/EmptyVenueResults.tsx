import EmptyState from "@/components/ui/EmptyState";

export default function EmptyVenueResults({
  onIncreaseRadius,
  onClearFilters,
  canIncreaseRadius,
}: {
  onIncreaseRadius: () => void;
  onClearFilters: () => void;
  canIncreaseRadius: boolean;
}) {
  return (
    <EmptyState
      title="No spaces match your search"
      description="Try widening your search radius or clearing a few filters to see more spaces."
      action={
        <div className="flex flex-col gap-2 sm:flex-row">
          {canIncreaseRadius && (
            <button
              type="button"
              onClick={onIncreaseRadius}
              className="rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
            >
              Increase radius
            </button>
          )}
          <button
            type="button"
            onClick={onClearFilters}
            className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
          >
            Clear all filters
          </button>
        </div>
      }
    />
  );
}
