import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-28 text-center sm:px-6">
      <span className="font-display text-sm font-semibold uppercase tracking-widest text-brass-dark">
        404
      </span>
      <h1 className="mt-3 font-display text-3xl font-semibold text-ink">
        This page didn&apos;t make the guest list.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-wine px-6 py-3 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
      >
        Back to the homepage
      </Link>
    </div>
  );
}
