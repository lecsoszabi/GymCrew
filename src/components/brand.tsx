import Link from "next/link";
import type { ReactNode } from "react";
import { BADGE_SHIFT, BAR, BARE_VIEWBOX, CITY, HALF, LIME, TILE, TILE_BORDER, TILE_RADIUS } from "@/lib/brand-shape";

/** A súlyzó elemei a 512-es rácson (a rajz: src/lib/brand-shape.ts). */
function Shapes({ detail, cutColor }: { detail: boolean; cutColor: string }) {
  const half = HALF.filter((s) => detail || !s.detail).map((s, i) =>
    s.kind === "rect" ? (
      <rect
        key={i}
        x={s.x}
        y={s.y}
        width={s.width}
        height={s.height}
        rx={s.rx}
        fill={s.cut ? cutColor : undefined}
      />
    ) : (
      <path key={i} d={s.d} fill={s.cut ? cutColor : undefined} />
    )
  );
  return (
    <g fill={LIME}>
      {half}
      <g transform="translate(512 0) scale(-1 1)">{half}</g>
      <rect x={BAR.x} y={BAR.y} width={BAR.width} height={BAR.height} />
    </g>
  );
}

/** A súlyzó magában, átlátszó háttéren, a fejlécbe és az oldalsávba. */
export function DumbbellDom({ className }: { className?: string }) {
  return (
    <svg viewBox={BARE_VIEWBOX} className={className} aria-hidden>
      <Shapes detail={false} cutColor={TILE} />
    </svg>
  );
}

/** A csempe: súlyzó, alatta a SZEGED felirat. Ugyanez a levelek logója is. */
export function BrandBadge({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden data-brand="badge">
      <rect x="3" y="3" width="506" height="506" rx={TILE_RADIUS} fill={TILE} stroke={TILE_BORDER} strokeWidth="6" />
      <g transform={`translate(0 ${BADGE_SHIFT})`}>
        <Shapes detail cutColor={TILE} />
      </g>
      <text
        x={CITY.x}
        y={CITY.y}
        textAnchor="middle"
        fontSize={CITY.size}
        fontWeight={CITY.weight}
        letterSpacing={CITY.letterSpacing}
        fill={LIME}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {CITY.text}
      </text>
    </svg>
  );
}

/** Kis logó a fejlécekbe: súlyzó + név. */
export function BrandMark({ size = "sm" }: { size?: "sm" | "md" }) {
  return (
    <span className="flex items-center gap-2" data-brand="mark">
      <DumbbellDom className={size === "md" ? "h-7 w-8" : "h-6 w-7"} />
      <span className="font-display text-lg font-bold leading-none tracking-wide">GymCrew</span>
    </span>
  );
}

/**
 * A belépés körüli oldalak (login, új jelszó, adatfelvétel) közös kerete:
 * fekete háttér, halvány fénykör, a csempe és a név, alatta a tartalom.
 */
export function AuthShell({
  children,
  subtitle,
  wide = false,
  top = false,
}: {
  children: ReactNode;
  subtitle?: ReactNode;
  /** Hosszú űrlaphoz szélesebb oszlop. */
  wide?: boolean;
  /** Felülre igazítva, ha a tartalom magasabb a képernyőnél. */
  top?: boolean;
}) {
  return (
    <main
      className={`relative flex min-h-dvh flex-col items-center overflow-hidden bg-black px-5 py-12 ${
        top ? "" : "justify-center"
      }`}
    >
      <div className={`relative w-full ${wide ? "max-w-lg" : "max-w-sm"}`}>
        <div className="relative mb-8 text-center">
          {/* Halvány fénykör, a logó közepéhez kötve: gépen a tartalom függőlegesen
              középre kerül, így az oldal tetejéhez rögzítve elcsúszna a logótól. */}
          <div
            aria-hidden
            data-brand="glow"
            className="pointer-events-none absolute left-1/2 top-14 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-3xl"
            style={{ background: `radial-gradient(circle, ${LIME} 0%, transparent 65%)` }}
          />
          <div className="relative">
            <BrandBadge className="mx-auto h-28 w-28" />
            <h1 className="mt-4 text-2xl font-bold tracking-tight">
              GymCrew<span className="sr-only"> Szeged</span>
            </h1>
            {subtitle && (
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">{subtitle}</p>
            )}
          </div>
        </div>
        {children}
        <nav aria-label="Jogi dokumentumok" className="mt-8 flex justify-center gap-6 text-xs">
          <Link href="/feltetelek" className="tap font-semibold text-muted hover:text-fg">
            Felhasználási feltételek
          </Link>
          <Link href="/adatvedelem" className="tap font-semibold text-muted hover:text-fg">
            Adatkezelés
          </Link>
        </nav>
      </div>
    </main>
  );
}
