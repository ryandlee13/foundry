import Link from "next/link";

export default function ComingSoon({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-28 text-center sm:px-6">
      <span className="text-xs font-semibold uppercase tracking-widest text-brass-dark">
        {eyebrow}
      </span>
      <h1 className="mt-3 font-display text-3xl font-semibold text-ink sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{description}</p>
      <Link
        href="/spaces"
        className="mt-8 rounded-full bg-wine px-6 py-3 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
      >
        Browse spaces in the meantime
      </Link>
    </div>
  );
}
