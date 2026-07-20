export default function LoadingState({
  label = "Loading…",
}: {
  label?: string;
}) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-paper px-6 py-16 text-center"
    >
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brass" />
      <p className="text-sm text-ink-soft">{label}</p>
    </div>
  );
}
