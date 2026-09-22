import Link from "next/link";
import { getCheckIns, getCrew, getGyms, getSessions, getTodayCheckins } from "@/lib/data";
import { Avatar } from "@/components/avatar";
import { Badge, EmptyState, SectionTitle } from "@/components/ui";
import { DailyPrompt } from "@/components/daily-prompt";
import { TodayBoard } from "@/components/today-board";
import { NextSessionCard } from "@/components/next-session-card";
import GroupGate from "@/components/group-gate";
import { todayHU } from "@/lib/date";
import { dayStatus, pickSessions, votesWithDaily } from "@/lib/today";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ma · GymCrew" };

export default async function DashboardPage() {
  const crew = await getCrew();

  if (!crew.group) {
    const gyms = await getGyms();
    return <GroupGate gyms={gyms} email={crew.email} />;
  }

  const group = crew.group;
  const [{ sessions, votes }, todayCheckins, checkIns, gyms] = await Promise.all([
    getSessions(group.id),
    getTodayCheckins(group.id),
    getCheckIns(crew.members.map((m) => m.id), 30),
    getGyms(),
  ]);

  const { today, next } = pickSessions(sessions);
  const memberIds = crew.members.map((m) => m.id);
  const status = (id: string) => dayStatus(id, today, votes, todayCheckins);

  // A napi kérdés CSAK akkor jön elő, ha valaki más már jelezte, hogy ma megy,
  // és én még semmit nem mondtam mára.
  const othersGoing = crew.members.filter(
    (m) => m.id !== crew.userId && status(m.id).state === "yes"
  );
  const shouldAsk = status(crew.userId).state === "none" && othersGoing.length > 0;

  const cardMembers = crew.members.map((m) => ({
    id: m.id,
    name: m.display_name,
    avatar: m.avatar_url,
  }));
  // Egy időpont más teremben is lehet, mint a csapaté.
  const gymOf = (gymId: string | null) => gyms.find((g) => g.id === gymId) ?? group.gym;

  const myMonth = checkIns.filter(
    (c) => c.user_id === crew.userId && new Date(c.arrived_at) > new Date(Date.now() - 30 * 86_400_000)
  ).length;

  return (
    <div className="space-y-7">
      <DailyPrompt
        open={shouldAsk}
        goingNames={othersGoing.map((m) => m.display_name)}
        members={crew.members
          .filter((m) => m.id !== crew.userId)
          .map((m) => ({
            id: m.id,
            name: m.display_name,
            avatar: m.avatar_url,
            going: status(m.id).state === "yes",
          }))}
        todaySession={
          today ? { startsAt: today.starts_at, gymName: gymOf(today.gym_id)?.name ?? null } : null
        }
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
        <SectionTitle>{today ? "Mai edzés" : "Ma mész?"}</SectionTitle>
        {today ? (
          <NextSessionCard
            session={today}
            gym={gymOf(today.gym_id)}
            members={cardMembers}
            votes={votesWithDaily(today, memberIds, votes, todayCheckins)}
            me={crew.userId}
            arrived={checkIns.filter((c) => c.session_id === today.id).map((c) => c.user_id)}
          />
        ) : (
          <TodayBoard me={crew.userId} members={cardMembers} checkins={todayCheckins} />
        )}
      </section>

      <section>
        <SectionTitle
          action={
            <Link href="/app/plan" className="text-xs font-semibold text-accent">
              Összes terv →
            </Link>
          }
        >
          {today ? "Utána" : "Következő edzés"}
        </SectionTitle>

        {next ? (
          <NextSessionCard
            session={next}
            gym={gymOf(next.gym_id)}
            members={cardMembers}
            votes={votes.filter((v) => v.session_id === next.id)}
            me={crew.userId}
            arrived={checkIns.filter((c) => c.session_id === next.id).map((c) => c.user_id)}
          />
        ) : (
          <EmptyState
            title={today ? "Nincs más betervezve" : "Nincs betervezve edzés"}
            body="Javasolj egy időpontot a következő napokra, a többiek meg szavaznak rá."
          >
            <Link href="/app/plan" className="btn btn-ghost">
              Időpontot javaslok
            </Link>
          </EmptyState>
        )}
      </section>

      {crew.members.length === 1 && (
        <section>
          <SectionTitle>Egyedül vagy a csapatban</SectionTitle>
          <div className="card flex items-center gap-4 p-5">
            <Avatar url={crew.profile.avatar_url} name={crew.profile.display_name} size={44} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Hívd meg a többieket</p>
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
