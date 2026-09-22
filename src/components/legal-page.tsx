import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand";
import { LEGAL_EFFECTIVE } from "@/lib/legal";

/**
 * A jogi oldalak közös kerete: olvasható hosszúságú sorok, a fejlécben a logó,
 * alul a két dokumentum egymásra hivatkozik. Bejelentkezés nélkül is elérhető.
 */
export function LegalPage({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
          <Link href="/" className="-my-2.5 flex items-center py-2.5">
            <BrandMark />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 pb-20 pt-8">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-xs text-muted">Hatályos: {LEGAL_EFFECTIVE}</p>
        <div className="mt-5 text-sm leading-relaxed text-muted">{intro}</div>
        <div className="mt-8 space-y-9">{children}</div>

        <nav aria-label="Jogi dokumentumok" className="mt-14 flex flex-wrap gap-x-6 gap-y-6 border-t border-line pt-6 text-sm">
          <Link href="/feltetelek" className="tap font-semibold text-accent">
            Felhasználási feltételek
          </Link>
          <Link href="/adatvedelem" className="tap font-semibold text-accent">
            Adatkezelési tájékoztató
          </Link>
          <Link href="/app" className="tap font-semibold text-muted hover:text-fg">
            Vissza az appba
          </Link>
        </nav>
      </main>
    </div>
  );
}

/** Egy fejezet számozott címmel. */
export function Section({ id, n, title, children }: { id?: string; n: number; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="text-base font-bold tracking-tight">
        <span className="text-accent">{n}.</span> {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted [&_strong]:font-semibold [&_strong]:text-fg">
        {children}
      </div>
    </section>
  );
}

/** Adatkezelési tétel kártyán: mit, miért, milyen jogalapon, meddig (telefonon is olvasható, nem táblázat). */
export function DataItem({
  title,
  what,
  why,
  basis,
  until,
}: {
  title: string;
  what: ReactNode;
  why: ReactNode;
  basis: ReactNode;
  until: ReactNode;
}) {
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      <dl className="mt-2.5 space-y-2 text-sm">
        {[
          ["Adatok", what],
          ["Cél", why],
          ["Jogalap", basis],
          ["Meddig", until],
        ].map(([k, v]) => (
          <div key={k as string} className="grid grid-cols-[5.5rem_1fr] gap-2">
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{k}</dt>
            <dd className="text-muted">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
