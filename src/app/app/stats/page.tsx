import Link from "next/link";
import { getCheckIns, getCrew, getGyms, getSessions } from "@/lib/data";
import { Avatar } from "@/components/avatar";
import { Badge, EmptyState, SectionTitle } from "@/components/ui";
import GroupGate from "@/components/group-gate";
import { memberStats, weeklySeries } from "@/lib/stats";
import { WEEKDAYS_SHORT, formatWhen, formatDate } from "@/lib/date";

export const dynamic = "force-dynamic";
export const metadata = { title: "Statok · GymCrew" };

export default async function StatsPage() {
  const crew = await getCrew();
  const gyms = await getGyms();

  if (!crew.group) return <GroupGate gyms={gyms} email={crew.email} />;

  const memberIds = crew.members.map((m) => m.id);
  const [checkIns, { sessions, votes }] = await Promise.all([
    getCheckIns(memberIds, 365),
    getSessions(crew.group.id),
  ]);

  const stats = memberIds.map((id) => memberStats(checkIns, id));
  const bars = weeklySeries(checkIns, memberIds, 8);
  const maxBar = Math.max(1, ...bars.map((b) => b.total));

  const ranking = [...stats].sort((a, b) => b.last30 - a.last30 || b.total - a.total);
  const mine = stats.find((s) => s.userId === crew.userId)!;
  const nameOf = (id: string) =>
    crew.members.find((m) => m.id === id)?.display_name ?? "Ismeretlen";

  const upcoming = sessions
    .filter((s) => new Date(s.starts_at).getTime() > Date.now() && s.status !== "cancelled")
    .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))
    .slice(0, 5);

  const history = checkIns.slice(0, 12);
  const totalGroup = checkIns.length;

  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Statok</h1>
        <p className="mt-1 text-sm text-muted">
          {crew.group.name} · összesen {totalGroup} edzés az elmúlt évben
        </p>
      </header>

      {/* --- Saját számok ------------------------------------------- */}
      <section>
        <SectionTitle>Te</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="30 napban" value={mine.last30} suffix="edzés" highlight />
          <Stat label="Sorozat" value={mine.streakWeeks} suffix="hét" />
          <Stat label="Összesen" value={mine.total} suffix="alkalom" />
          <Stat
            label="Kedvenc idő"
            value={mine.favoriteHour ?? "–"}
            suffix={mine.favoriteHour != null ? "óra" : ""}
          />
        </div>
        {mine.lastVisit && (
          <p className="mt-3 text-xs text-muted">
            Utoljára: {formatDate(mine.lastVisit)} · {formatWhen(mine.lastVisit).split(" ").pop()}
          </p>
        )}
      </section>

      {/* --- Heti oszlopok ------------------------------------------- */}
      <section>
        <SectionTitle>Elmúlt 8 hét</SectionTitle>
        <div className="card p-5">
          {totalGroup === 0 ? (
            <p className="py-4 text-center text-sm text-muted">
              Még nincs rögzített edzés. Az első beérkezés után itt megjelennek az oszlopok.
            </p>
          ) : (
            <>
              <div className="flex h-36 items-end justify-between gap-2">
                {bars.map((b) => (
                  <div key={b.start} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <div className="flex w-full flex-1 items-end justify-center">
                      <div
                        className="w-full max-w-9 rounded-t-ui bg-accent transition-all"
                        style={{
                          height: `${Math.max(3, (b.total / maxBar) * 100)}%`,
                          opacity: b.total === 0 ? 0.18 : 1,
                        }}
                        title={`${b.total} edzés`}
                      />
                    </div>
                    <span className="truncate text-[10px] text-muted">{b.label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-center text-xs text-muted">
                Csapatszintű edzésszám hetente
              </p>
            </>
          )}
        </div>
      </section>

      {/* --- Ranglista ----------------------------------------------- */}
      <section>
        <SectionTitle>Ranglista (30 nap)</SectionTitle>
        <div className="card divide-y divide-line">
          {ranking.map((s, i) => (
            <div key={s.userId} className="flex items-center gap-3 p-4">
              <span
                className={`w-5 shrink-0 text-center text-sm font-bold ${
                  i === 0 ? "text-accent" : "text-muted"
                }`}
              >
                {i + 1}
              </span>
              <Avatar
                url={crew.members.find((m) => m.id === s.userId)?.avatar_url ?? null}
                name={nameOf(s.userId)}
                size={38}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {nameOf(s.userId)}
                  {s.userId === crew.userId && (
                    <span className="ml-1.5 text-xs font-normal text-muted">(te)</span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {s.lastVisit ? `Utoljára ${formatDate(s.lastVisit)}` : "Még nem volt"}
                  {s.streakWeeks > 1 && ` · ${s.streakWeeks} hetes sorozat`}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-lg font-bold leading-none">{s.last30}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-muted">edzés</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- Mikor járunk --------------------------------------------- */}
      <section>
        <SectionTitle>Melyik napokon jártok?</SectionTitle>
        <div className="card space-y-3 p-5">
          {stats.map((s) => {
            const max = Math.max(1, ...s.weekdayCounts);
            return (
              <div key={s.userId} className="flex items-center gap-3">
                <span className="w-20 shrink-0 truncate text-xs font-semibold">
                  {nameOf(s.userId)}
                </span>
                <div className="flex flex-1 gap-1">
                  {s.weekdayCounts.map((n, d) => (
                    <div key={d} className="flex-1 text-center">
                      <div
                        className="mx-auto h-8 w-full rounded-ui"
                        style={{
                          background: n === 0 ? "#1b1e24" : "#c8ff4d",
                          opacity: n === 0 ? 1 : 0.28 + 0.72 * (n / max),
                        }}
                        title={`${WEEKDAYS_SHORT[d]}: ${n}`}
                      />
                      <span className="mt-1 block text-[9px] text-muted">{WEEKDAYS_SHORT[d]}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* --- Mikor megyünk -------------------------------------------- */}
      <section>
        <SectionTitle
          action={
            <Link href="/app/plan" className="tap text-xs font-semibold text-accent">
              Tervezés →
            </Link>
          }
        >
          Mikor megyünk legközelebb
        </SectionTitle>
        {upcoming.length > 0 ? (
          <div className="card divide-y divide-line">
            {upcoming.map((s) => {
              const yes = votes.filter((v) => v.session_id === s.id && v.vote === "yes");
              return (
                <div key={s.id} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{formatWhen(s.starts_at)}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {yes.length > 0
                        ? yes.map((v) => nameOf(v.user_id)).join(", ")
                        : "még senki nem mondott igent"}
                    </p>
                  </div>
                  <Badge tone={s.status === "confirmed" ? "yes" : "maybe"}>
                    {s.status === "confirmed" ? "Fix" : `${yes.length}/${crew.members.length}`}
                  </Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title="Nincs betervezve edzés" body="A tervezés fülön javasolhatsz időpontot." />
        )}
      </section>

      {/* --- Előzmények ----------------------------------------------- */}
      {history.length > 0 && (
        <section className="pb-4">
          <SectionTitle>Utolsó beérkezések</SectionTitle>
          <div className="card divide-y divide-line">
            {history.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar
                  url={crew.members.find((m) => m.id === c.user_id)?.avatar_url ?? null}
                  name={nameOf(c.user_id)}
                  size={30}
                />
                <p className="min-w-0 flex-1 truncate text-sm">{nameOf(c.user_id)}</p>
                <p className="shrink-0 text-xs text-muted">{formatWhen(c.arrived_at)}</p>
                {c.source === "auto" && <Badge tone="accent">Auto</Badge>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
  highlight,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`card p-4 ${highlight ? "border-accent/35 bg-accent/5" : ""}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1.5 font-display text-3xl font-bold leading-none tabular-nums ${highlight ? "text-accent" : ""}`}>
        {value}
      </p>
      {suffix && <p className="mt-1 text-[11px] text-muted">{suffix}</p>}
    </div>
  );
}
