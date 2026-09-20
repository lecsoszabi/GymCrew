import Link from "next/link";
import {
  getCheckIns,
  getCrew,
  getGyms,
  getSessions,
  getTodayCheckins,
  nextSession,
} from "@/lib/data";
import { Avatar } from "@/components/avatar";
import { Badge, EmptyState, SectionTitle } from "@/components/ui";
import { DailyPrompt } from "@/components/daily-prompt";
import { TodayBoard } from "@/components/today-board";
import { NextSessionCard } from "@/components/next-session-card";
import GroupGate from "@/components/group-gate";
import { todayHU } from "@/lib/date";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ma · GymCrew" };

export default async function DashboardPage() {
  const crew = await getCrew();

  if (!crew.group) {
    const gyms = await getGyms();
    return <GroupGate gyms={gyms} email={crew.email} />;
  }

  const [{ sessions, votes }, todayCheckins, checkIns] = await Promise.all([
    getSessions(crew.group.id),
    getTodayCheckins(crew.group.id),
    getCheckIns(crew.members.map((m) => m.id), 30),
  ]);

  const upcoming = nextSession(sessions);
  const myCheckin = todayCheckins.find((c) => c.user_id === crew.userId) ?? null;
  const othersGoing = todayCheckins.filter((c) => c.user_id !== crew.userId && c.going);

  // A napi kérdés CSAK akkor jön elő, ha valaki más már jelezte ma, hogy megy,
  // és én még nem válaszoltam.
  const shouldAsk = !myCheckin && othersGoing.length > 0;

  const askAbout = crew.members.filter((m) => m.id !== crew.userId);
  const goingNames = othersGoing
    .map((c) => crew.members.find((m) => m.id === c.user_id)?.display_name)
    .filter(Boolean) as string[];

  const myMonth = checkIns.filter(
    (c) => c.user_id === crew.userId && new Date(c.arrived_at) > new Date(Date.now() - 30 * 86_400_000)
  ).length;

  return (
    <div className="space-y-7">
      <DailyPrompt
        open={shouldAsk}
        goingNames={goingNames}
        members={askAbout.map((m) => ({
          id: m.id,
          name: m.display_name,
          avatar: m.avatar_url,
          going: othersGoing.some((c) => c.user_id === m.id),
        }))}
      />

      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          {new Intl.DateTimeFormat("hu-HU", {
            timeZone: "Europe/Budapest",
            weekday: "long",
            month: "long",
            day: "numeric",
          }).format(new Date(`${todayHU()}T12:00:00`))}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          Szia, {crew.profile.display_name.split(" ")[0]}!
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          {crew.group.name} · {crew.group.gym?.name ?? "nincs terem kiválasztva"}
          {" · "}
          <span className="text-accent">{myMonth} edzés</span> az elmúlt 30 napban
        </p>
      </header>

      <section>
        <SectionTitle
          action={
            <Link href="/app/plan" className="text-xs font-semibold text-accent">
              Összes terv →
            </Link>
          }
        >
          Következő edzés
        </SectionTitle>

        {upcoming ? (
          <NextSessionCard
            session={upcoming}
            gym={crew.group.gym}
            members={crew.members.map((m) => ({
              id: m.id,
              name: m.display_name,
              avatar: m.avatar_url,
            }))}
            votes={votes.filter((v) => v.session_id === upcoming.id)}
            me={crew.userId}
            arrived={checkIns
              .filter((c) => c.session_id === upcoming.id)
              .map((c) => c.user_id)}
          />
        ) : (
          <EmptyState
            title="Nincs betervezve edzés"
            body="Javasolj egy időpontot, a többiek meg szavaznak rá."
          >
            <Link href="/app/plan" className="btn btn-primary">
              Időpontot javaslok
            </Link>
          </EmptyState>
        )}
      </section>

      <section>
        <SectionTitle>Mai állás</SectionTitle>
        <TodayBoard
          me={crew.userId}
          members={crew.members.map((m) => ({
            id: m.id,
            name: m.display_name,
            avatar: m.avatar_url,
          }))}
          checkins={todayCheckins}
        />
      </section>

      {crew.members.length === 1 && (
        <section>
          <SectionTitle>Egyedül vagy a csapatban</SectionTitle>
          <div className="card flex items-center gap-4 p-5">
            <Avatar url={crew.profile.avatar_url} name={crew.profile.display_name} size={44} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Hívd meg Kristófot és a többieket</p>
              <p className="mt-0.5 text-xs text-muted">
                Meghívókód: <span className="font-mono text-accent">{crew.group.invite_code}</span>
              </p>
            </div>
            <Link href="/app/group" className="btn btn-ghost shrink-0 px-3 text-xs">
              Meghívás
            </Link>
          </div>
        </section>
      )}

      {crew.group.gym && (
        <section>
          <SectionTitle>A csapat terme</SectionTitle>
          <Link href="/app/group" className="card block p-5 transition hover:border-accent-dim">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{crew.group.gym.name}</p>
                {crew.group.gym.address && (
                  <p className="mt-0.5 text-sm text-muted">{crew.group.gym.address}, Szeged</p>
                )}
              </div>
              <Badge tone={crew.isOwner ? "accent" : "muted"}>
                {crew.isOwner ? "Te válthatsz" : "Főnök válthat"}
              </Badge>
            </div>
          </Link>
        </section>
      )}
    </div>
  );
}
