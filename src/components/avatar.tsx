"use client";

/** Kerek profilkép; ha nincs kép, a név kezdőbetűje látszik. */
export function Avatar({
  url,
  name,
  size = 40,
  ring,
}: {
  url: string | null | undefined;
  name: string;
  size?: number;
  ring?: string;
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 font-semibold text-muted"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, size * 0.38),
        boxShadow: ring ? `0 0 0 2px ${ring}` : undefined,
      }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} width={size} height={size} className="h-full w-full object-cover" />
      ) : (
        initials || "?"
      )}
    </span>
  );
}
