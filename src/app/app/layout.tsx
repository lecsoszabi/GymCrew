import Link from "next/link";
import { getCrew } from "@/lib/data";
import { Avatar } from "@/components/avatar";
import { NavBar } from "@/components/nav-bar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const crew = await getCrew();

  return (
    <div className="min-h-dvh md:flex">
      {/* Desktop oldalsáv */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface/40 p-4 md:flex">
        <Link href="/app" className="mb-7 flex items-center gap-2.5 px-2 pt-2">
          <svg viewBox="0 0 512 512" className="h-7 w-7" aria-hidden>
            <g stroke="#c8ff4d" strokeWidth="38" strokeLinecap="round" fill="none">
              <path d="M148 256h216" />
              <path d="M120 200v112M92 222v68" />
              <path d="M392 200v112M420 222v68" />
            </g>
          </svg>
          <span className="text-sm font-bold tracking-tight">GymCrew</span>
        </Link>

        <NavBar variant="side" />

        <Link
          href="/app/profile"
          className="mt-auto flex items-center gap-3 rounded-xl border border-line bg-surface p-3 transition hover:border-accent-dim"
        >
          <Avatar url={crew.profile.avatar_url} name={crew.profile.display_name} size={36} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">
              {crew.profile.display_name}
            </span>
            <span className="block truncate text-xs text-muted">
              {crew.group?.name ?? "Nincs csoport"}
            </span>
          </span>
        </Link>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Mobil fejléc */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-ink/85 px-4 py-3 backdrop-blur-md md:hidden">
          <Link href="/app" className="flex items-center gap-2">
            <svg viewBox="0 0 512 512" className="h-6 w-6" aria-hidden>
              <g stroke="#c8ff4d" strokeWidth="40" strokeLinecap="round" fill="none">
                <path d="M148 256h216" />
                <path d="M120 200v112M92 222v68" />
                <path d="M392 200v112M420 222v68" />
              </g>
            </svg>
            <span className="text-sm font-bold tracking-tight">GymCrew</span>
          </Link>
          <Link href="/app/profile" aria-label="Profil">
            <Avatar url={crew.profile.avatar_url} name={crew.profile.display_name} size={32} />
          </Link>
        </header>

        <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-5 md:px-8 md:pb-12 md:pt-8">
          {children}
        </main>
      </div>

      {/* Mobil alsó tab-bar */}
      <NavBar variant="bottom" />
    </div>
  );
}
